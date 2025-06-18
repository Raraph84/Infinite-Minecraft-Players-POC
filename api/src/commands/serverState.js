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

module.exports.infos = {
    command: "SERVER_STATE",
    requiresAuth: true
};
