const { promises: fs } = require("fs");
const path = require("path");

let heartbeatInterval = null;

/**
 * @param {import("raraph84-lib/src/WebSocketServer")} gateway 
 * @param {import("./Servers")} servers 
 */
const start = async (gateway, servers) => {

    const commandsFiles = (await fs.readdir(path.join(__dirname, "commands"), { recursive: true })).filter((file) => file.endsWith(".js"))
        .map((command) => require(path.join(__dirname, "commands", command)));

    gateway.on("connection", (/** @type {import("raraph84-lib/src/WebSocketClient")} */ client) => {
        setTimeout(() => {
            if (!client.infos.logged)
                client.close("Please login");
        }, 10 * 1000);
    });

    gateway.on("command", (commandName, /** @type {import("raraph84-lib/src/WebSocketClient")} */ client, message) => {

        const command = commandsFiles.find((command) => command.infos.command === commandName);

        if (!command) {
            client.close("This command does not exists");
            return;
        }

        if (command.infos.requireLogin && !client.infos.logged) {
            client.close("Please login");
            return;
        }

        command.run(message, client, servers);
    });

    gateway.on("close", (/** @type {import("raraph84-lib/src/WebSocketClient")} */ client) => {

        if (!client.infos.serverName) return;

        let server;
        if (client.infos.serverName === servers.proxy.name) server = servers.proxy;
        else server = servers.servers.find((server) => server.name === client.infos.serverName);

        server.gatewayDisconnected();
    });

    heartbeatInterval = setInterval(() => {

        gateway.clients.filter((client) => client.infos.logged).forEach((client) => {
            client.infos.waitingHeartbeat = true;
            client.emitEvent("HEARTBEAT");
        });

        setTimeout(() => {
            gateway.clients.filter((client) => client.infos.waitingHeartbeat).forEach((client) => {
                client.close("Please reply to the heartbeat");
            });
        }, 10 * 1000);

    }, 30 * 1000);
};

const stop = async () => {
    clearInterval(heartbeatInterval);
};

module.exports = { start, stop };
