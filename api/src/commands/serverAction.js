/**
 * @param {object} message
 * @param {import("raraph84-lib/src/WebSocketClient")} client
 * @param {import("../Servers")} servers
 */
module.exports.run = async (message, client, servers) => {
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

module.exports.infos = {
    command: "SERVER_ACTION",
    requiresAuth: true
};
