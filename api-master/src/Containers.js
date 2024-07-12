const { promises: fs, existsSync } = require("fs");
const EventEmitter = require("events");
const path = require("path");
const config = require("../config.json");

class Container extends EventEmitter {

    /**
     * @param {import("./Servers")} servers 
     * @param {string} name 
     * @param {string} path 
     * @param {number} port 
     */
    constructor(servers, name, path, port) {

        super();

        this.servers = servers;
        this.docker = servers.docker;
        this.dockerEvents = servers.dockerEvents;
        this.name = name;
        this.path = path;
        this.port = port;

        /** @type {"stopped"|"starting"|"started"|"stopping"} */
        this.state = "stopped";
        this.players = [];
        /** @type {import("raraph84-lib/src/WebSocketClient")} */
        this.gatewayClient = null;

        this._bindDockerEventHandler = this._dockerEventHandler.bind(this);
    }

    /**
     * @param {"stopped"|"starting"|"started"|"stopping"} state 
     */
    _setState(state) {
        this.state = state;
        this.emit(state);
        this.servers.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_STATE", { name: this.name, state: state }));
    }

    /**
     * @param {object} event 
     */
    async _dockerEventHandler(event) {

        if (event.Type !== "container" || event.Actor.Attributes.name !== this.name) return;

        if (event.Action === "start")
            this._postStart();
        else if (event.Action === "die")
            this._postStop();
    }

    async _preStart() {

        if (this.state !== "stopped") throw new Error("Not stopped");
        this._setState("starting");

        console.log("Starting container " + this.name + "...");
    }

    /**
     * @param {number} memory 
     * @param {string} file 
     * @param {boolean} exposed 
     */
    async start(memory, file, exposed = false) {

        await this._preStart();

        this.servers.dockerEvents.on("rawEvent", this._bindDockerEventHandler);

        const container = await this.docker.createContainer({
            name: this.name,
            User: process.getuid() + ":" + process.getgid(),
            ExposedPorts: { "25565/tcp": {} },
            Tty: true,
            OpenStdin: true,
            Cmd: ["java", "-Xmx" + memory * 1024 + "M", "-jar", file],
            Image: "openjdk:8",
            WorkingDir: "/home/server",
            HostConfig: {
                PortBindings: { "25565/tcp": [{ HostIp: exposed ? "" : "172.17.0.1", HostPort: this.port.toString() }] },
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

    /**
     * @param {string} command 
     */
    async stop(command) {

        if (this.state !== "started") throw new Error("Not started");
        this._setState("stopping");

        console.log("Stopping container " + this.name + "...");

        await this._send(command);

        const killTimeout = setTimeout(() => this.kill(), 10 * 1000);

        await new Promise((resolve) => this.once("stopped", () => {
            clearTimeout(killTimeout);
            resolve();
        }));
    }

    _postStop() {

        if (this.state === "stopped") throw new Error("Already stopped");

        this.servers.dockerEvents.removeListener("rawEvent", this._bindDockerEventHandler);

        this._setState("stopped");
        console.log("Container " + this.name + " stopped.");
    }

    /**
     * @param {string} content 
     */
    async _send(content) {

        const container = this.docker.getContainer(this.name);
        const stream = await container.attach({ stream: true, stdin: true });

        await new Promise(async (resolve, reject) => {
            stream.write(content + "\n", (error) => {
                if (error) reject(error);
                else stream.end((error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
        });
    }

    async kill() {

        if (this.state === "stopped") throw new Error("Already stopped");

        await this.docker.getContainer(this.name).kill();
    }

    /**
     * @param {import("raraph84-lib/src/WebSocketClient")} client 
     */
    gatewayConnected(client) {
        if (this.gatewayClient !== null) this.gatewayClient.close("Another client is already connected");
        this.gatewayClient = client;
        this.emit("gatewayConnected");
        this.servers.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_GATEWAY_CONNECTED", { name: this.name }));
        console.log("Container " + this.name + " connected to the gateway.");
    }

    gatewayDisconnected() {
        if (this.gatewayClient === null) throw new Error("No client connected");
        this.gatewayClient = null;
        this.emit("gatewayDisconnected");
        this.servers.gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("SERVER_GATEWAY_DISCONNECTED", { name: this.name }));
        console.log("Container " + this.name + " disconnected from the gateway.");
    }

    toApiObj() {
        return { name: this.name, port: this.port, state: this.state, gatewayConnected: !!this.gatewayClient };
    }
}

class Proxy extends Container {

    /**
     * @param {import("./Servers")} servers 
     */
    constructor(servers) {
        super(servers, "proxy", path.resolve(config.proxyDir), config.proxyPort);
    }

    async _preStart() {

        await super._preStart();

        let inspect;
        try {
            inspect = await this.docker.getContainer(this.name).inspect();
        } catch (error) {
        }

        if (inspect?.State.Running) {
            this.servers.dockerEvents.on("rawEvent", this._bindDockerEventHandler);
            this._setState("started");
            await this.stop();
            await this._preStart();
            return;
        }

        while (true) {
            try {
                await this.docker.getContainer(this.name).remove({ force: true });
            } catch (error) {
                if (error.statusCode === 404) break;
                else if (error.statusCode === 409) continue;
                else throw error;
            }
        }
    }

    async start() {
        await super.start(config.proxyMemory, "BungeeCord.jar", true);
    }

    async stop() {
        await super.stop("end");
    }
}

class Server extends Container {

    /**
     * @param {import("./Servers")} servers 
     * @param {string} name 
     * @param {number} port 
     * @param {number} maxPlayers 
     */
    constructor(servers, name, port, maxPlayers) {

        super(servers, name, path.join(config.serversDir, name), port);

        this.maxPlayers = maxPlayers;
    }

    async _preStart() {

        await super._preStart();

        try {
            await this.docker.getContainer(this.name).remove({ force: true });
        } catch (error) {
            if (error.statusCode !== 404) throw error;
        }

        if (existsSync(this.path))
            await fs.rm(this.path, { recursive: true });
    }

    /**
     * @param {number} memory 
     */
    async start(memory) {

        await super.start(memory, "spigot-1.12.2.jar");
    }

    async stop() {
        await super.stop("stop");
    }

    toApiObj() {
        return { ...super.toApiObj(), maxPlayers: this.maxPlayers };
    }
}

class Lobby extends Server {

    /**
     * @param {import("./Servers")} servers 
     * @param {string} id 
     */
    constructor(servers, id) {

        super(servers, "lobby" + id, 25200 + id, config.lobbyMaxPlayers);

        this.id = id;
    }

    async _preStart() {

        await super._preStart();

        await fs.cp(path.resolve(config.lobbyServerTemplateDir), this.path, { recursive: true });

        const configFile = path.join(this.path, "plugins", "Infinite-Minecraft-Players-POC-Server-Plugin", "config.yml");
        await fs.writeFile(configFile, (await fs.readFile(configFile, "utf8")).replace("SERVERNAME", this.name));
    }

    async start() {
        await super.start(config.lobbyServerMemory);
    }

    toApiObj() {
        return { ...super.toApiObj(), id: this.id };
    }
}

module.exports = { Container, Proxy, Server, Lobby };
