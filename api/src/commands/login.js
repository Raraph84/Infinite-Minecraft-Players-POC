/**
 * @param {object} message
 * @param {import("raraph84-lib/src/WebSocketClient")} client
 * @param {import("../Servers")} servers
 */
module.exports.run = async (message, client, servers) => {
    if (client.infos.logged) {
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

    if (message.type !== "server" && message.type !== "proxy") {
        client.close("Type must be server or proxy");
        return;
    }

    if (message.type === "server") {
        if (typeof message.server !== "string") {
            client.close("Server must be a string");
            return;
        }

        const server = servers.servers.find((server) => server.name === message.server);
        if (!server) {
            client.close("Unknown server");
            return;
        }

        client.infos.serverName = server.name;
        server.gatewayConnected(client);
    } else if (message.type === "proxy") {
        servers.proxy.gatewayConnected(client);
    }

    client.infos.type = message.type;
    client.infos.logged = true;
    client.emitEvent("LOGGED");
};

module.exports.infos = {
    command: "LOGIN",
    requireLogin: false
};
