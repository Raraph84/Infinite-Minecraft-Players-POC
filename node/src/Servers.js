const { Lobby, Game, Server } = require("./Containers");

class Servers {
    /**
     * @param {import("dockerode")} docker
     * @param {import("./DockerEventListener")} dockerEvents
     */
    constructor(docker, dockerEvents) {
        this.docker = docker;
        this.dockerEvents = dockerEvents;

        /** @type {import("./Containers").Server[]} */
        this.servers = [];
    }

    /**
     * @param {Server} server
     */
    async startServer(server) {
        this.servers.push(server);

        require("./gateway").getLastWs().sendCommand("SERVER_ACTION", { name: server.name, action: "created" });

        const containers = await this.docker.listContainers();
        if (containers.some((container) => container.Names[0] === "/" + server.name)) {
            this.dockerEvents.on("rawEvent", server._bindDockerEventHandler);
            server._setState("started");
        } else await server.start();
    }

    async startLobbyServer(id, port) {
        const server = new Lobby(this, id, port);
        await this.startServer(server);
        return server;
    }

    async startGameServer(id, port) {
        const server = new Game(this, id, port);
        await this.startServer(server);
        return server;
    }

    /**
     * @param {import("./Containers").Server} server
     */
    async removeServer(server) {
        if (server.state === "started") await server.stop();
        else if (server.state !== "stopped") throw new Error("Server is not started or stopped");

        this.servers = this.servers.filter((s) => s !== server);

        require("./gateway").getLastWs().sendCommand("SERVER_ACTION", { name: server.name, action: "removed" });
    }

    async clearServers() {
        for (const server of this.servers) this.dockerEvents.removeListener("rawEvent", server._bindDockerEventHandler);
        this.servers = [];
    }
}

module.exports = Servers;
