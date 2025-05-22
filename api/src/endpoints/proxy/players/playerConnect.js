const { Lobby, Game } = require("../../../Containers");

/**
 * @param {import("raraph84-lib/src/Request")} request
 * @param {import("../../../Servers")} servers
 */
module.exports.run = async (request, servers) => {
    if (!request.jsonBody) {
        request.end(400, "Invalid JSON");
        return;
    }

    const player = servers.proxy.players.find((player) => player.uuid === request.urlParams.playerUuid);
    if (!player) {
        request.end(400, "This player is not connected");
        return;
    }

    if (typeof request.jsonBody.serverName === "undefined") {
        request.end(400, "Missing server name");
        return;
    }

    if (typeof request.jsonBody.serverName !== "string") {
        request.end(400, "Server name must be a string");
        return;
    }

    let server;
    if (request.jsonBody.serverName === "lobby") {
        if (
            servers.servers.some(
                (server) => server instanceof Lobby && server.players.some((p) => p.uuid === player.uuid)
            )
        ) {
            request.end(400, "This player is already connected to this server");
            return;
        }

        server = servers.getAvailableLobby(player.uuid);
        if (!server) {
            request.end(400, "No server available");
            return;
        }
    } else if (request.jsonBody.serverName === "game") {
        if (
            servers.servers.some(
                (server) => server instanceof Game && server.players.some((p) => p.uuid === player.uuid)
            )
        ) {
            request.end(400, "This player is already connected to this server");
            return;
        }

        server = servers.getAvailableGame(player.uuid);
        if (!server) {
            request.end(400, "No server available");
            return;
        }
    } else {
        server = servers.servers.find((server) => server.name === request.jsonBody.serverName);
        if (!server) {
            request.end(400, "This server does not exist");
            return;
        }

        if (server.players.some((p) => p.uuid === player.uuid)) {
            request.end(400, "This player is already connected to this server");
            return;
        }
    }

    if (!servers.proxy.gatewayClient) {
        request.end(502, "Proxy is not connected to the gateway");
        return;
    }

    servers.proxy.gatewayClient.emitEvent("CONNECT_PLAYER", { playerUuid: player.uuid, serverName: server.name });

    request.end(204);
};

module.exports.infos = {
    method: "PUT",
    path: "/proxy/players/:playerUuid/server",
    requireLogin: true
};
