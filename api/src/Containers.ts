import { WebSocketClient } from "raraph84-lib";
import EventEmitter from "events";
import Servers from "./Servers";
import Node from "./Node";

const config = require("../config.json");

export abstract class Container extends EventEmitter {
    servers;
    name;
    node;

    state: "stopped" | "starting" | "started" | "stopping" = "stopped";
    gatewayClient: WebSocketClient | null = null;
    players: Player[] = [];

    constructor(servers: Servers, name: string, node: Node) {
        super();

        this.servers = servers;
        this.name = name;
        this.node = node;
    }

    _setState(state: "stopped" | "starting" | "started" | "stopping") {
        this.state = state;
        this.emit(state);
        this.servers.saveState();
        this.servers.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("SERVER_STATE", { name: this.name, state: state }));
    }

    playerJoin(uuid: string, username: string) {
        if (this.players.some((player) => player.uuid === uuid)) throw new Error("This player is already connected");
        this.players.push({ uuid, username });

        this.emit("playerJoin", { uuid, username });
        console.log("Player " + username + " connected to " + this.name + ".");
    }

    playerQuit(uuid: string) {
        const player = this.players.find((player) => player.uuid === uuid);

        if (!player) throw new Error("This player is already disconnected");
        this.players.splice(this.players.indexOf(player), 1);

        this.emit("playerQuit", player);
        console.log("Player " + player.username + " disconnected from " + this.name + ".");
    }

    gatewayConnected(client: WebSocketClient) {
        if (this.gatewayClient) this.gatewayClient.close("Another client is already connected");
        this.gatewayClient = client;
        this.emit("gatewayConnected");
        this.servers.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("SERVER_GATEWAY_CONNECTED", { name: this.name }));
        console.log("Container " + this.name + " connected to the gateway.");
    }

    gatewayDisconnected() {
        if (!this.gatewayClient) throw new Error("No client connected");
        while (this.players.length > 0) this.playerQuit(this.players[0].uuid);
        this.gatewayClient = null;
        this.emit("gatewayDisconnected");
        this.servers.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("SERVER_GATEWAY_DISCONNECTED", { name: this.name }));
        console.log("Container " + this.name + " disconnected from the gateway.");
    }

    toApiObj(logged: boolean) {
        return {
            name: this.name,
            node: this.node.name,
            state: this.state,
            gatewayConnected: !!this.gatewayClient,
            players: this.players.length
        };
    }
}

export class Proxy extends Container {
    constructor(servers: Servers, node: Node) {
        super(servers, "proxy-" + node.name, node);
    }

    playerJoin(uuid: string, username: string) {
        super.playerJoin(uuid, username);
        const playerCount = this.servers.proxies.reduce((count, proxy) => count + proxy.players.length, 0);
        this.servers.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("PLAYER_COUNT", { count: playerCount }));
    }

    playerQuit(uuid: string) {
        super.playerQuit(uuid);
        const playerCount = this.servers.proxies.reduce((count, proxy) => count + proxy.players.length, 0);
        this.servers.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("PLAYER_COUNT", { count: playerCount }));
    }
}

export abstract class Server extends Container {
    maxPlayers;
    port;

    state: "stopped" | "starting" | "started" | "stopping" = "stopped";
    gatewayClient: WebSocketClient | null = null;
    connectingPlayers: string[] = [];

    constructor(servers: Servers, name: string, node: Node, maxPlayers: number, port: number | null = null) {
        super(servers, name, node);

        if (!port) {
            port = config.serversStartingPort as number;
            while (servers.servers.some((server) => server.port === port)) port++;
        }

        this.maxPlayers = maxPlayers;
        this.port = port;
    }

    playerConnecting(uuid: string) {
        this.connectingPlayers.push(uuid);

        const listener = (player: Player) => {
            if (player.uuid !== uuid) return;
            this.off("playerJoin", listener);
            clearTimeout(timeout);
            this.connectingPlayers.splice(this.connectingPlayers.indexOf(uuid), 1);
        };

        const timeout = setTimeout(() => {
            this.off("playerJoin", listener);
            this.connectingPlayers.splice(this.connectingPlayers.indexOf(uuid), 1);
        }, 5 * 1000);

        this.on("playerJoin", listener);
    }

    toApiObj(logged: boolean) {
        return {
            ...super.toApiObj(logged),
            host: this.node.host,
            port: this.port,
            maxPlayers: this.maxPlayers
        };
    }
}

export class Lobby extends Server {
    id: number;

    constructor(servers: Servers, id: number, node: Node, port: number | null = null) {
        super(servers, "lobby" + id, node, config.lobbyMaxPlayers, port);
        this.id = id;
    }

    toApiObj(logged: boolean) {
        return { type: "lobby", id: this.id, ...super.toApiObj(logged) };
    }
}

export class Game extends Server {
    id: number;
    gameStarted: boolean;

    constructor(servers: Servers, id: number, node: Node, port: number | null = null) {
        super(servers, "game" + id, node, config.gamePlayers, port);

        this.id = id;
        this.gameStarted = false;

        this.on("playerJoin", () => {
            if (this.players.length !== config.gamePlayers) return;
            this.gameStarted = true;
            this.servers.saveState();
            console.log("Game", this.id, "started.");
        });

        this.on("playerQuit", async () => {
            if (!this.gameStarted || this.players.length !== 0) return;
            console.log("Game", this.id, "finished.");
        });
    }

    toApiObj(logged: boolean) {
        return { type: "game", id: this.id, ...super.toApiObj(logged), gameStarted: this.gameStarted };
    }
}

type Player = { uuid: string; username: string };
