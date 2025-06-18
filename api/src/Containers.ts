import { WebSocketClient } from "raraph84-lib";
import EventEmitter from "events";
import Servers from "./Servers";
import Node from "./Node";
import path from "path";

const config = require("../config.json");

export class Container extends EventEmitter {
    servers;
    name;
    path;
    port;

    state: "stopped" | "starting" | "started" | "stopping" = "stopped";
    players: Player[] = [];
    gatewayClient: WebSocketClient | null = null;

    _bindDockerEventHandler;

    constructor(servers: Servers, name: string, path: string, port: number) {
        super();

        this.servers = servers;
        this.name = name;
        this.path = path;
        this.port = port;

        this._bindDockerEventHandler = this._dockerEventHandler.bind(this);
    }

    _setState(state: "stopped" | "starting" | "started" | "stopping") {
        this.state = state;
        this.emit(state);
        this.servers.saveState();
        this.servers.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("SERVER_STATE", { name: this.name, state: state }));
    }

    async _dockerEventHandler(event: any) {
        if (event.Type !== "container" || event.Actor.Attributes.name !== this.name) return;

        if (event.Action === "start") this._postStart();
        else if (event.Action === "die") this._postStop();
    }

    async _preStart() {
        if (this.state !== "stopped") throw new Error("Not stopped");
        this._setState("starting");

        console.log("Starting container " + this.name + "...");

        while (true) {
            try {
                await this.servers.docker.getContainer(this.name).remove({ force: true });
            } catch (error: any) {
                if (error.statusCode === 404) break;
                else if (error.statusCode === 409) continue;
                else throw error;
            }
        }
    }

    async start(memory: number, file: string) {
        await this._preStart();

        this.servers.dockerEvents.on("rawEvent", this._bindDockerEventHandler);

        const container = await this.servers.docker.createContainer({
            name: this.name,
            ExposedPorts: { "25565/tcp": {} },
            Tty: true,
            OpenStdin: true,
            Cmd: ["java", "-Xmx" + memory * 1024 + "M", "-jar", file],
            Image: "openjdk:21",
            WorkingDir: "/home/server",
            HostConfig: {
                PortBindings: {
                    "25565/tcp": [{ HostIp: "", HostPort: this.port.toString() }]
                },
                Binds: [this.path + ":/home/server"],
                AutoRemove: true
            }
        });

        await container.start();
    }

    _postStart() {
        if (this.state !== "starting") throw new Error("Not starting");

        this._setState("started");
        console.log("Container " + this.name + " started.");
    }

    async stop(command: string) {
        if (this.state !== "started") throw new Error("Not started");
        this._setState("stopping");

        console.log("Stopping container " + this.name + "...");

        await this._send(command);

        const killTimeout = setTimeout(() => this.kill(), 30 * 1000);

        await new Promise((resolve) =>
            this.once("stopped", () => {
                clearTimeout(killTimeout);
                resolve(null);
            })
        );
    }

    _postStop() {
        if (this.state === "stopped") throw new Error("Already stopped");

        this.servers.dockerEvents.removeListener("rawEvent", this._bindDockerEventHandler);

        const restart = this.state !== "stopping";
        this._setState("stopped");

        if (!restart) console.log("Container " + this.name + " stopped.");
        else {
            console.log("Container " + this.name + " stopped, restarting...");
            this.start(0, "");
        }
    }

    async _send(content: string) {
        const container = this.servers.docker.getContainer(this.name);
        const stream = await container.attach({ stream: true, stdin: true });

        await new Promise(async (resolve, reject) => {
            stream.write(content + "\n", (error) => {
                if (error) reject(error);
                else stream.end(() => resolve(null));
            });
        });
    }

    async kill() {
        if (this.state === "stopped") throw new Error("Already stopped");

        await this.servers.docker.getContainer(this.name).kill();
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
        return logged
            ? {
                  name: this.name,
                  port: this.port,
                  state: this.state,
                  gatewayConnected: !!this.gatewayClient,
                  players: this.players.length
              }
            : {
                  name: this.name,
                  state: this.state,
                  gatewayConnected: !!this.gatewayClient,
                  players: this.players.length
              };
    }
}

export class Proxy extends Container {
    constructor(servers: Servers) {
        super(servers, "proxy", path.resolve(config.proxyDir), config.proxyPort);
    }

    async start() {
        await super.start(config.proxyMemory, "velocity.jar");
    }

    async stop() {
        await super.stop("end");
    }
}

export class Server extends EventEmitter {
    servers;
    name;
    node;
    maxPlayers;
    port;

    state: "stopped" | "starting" | "started" | "stopping" = "stopped";
    gatewayClient: WebSocketClient | null = null;

    players: Player[] = [];
    connectingPlayers: string[] = [];

    constructor(servers: Servers, name: string, node: Node, maxPlayers: number, port: number | null = null) {
        super();

        if (!port) {
            port = config.serversStartingPort as number;
            while (servers.servers.some((server) => server.port === port)) port++;
        }

        this.servers = servers;
        this.name = name;
        this.node = node;
        this.maxPlayers = maxPlayers;
        this.port = port;
    }

    setState(state: "stopped" | "starting" | "started" | "stopping") {
        this.state = state;
        this.emit(state);
        this.servers.saveState();
        this.servers.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("SERVER_STATE", { name: this.name, state: state }));
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
        return logged
            ? {
                  name: this.name,
                  node: this.node.name,
                  host: this.node.host,
                  port: this.port,
                  state: this.state,
                  gatewayConnected: !!this.gatewayClient,
                  players: this.players.length,
                  maxPlayers: this.maxPlayers
              }
            : {
                  name: this.name,
                  state: this.state,
                  gatewayConnected: !!this.gatewayClient,
                  players: this.players.length,
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
