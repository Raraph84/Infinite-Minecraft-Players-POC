import { promises as fs, existsSync } from "fs";
import { WebSocketServer } from "raraph84-lib";
import { Game, Lobby, Proxy, Server } from "./Containers";
import Dockerode from "dockerode";
import DockerEventListener from "./DockerEventListener";
import Node from "./Node";
import path from "path";

const config = require("../config.json");
const stateFile = path.resolve(config.stateFile);

export default class Servers {
    docker;
    dockerEvents;
    gateway;
    nodes;

    proxy;
    servers: Server[] = [];

    scalingLobbies = false;
    scalingGames = false;

    savingState = false;
    needSaveState = false;

    constructor(docker: Dockerode, dockerEvents: DockerEventListener, gateway: WebSocketServer, nodes: Node[]) {
        this.docker = docker;
        this.dockerEvents = dockerEvents;
        this.gateway = gateway;
        this.nodes = nodes;

        this.proxy = new Proxy(this);
    }

    async _startServer(server: Server) {
        this.servers.push(server);
        this.saveState();

        server.node.gatewayClient!.emitEvent("SERVER_ACTION", { action: "create", ...server.toApiObj(true) });
        await new Promise((resolve) => server.once("actionCreated", resolve));

        this.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("SERVER_CREATED", server.toApiObj(true)));
    }

    async getAvailableNode() {
        while (!this.nodes.some((node) => node.gatewayClient))
            await new Promise((resolve) => setTimeout(resolve, 1000));

        const scount = (node: Node) => this.servers.filter((server) => server.node === node).length;
        const availableNodes = this.nodes.filter((node) => node.gatewayClient);

        availableNodes.sort((a, b) => scount(a) / a.maxMemory - scount(b) / b.maxMemory);

        // TODO Check max ram

        return availableNodes[0];
    }

    async startLobbyServer() {
        let id = 1;
        while (this.servers.find((server) => server instanceof Lobby && server.id === id)) id++;

        const node = await this.getAvailableNode();
        const server = new Lobby(this, id, node);
        await this._startServer(server);
        return server;
    }

    getAvailableLobby(playerUuid: string) {
        const pcount = (server: Server) => server.players.length + server.connectingPlayers.length;
        const availableLobbies = this.servers.filter((server) => server instanceof Lobby && server.gatewayClient);

        let availableLobby = availableLobbies.find((server) => pcount(server) < config.lobbyPlayers);
        if (!availableLobby) {
            availableLobbies.sort((a, b) => pcount(a) - pcount(b));
            availableLobby = availableLobbies.find((server) => pcount(server) < config.lobbyMaxPlayers);
        }

        if (availableLobby) availableLobby.playerConnecting(playerUuid);
        if (!availableLobby) console.log("Cannot find available lobby server");

        return availableLobby || null;
    }

    async startGameServer() {
        let id = 1;
        while (this.servers.find((server) => server instanceof Game && server.id === id)) id++;

        const node = await this.getAvailableNode();
        const server = new Game(this, id, node);
        await this._startServer(server);
        return server;
    }

    getAvailableGame(playerUuid: string) {
        const availableGames = this.servers.filter(
            (server) => server instanceof Game && server.gatewayClient && !server.gameStarted
        );
        const availableGame = availableGames.find(
            (server) => server.players.length + server.connectingPlayers.length < config.gamePlayers
        );

        if (availableGame) availableGame.playerConnecting(playerUuid);
        if (!availableGame) console.log("Cannot find available game server");

        return availableGame || null;
    }

    async removeServer(server: Server) {
        server.node.gatewayClient!.emitEvent("SERVER_ACTION", { action: "remove", ...server.toApiObj(true) });
        await new Promise((resolve) => server.once("actionRemoved", resolve));

        this.servers = this.servers.filter((s) => s !== server);
        this.saveState();

        this.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("SERVER_REMOVED", { name: server.name }));
    }

    async saveState() {
        if (this.savingState) {
            this.needSaveState = true;
            return;
        }

        this.needSaveState = false;
        this.savingState = true;

        const state = {
            proxy: {
                state: this.proxy.state
            },
            servers: this.servers.map((server) => {
                if (server instanceof Lobby)
                    return {
                        type: "lobby",
                        node: server.node.name,
                        id: server.id,
                        port: server.port,
                        state: server.state
                    };
                else if (server instanceof Game)
                    return {
                        type: "game",
                        node: server.node.name,
                        id: server.id,
                        port: server.port,
                        state: server.state,
                        gameStarted: server.gameStarted
                    };
            })
        };

        await fs.writeFile(stateFile, JSON.stringify(state, null, 4));

        this.savingState = false;

        if (this.needSaveState) this.saveState();
    }

    async loadState() {
        if (!existsSync(stateFile)) return;

        const state = JSON.parse(await fs.readFile(stateFile, "utf8"));

        const containers = await this.docker.listContainers();
        if (
            state.proxy.state === "started" &&
            containers.some((container) => container.Names[0] === "/" + this.proxy.name)
        ) {
            this.dockerEvents.on("rawEvent", this.proxy._bindDockerEventHandler);
            this.proxy._setState("started");
        }

        for (const serverState of state.servers) {
            const node = this.nodes.find((node) => node.name === serverState.node);
            if (!node) throw new Error(`Node ${serverState.node} not found`);
            if (!node.gatewayClient) continue;

            let server;
            if (serverState.type === "lobby") server = new Lobby(this, serverState.id, node, serverState.port);
            else if (serverState.type === "game") server = new Game(this, serverState.id, node, serverState.port);
            else return;
            this.servers.push(server);

            node.gatewayClient.emitEvent("SERVER_ACTION", { action: "create", ...server.toApiObj(true) });
            await new Promise((resolve) => server.once("actionCreated", resolve));

            this.gateway.clients
                .filter((client) => client.metadata.logged)
                .forEach((client) => client.emitEvent("SERVER_RESTORED", server.toApiObj(true)));
        }

        this.saveState();
    }

    async start() {
        console.log("Waiting for nodes to reconnect...");
        await new Promise((resolve) => setTimeout(resolve, 4000));

        console.log("Loading state...");
        await this.loadState();

        console.log("Waiting for servers to reconnect...");
        await new Promise((resolve) => setTimeout(resolve, 4000));

        console.log("Starting not started servers...");
        if (this.proxy.state !== "started") await this.proxy.start();

        if (config.lobbyServersScalingInterval) {
            await this.scaleLobbies();
            setInterval(() => this.scaleLobbies(), config.lobbyServersScalingInterval);
        }

        if (config.gameServersScalingInterval) {
            await this.scaleGames();
            setInterval(() => this.scaleGames(), config.gameServersScalingInterval);
        }

        console.log("Successfully started!");
    }

    async scaleLobbies() {
        if (this.scalingLobbies) return;
        this.scalingLobbies = true;

        const servers = this.servers.filter((server) => server instanceof Lobby);
        const totalPlayerCount = servers.reduce((acc, server) => acc + server.players.length, 0);
        let requiredServerCount = Math.max(1, Math.ceil((totalPlayerCount * 1.1) / config.lobbyPlayers)); // 10% more servers than required and minimum 1

        // Decrement requiredServerCount while ram usage is more than configured max memory
        /*const otherMemory =
            config.proxyMemory +
            this.servers.reduce((acc, server) => acc + (server instanceof Game ? config.gameServerMemory : 0), 0);
        while (otherMemory + requiredServerCount * config.lobbyServerMemory > config.maxMemory && config.maxMemory > 0)
            requiredServerCount--;*/

        if (servers.length < requiredServerCount)
            console.log("Scaling up lobby servers...", totalPlayerCount, servers.length, requiredServerCount);
        else if (
            servers.length > requiredServerCount &&
            servers.some((server) => server.players.length === 0 && server.state === "started")
        )
            console.log("Scaling down lobby servers...", totalPlayerCount, servers.length, requiredServerCount);

        while (servers.length < requiredServerCount) {
            const server = await this.startLobbyServer();
            servers.push(server);
        }

        while (servers.length > requiredServerCount) {
            const server = [...servers]
                .reverse()
                .find((server) => server.players.length === 0 && server.state === "started");
            if (!server) break;
            await this.removeServer(server);
            servers.splice(servers.indexOf(server), 1);
        }

        this.scalingLobbies = false;
    }

    async scaleGames() {
        if (this.scalingGames) return;
        this.scalingGames = true;

        const servers = this.servers.filter((server) => server instanceof Game);
        const totalPlayerCount = servers.reduce(
            (acc, server) => acc + (server.gameStarted ? config.gamePlayers : server.players.length),
            0
        );
        let requiredServerCount = Math.max(1, Math.ceil((totalPlayerCount * 1.25) / config.gamePlayers)); // 25% more servers than required and minimum 1

        // Increment server count while there is not 25% of requiredServerCount not started
        let notStartedServerCount =
            servers.filter((server) => !server.gameStarted).length + (requiredServerCount - servers.length);
        if (notStartedServerCount / requiredServerCount < 0.25) {
            requiredServerCount++;
            notStartedServerCount++;
        }

        // Decrement requiredServerCount while ram usage is more than configured max memory
        /*const otherMemory =
            config.proxyMemory +
            this.servers.reduce((acc, server) => acc + (server instanceof Lobby ? config.lobbyServerMemory : 0), 0);
        while (otherMemory + requiredServerCount * config.gameServerMemory > config.maxMemory && config.maxMemory > 0)
            requiredServerCount--;*/

        if (servers.length < requiredServerCount)
            console.log("Scaling up game servers...", totalPlayerCount, servers.length, requiredServerCount);
        else if (
            servers.length > requiredServerCount &&
            servers.some((server) => server.players.length === 0 && server.state === "started" && !server.gameStarted)
        )
            console.log("Scaling down game servers...", totalPlayerCount, servers.length, requiredServerCount);

        while (servers.length < requiredServerCount) {
            const server = await this.startGameServer();
            servers.push(server);
        }

        while (servers.length > requiredServerCount) {
            const server = [...servers]
                .reverse()
                .find((server) => server.players.length === 0 && server.state === "started" && !server.gameStarted);
            if (!server) break;
            await this.removeServer(server);
            servers.splice(servers.indexOf(server), 1);
        }

        this.scalingGames = false;
    }
}
