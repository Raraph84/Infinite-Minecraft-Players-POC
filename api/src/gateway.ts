import { WebSocketClient, WebSocketServer } from "raraph84-lib";
import Servers from "./Servers";
import fs from "fs/promises";
import path from "path";

let heartbeatInterval: NodeJS.Timeout | null = null;

const start = async (gateway: WebSocketServer, servers: Servers) => {
    const commandsFiles = (await fs.readdir(path.join(__dirname, "commands"), { recursive: true }))
        .filter((file) => file.endsWith(".js") || file.endsWith(".ts"))
        .filter((file, i, files) => file.endsWith(".js") || !files.includes(file.replace(".ts", ".js")))
        .map((command) => require(path.join(__dirname, "commands", command)));

    gateway.on("connection", (client) => {
        setTimeout(() => {
            if (!client.metadata.logged) client.close("Please login");
        }, 10 * 1000);
    });

    gateway.on("command", (commandName, client, message) => {
        const command = commandsFiles.find((command) => command.infos.command === commandName);

        if (!command) {
            client.close("This command does not exists");
            return;
        }

        if (command.infos.requiresAuth && !client.metadata.logged) {
            client.close("Please login");
            return;
        }

        command.run(message, client, servers);
    });

    gateway.on("close", (client: WebSocketClient) => {
        if (client.metadata.type === "server") {
            const server = servers.servers.find((server) => server.name === client.metadata.serverName)!;
            server.gatewayDisconnected();
        } else if (client.metadata.type === "proxy") {
            const proxy = servers.proxies.find((proxy) => proxy.name === client.metadata.proxyName)!;
            proxy.gatewayDisconnected();
        } else if (client.metadata.type === "node") {
            const node = servers.nodes.find((node) => node.name === client.metadata.nodeName)!;
            node.gatewayDisconnected();
        }
    });

    heartbeatInterval = setInterval(() => {
        gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => {
                client.metadata.waitingHeartbeat = true;
                client.emitEvent("HEARTBEAT");
            });

        setTimeout(() => {
            gateway.clients
                .filter((client) => client.metadata.waitingHeartbeat)
                .forEach((client) => {
                    client.close("Please reply to the heartbeat");
                });
        }, 10 * 1000);
    }, 30 * 1000);
};

const stop = async () => {
    clearInterval(heartbeatInterval!);
};

export default { start, stop };
