import { promises as fs, existsSync } from "fs";
import EventEmitter from "events";
import Servers from "./Servers";
import path from "path";
import gateway from "./gateway";

const config = require("../config.json");

export class Server extends EventEmitter {
    servers;
    name;
    path;
    port;

    state: "stopped" | "starting" | "started" | "stopping" = "stopped";

    _bindDockerEventHandler;

    constructor(servers: Servers, name: string, port: number) {
        super();

        this.servers = servers;
        this.name = name;
        this.path = path.join(path.resolve(config.serversDir), name);
        this.port = port;

        this._bindDockerEventHandler = this._dockerEventHandler.bind(this);
    }

    _setState(state: "stopped" | "starting" | "started" | "stopping") {
        this.state = state;
        this.emit(state);
        gateway.getLastWs()!.sendCommand("SERVER_STATE", { name: this.name, state: state });
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

        if (existsSync(this.path)) await fs.rm(this.path, { recursive: true });
    }

    async start(memory: number) {
        await this._preStart();

        const configFile = path.join(
            this.path,
            "plugins",
            "Infinite-Minecraft-Players-POC-Server-Plugin",
            "config.yml"
        );
        await fs.writeFile(configFile, (await fs.readFile(configFile, "utf8")).replace("SERVERNAME", this.name));

        this.servers.dockerEvents.on("rawEvent", this._bindDockerEventHandler);

        const container = await this.servers.docker.createContainer({
            name: this.name,
            ExposedPorts: { "25565/tcp": {} },
            Tty: true,
            OpenStdin: true,
            Cmd: ["java", "-Xmx" + memory * 1024 + "M", "-jar", "paper.jar"],
            Image: "openjdk:8",
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

    async stop() {
        if (this.state !== "started") throw new Error("Not started");
        this._setState("stopping");

        console.log("Stopping container " + this.name + "...");

        await this._send("stop");

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
            this.start(0);
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
}

export class Lobby extends Server {
    id;

    constructor(servers: Servers, id: number, port: number) {
        super(servers, "lobby" + id, port);
        this.id = id;
    }

    async _preStart() {
        await super._preStart();
        await fs.cp(path.resolve(config.lobbyServerTemplateDir), this.path, { recursive: true });
    }

    async start() {
        await super.start(config.lobbyServerMemory);
    }
}

export class Game extends Server {
    id;

    constructor(servers: Servers, id: number, port: number) {
        super(servers, "game" + id, port);
        this.id = id;
    }

    async _preStart() {
        await super._preStart();
        await fs.cp(path.resolve(config.gameServerTemplateDir), this.path, { recursive: true });
    }

    async start() {
        await super.start(config.gameServerMemory);
    }
}
