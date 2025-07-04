import { WebSocketClient } from "raraph84-lib";
import Servers from "../Servers";

export const run = async (message: any, client: WebSocketClient, servers: Servers) => {
    if (client.metadata.logged) {
        client.close("Already logged");
        return;
    }

    if (typeof message.token !== "string") {
        client.close("Token must be a string");
        return;
    }

    if (message.token !== process.env.API_KEY) {
        client.close("Invalid token");
        return;
    }

    if (typeof message.type !== "string") {
        client.close("Type must be a string");
        return;
    }

    if (message.type !== "node" && message.type !== "server" && message.type !== "proxy") {
        client.close("Type must be node, server or proxy");
        return;
    }

    if (message.type === "node") {
        if (typeof message.node !== "string") {
            client.close("Node must be a string");
            return;
        }

        const node = servers.nodes.find((node) => node.name === message.node);
        if (!node) {
            client.close("Unknown node");
            return;
        }

        client.metadata.nodeName = node.name;
        node.gatewayConnected(client);
    } else if (message.type === "server") {
        if (typeof message.server !== "string") {
            client.close("Server must be a string");
            return;
        }

        const server = servers.servers.find((server) => server.name === message.server);
        if (!server) {
            client.close("Unknown server");
            return;
        }

        client.metadata.serverName = server.name;
        server.gatewayConnected(client);
    } else if (message.type === "proxy") {
        if (typeof message.proxy !== "string") {
            client.close("Proxy must be a string");
            return;
        }

        const proxy = servers.proxies.find((proxy) => proxy.name === message.proxy);
        if (!proxy) {
            client.close("Unknown proxy");
            return;
        }

        client.metadata.proxyName = proxy.name;
        proxy.gatewayConnected(client);
    }

    client.metadata.type = message.type;
    client.metadata.logged = true;
    client.emitEvent("LOGGED");
};

export const infos = {
    command: "LOGIN",
    requiresAuth: false
};
