import { Game, Lobby, Server } from "./Containers";
import Dockerode from "dockerode";
import DockerEventListener from "./DockerEventListener";
import gateway from "./gateway";

export default class Servers {
    docker;
    dockerEvents;

    servers: Server[] = [];

    constructor(docker: Dockerode, dockerEvents: DockerEventListener) {
        this.docker = docker;
        this.dockerEvents = dockerEvents;
    }

    async startServer(server: Server) {
        this.servers.push(server);

        gateway.getLastWs()!.sendCommand("SERVER_ACTION", { name: server.name, action: "created" });

        const containers = await this.docker.listContainers();
        if (containers.some((container) => container.Names[0] === "/" + server.name)) {
            this.dockerEvents.on("rawEvent", server._bindDockerEventHandler);
            server._setState("started");
        } else await server.start(0);
    }

    async startLobbyServer(id: number, port: number) {
        const server = new Lobby(this, id, port);
        await this.startServer(server);
        return server;
    }

    async startGameServer(id: number, port: number) {
        const server = new Game(this, id, port);
        await this.startServer(server);
        return server;
    }

    async removeServer(server: Server) {
        if (server.state === "started") await server.stop();
        else if (server.state !== "stopped") throw new Error("Server is not started or stopped");

        this.servers = this.servers.filter((s) => s !== server);

        gateway.getLastWs()!.sendCommand("SERVER_ACTION", { name: server.name, action: "removed" });
    }

    async clearServers() {
        for (const server of this.servers) this.dockerEvents.removeListener("rawEvent", server._bindDockerEventHandler);
        this.servers = [];
    }
}
