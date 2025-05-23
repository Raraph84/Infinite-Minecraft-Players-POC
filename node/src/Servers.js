const { Lobby, Game } = require("./Containers");

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

        /** @type {import("./Containers").Server[]} */
        this.servers = [];

        this.scalingLobbies = false;
        this.scalingGames = false;

        this.savingState = false;
        this.needSaveState = false;
    }

    async startLobbyServer() {
        let id = 1;
        while (this.servers.find((server) => server instanceof Lobby && server.id === id)) id++;

        const server = new Lobby(this, id);
        this.servers.push(server);
        this.saveState();

        this.gateway.clients
            .filter((client) => client.infos.logged)
            .forEach((client) => client.emitEvent("SERVER_CREATED", server.toApiObj(true)));

        await server.start();

        return server;
    }

    async startGameServer() {
        let id = 1;
        while (this.servers.find((server) => server instanceof Game && server.id === id)) id++;

        const server = new Game(this, id);
        this.servers.push(server);
        this.saveState();

        this.gateway.clients
            .filter((client) => client.infos.logged)
            .forEach((client) => client.emitEvent("SERVER_CREATED", server.toApiObj(true)));

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
        this.saveState();

        this.gateway.clients
            .filter((client) => client.infos.logged)
            .forEach((client) => client.emitEvent("SERVER_REMOVED", { name: server.name }));
    }
}

module.exports = Servers;
