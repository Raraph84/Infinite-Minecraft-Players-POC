const { Proxy, Lobby, Game } = require("./Containers");
const { promises: fs, existsSync } = require("fs");
const path = require("path");
const config = require("../config.json");

const stateFile = path.resolve(config.stateFile);

class Servers {

    /**
     * @param {import("dockerode")} docker 
     * @param {import("./DockerEventListener")} dockerEvents 
     * @param {import("raraph84-lib/src/WebSocketServer")} gateway 
     */
    constructor(docker, dockerEvents, gateway) {

        this.docker = docker;
        this.dockerEvents = dockerEvents;
        this.gateway = gateway;

        this.proxy = new Proxy(this);
        /** @type {import("./Containers").Server[]} */
        this.servers = [];

        this.scalingLobbies = false;
        this.scalingGames = false;
    }

    async startLobbyServer() {

        let id = 1;
        while (this.servers.find((server) => server instanceof Lobby && server.id === id)) id++;

        const server = new Lobby(this, id);
        this.servers.push(server);
        this.saveState();

        this.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_CREATED", server.toApiObj(true)));

        await server.start();

        return server;
    }

    /**
     * @param {string} playerUuid 
     */
    getAvailableLobby(playerUuid) {

        const availableLobbies = this.servers.filter((server) => server instanceof Lobby && server.gatewayClient);

        let availableLobby = availableLobbies.find((server) => (server.players.length + server.connectingPlayers.length) < config.lobbyPlayers);
        if (!availableLobby) {
            availableLobbies.sort((a, b) => a.players.length - b.players.length);
            availableLobby = availableLobbies.find((server) => (server.players.length + server.connectingPlayers.length) < config.lobbyMaxPlayers);
        }

        if (availableLobby) availableLobby.playerConnecting(playerUuid);
        if (!availableLobby) console.log("Cannot find available lobby server");

        return availableLobby || null;
    }

    async startGameServer() {

        let id = 1;
        while (this.servers.find((server) => server instanceof Game && server.id === id)) id++;

        const server = new Game(this, id);
        this.servers.push(server);
        this.saveState();

        this.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_CREATED", server.toApiObj(true)));

        await server.start();

        return server;
    }

    /**
     * @param {string} playerUuid 
     */
    getAvailableGame(playerUuid) {

        const availableGames = this.servers.filter((server) => server instanceof Game && server.gatewayClient && !server.gameStarted);
        const availableGame = availableGames.find((server) => (server.players.length + server.connectingPlayers.length) < config.gamePlayers);

        if (availableGame) availableGame.playerConnecting(playerUuid);
        if (!availableGame) console.log("Cannot find available game server");

        return availableGame || null;
    }

    /**
     * @param {import("./Containers").Server} server 
     */
    async removeServer(server) {

        if (server.state === "started") await server.stop();
        else if (server.state !== "stopped") throw new Error("Server is not started or stopped");

        this.servers = this.servers.filter((s) => s !== server);
        this.saveState();

        this.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_REMOVED", { name: server.name }));
    }

    async saveState() {

        const state = {
            proxy: {
                state: this.proxy.state
            },
            servers: this.servers.map((server) => {
                if (server instanceof Lobby) return { type: "lobby", id: server.id, port: server.port, state: server.state };
                else if (server instanceof Game) return { type: "game", id: server.id, port: server.port, state: server.state, gameStarted: server.gameStarted };
            })
        };

        await fs.writeFile(stateFile, JSON.stringify(state, null, 4));
    }

    async loadState() {

        if (!existsSync(stateFile)) return;

        const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
        const containers = await this.docker.listContainers();

        if (state.proxy.state === "started" && containers.some((container) => container.Names[0] === "/" + this.proxy.name)) {
            this.dockerEvents.on("rawEvent", this.proxy._bindDockerEventHandler);
            this.proxy._setState("started");
        }

        for (const serverState of state.servers) {

            let server;
            if (serverState.type === "lobby") server = new Lobby(this, serverState.id);
            else if (serverState.type === "game") server = new Game(this, serverState.id);
            else return;
            server.port = serverState.port;
            this.servers.push(server);

            this.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_CREATED", server.toApiObj(true)));

            if (serverState.state === "started" && containers.some((container) => container.Names[0] === "/" + server.name)) {
                if (server instanceof Game && serverState.gameStarted) server.gameStarted = true;
                this.dockerEvents.on("rawEvent", server._bindDockerEventHandler);
                server._setState("started");
            }
        }
    }

