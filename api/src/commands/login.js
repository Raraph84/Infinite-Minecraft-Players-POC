/**
 * @param {object} message 
 * @param {import("raraph84-lib/src/WebSocketClient")} client 
 * @param {import("../Servers")} servers 
 */
module.exports.run = async (message, client, servers) => {

    if (typeof message.token === "undefined") {
        client.close("Missing token");
        return;
    }

    if (typeof message.token !== "string") {
        client.close("Token must be a string");
        return;
    }

    if (typeof message.server === "undefined") {
        client.close("Missing server");
        return;
    }

    if (typeof message.server !== "string" && typeof message.server !== null) {
        client.close("Server must be a string or null");
        return;
    }

    if (client.infos.logged) {
        client.close("Already logged");
        return;
    }

    if (message.token !== process.env.API_KEY) {
        client.close("Invalid token");
        return;
    }

    if (typeof message.server === "string") {

        let server;
        if (message.server === servers.proxy.name) server = servers.proxy;
        else server = servers.servers.find((server) => server.name === message.server);

        if (!server) {
            client.close("Unknown server");
            return;
        }

        if (server.gatewayClient)
            server.gatewayClient.close("Connected from another client");

        client.infos.serverName = server.name;
        server.gatewayConnected(client);
    }

    client.infos.logged = true;
    client.emitEvent("LOGGED");
};

module.exports.infos = {
    command: "LOGIN",
    requireLogin: false
};
