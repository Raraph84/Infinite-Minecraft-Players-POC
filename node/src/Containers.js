const { promises: fs, existsSync } = require("fs");
const EventEmitter = require("events");
const path = require("path");
const config = require("../config.json");

class Server extends EventEmitter {
    /**
     * @param {import("./Servers")} servers
     * @param {string} name
     * @param {number} port
     */
    constructor(servers, name, port) {
        super();

        this.servers = servers;
        this.name = name;
        this.path = path.join(path.resolve(config.serversDir), name);
        this.port = port;

        /** @type {"stopped"|"starting"|"started"|"stopping"} */
        this.state = "stopped";

        this._bindDockerEventHandler = this._dockerEventHandler.bind(this);
    }

    /**
     * @param {"stopped"|"starting"|"started"|"stopping"} state
     */
    _setState(state) {
        this.state = state;
        this.emit(state);
        require("./gateway").getLastWs().sendCommand("SERVER_STATE", { name: this.name, state: state });
    }

    /**
     * @param {object} event
     */
    async _dockerEventHandler(event) {
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
            } catch (error) {
                if (error.statusCode === 404) break;
                else if (error.statusCode === 409) continue;
                else throw error;
            }
        }

        if (existsSync(this.path)) await fs.rm(this.path, { recursive: true });
    }

    /**
     * @param {number} memory
     */
    async start(memory) {
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
                resolve();
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
            this.start();
        }
    }

    /**
     * @param {string} content
     */
    async _send(content) {
        const container = this.servers.docker.getContainer(this.name);
        const stream = await container.attach({ stream: true, stdin: true });

        await new Promise(async (resolve, reject) => {
            stream.write(content + "\n", (error) => {
                if (error) reject(error);
                else
                    stream.end((error) => {
                        if (error) reject(error);
                        else resolve();
                    });
            });
        });
    }

    async kill() {
        if (this.state === "stopped") throw new Error("Already stopped");

        await this.servers.docker.getContainer(this.name).kill();
    }
}

class Lobby extends Server {
    /**
     * @param {import("./Servers")} servers
     * @param {number} id
     * @param {number} port
     */
    constructor(servers, id, port) {
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

class Game extends Server {
    /**
     * @param {import("./Servers")} servers
     * @param {number} id
     * @param {number} port
     */
    constructor(servers, id, port) {
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

module.exports = { Server, Lobby, Game };