    async start() {

        if (config.proxyMemory + config.lobbyServerMemory + config.gameServerMemory > config.maxMemory && config.maxMemory > 0) throw new Error("Base memory usage is higher than max memory");

        console.log("Loading state...");
        await this.loadState();

        console.log("Starting not started servers...");
        if (this.proxy.state !== "started") this.proxy.start();
        await this.scaleLobbies();
        await this.scaleGames();

        setInterval(() => this.scaleLobbies(), 2000);
        setInterval(() => this.scaleGames(), 2000);
    }

    async scaleLobbies() {

        if (this.scalingLobbies) return;
        this.scalingLobbies = true;

        const servers = this.servers.filter((server) => server instanceof Lobby);
        const totalPlayerCount = servers.reduce((acc, server) => acc + server.players.length, 0);
        let requiredServerCount = Math.max(1, Math.ceil(totalPlayerCount * 1.1 / config.lobbyPlayers));  // 10% more servers than required and minimum 1

        // Decrement requiredServerCount while ram usage is more than configured max memory
        const otherMemory = config.proxyMemory + this.servers.reduce((acc, server) => acc + (server instanceof Game ? config.gameServerMemory : 0), 0);
        while (otherMemory + requiredServerCount * config.lobbyServerMemory > config.maxMemory && config.maxMemory > 0) requiredServerCount--;

        if (servers.length < requiredServerCount)
            console.log("Scaling up lobby servers...", totalPlayerCount, servers.length, requiredServerCount);
        else if (servers.length > requiredServerCount)
            console.log("Scaling down lobby servers...", totalPlayerCount, servers.length, requiredServerCount);

        while (servers.length < requiredServerCount) {
            const server = await this.startLobbyServer();
            servers.push(server);
        }

        while (servers.length > requiredServerCount) {
            const server = [...servers].reverse().find((server) => server.players.length === 0 && server.state === "started");
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
        const totalPlayerCount = servers.reduce((acc, server) => acc + (server.started ? config.gamePlayers : server.players.length), 0);
        let requiredServerCount = Math.max(1, Math.ceil(totalPlayerCount * 1.1 / config.gamePlayers)); // 10% more servers than required and minimum 1

        // Increment server count while there is not 20% of requiredServerCount not started
        let notStartedServerCount = servers.filter((server) => !server.started).length + (requiredServerCount - servers.length);
        if (notStartedServerCount / requiredServerCount < 0.2) { requiredServerCount++; notStartedServerCount++; }

        // Decrement requiredServerCount while ram usage is more than configured max memory
        const otherMemory = config.proxyMemory + this.servers.reduce((acc, server) => acc + (server instanceof Lobby ? config.lobbyServerMemory : 0), 0);
        while (otherMemory + requiredServerCount * config.gameServerMemory > config.maxMemory && config.maxMemory > 0) requiredServerCount--;

        if (servers.length < requiredServerCount)
            console.log("Scaling up game servers...", totalPlayerCount, servers.length, requiredServerCount);
        else if (servers.length > requiredServerCount)
            console.log("Scaling down game servers...", totalPlayerCount, servers.length, requiredServerCount);

        while (servers.length < requiredServerCount) {
            const server = await this.startGameServer();
            servers.push(server);
        }

        while (servers.length > requiredServerCount) {
            const server = [...servers].reverse().find((server) => server.players.length === 0 && server.state === "started" && !server.started);
            if (!server) break;
            await this.removeServer(server);
            servers.splice(servers.indexOf(server), 1);
        }

        this.scalingGames = false;
    }
}

module.exports = Servers;
