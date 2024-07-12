const { Proxy, Lobby } = require("./Containers");
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

        await this.proxy.start();
        await this.startLobbyServer();

        let scalingLobbies = false;
        setInterval(async () => {

            if (scalingLobbies) return;
            scalingLobbies = true;

            const servers = this.servers.filter((server) => server instanceof Lobby);
            const totalPlayerCount = servers.reduce((acc, server) => acc + server.players.length, 0);
            const requiredServerCount = Math.max(1, Math.ceil(totalPlayerCount * 1.1 / config.lobbyPlayers));  // 10% more servers than required and minimum 1

            if (servers.length < requiredServerCount)
                console.log("Scaling up lobby servers...", servers.length, requiredServerCount, totalPlayerCount);
            else if (servers.length > requiredServerCount)
                console.log("Scaling down lobby servers...", servers.length, requiredServerCount, totalPlayerCount);

            while (servers.length < requiredServerCount) {
                const server = await this.startLobbyServer();
                servers.push(server);
            }

            while (servers.length > requiredServerCount) {
                const server = [...servers].reverse().find((server) => server.players.length === 0);
                if (!server) break;
                await this.removeServer(server);
                servers.splice(servers.indexOf(server), 1);
            }

            scalingLobbies = false;

        }, 2000);
    }
}

module.exports = Servers;
