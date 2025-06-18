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

    if (typeof message.action !== "string") {
        client.close("Action must be a string");
        return;
    }

    if (!["created", "removed"].includes(message.action)) {
        client.close("Action must be 'created' or 'removed'");
        return;
    }

    const server = servers.servers.find((server) => server.name === message.name);
    if (!server) {
        client.close("Unknown server");
        return;
    }

    if (message.action === "created") server.emit("actionCreated");
    else if (message.action === "removed") server.emit("actionRemoved");
};

export const infos = {
    command: "SERVER_ACTION",
    requiresAuth: true
};
