const { Proxy, Lobby, Game } = require("./Containers");
const config = require("../config.json");

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
    }

    async startLobbyServer() {

        let id = 1;
        while (this.servers.find((server) => server instanceof Lobby && server.id === id)) id++;

        const server = new Lobby(this, id);
        this.servers.push(server);

        this.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_CREATED", server.toApiObj()));

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

        this.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_CREATED", server.toApiObj()));

        await server.start();

        return server;
    }

    /**
     * @param {string} playerUuid 
     */
    getAvailableGame(playerUuid) {

        const availableGames = this.servers.filter((server) => server instanceof Game && server.gatewayClient && !server.started);
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

        this.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_REMOVED", { name: server.name }));
    }

    async start() {

        console.log("Starting servers...");

        this.proxy.start();
        this.startLobbyServer();
        this.startGameServer();

        let scalingLobbies = false;
        setInterval(async () => {

            if (scalingLobbies) return;
            scalingLobbies = true;

            const servers = this.servers.filter((server) => server instanceof Lobby);
            const totalPlayerCount = servers.reduce((acc, server) => acc + server.players.length, 0);
            const requiredServerCount = Math.max(1, Math.ceil(totalPlayerCount * 1.1 / config.lobbyPlayers));  // 10% more servers than required and minimum 1

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

            scalingLobbies = false;

        }, 2000);

        let scalingGames = false;
        setInterval(async () => {

            if (scalingGames) return;
            scalingGames = true;

            const servers = this.servers.filter((server) => server instanceof Game);
            const totalPlayerCount = servers.reduce((acc, server) => acc + server.players.length, 0);
            let requiredServerCount = Math.max(1, Math.ceil(totalPlayerCount * 1.1 / config.gamePlayers)); // 10% more servers than required and minimum 1

            // Increment server count while there is not 20% of requiredServerCount not started
            let notStartedServerCount = servers.filter((server) => !server.started).length + (requiredServerCount - servers.length);
            if (notStartedServerCount / requiredServerCount < 0.2) { requiredServerCount++; notStartedServerCount++; }

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

            scalingGames = false;

        }, 2000);
    }
}

module.exports = Servers;
