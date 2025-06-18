import { WebSocketClient } from "raraph84-lib";
import Servers from "../Servers";

export const run = async (message: any, client: WebSocketClient, servers: Servers) => {
    if (client.metadata.type !== "node") {
        client.close("You are not a node client");
        return;
    }

    if (typeof message.name !== "string") {
        client.close("Name must be a string");
        return;
    }

    if (typeof message.state !== "string") {
        client.close("State must be a string");
        return;
    }

    const server = servers.servers.find((server) => server.name === message.name);
    if (!server) {
        client.close("Unknown server");
        return;
    }

    server.setState(message.state);
};

export const infos = {
    command: "SERVER_STATE",
    requiresAuth: true
};
