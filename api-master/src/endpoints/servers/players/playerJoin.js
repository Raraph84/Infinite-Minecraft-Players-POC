const { Lobby } = require("../../../Containers");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("../../../Servers")} servers 
 */
module.exports.run = async (request, servers) => {

    if (!request.jsonBody) {
        request.end(400, "Invalid JSON");
        return;
    }

    if (typeof request.jsonBody.uuid === "undefined") {
        request.end(400, "Missing uuid");
        return;
    }

    if (typeof request.jsonBody.uuid !== "string") {
        request.end(400, "Uuid must be a string");
        return;
    }

    if (typeof request.jsonBody.username === "undefined") {
        request.end(400, "Missing username");
        return;
    }

    if (typeof request.jsonBody.username !== "string") {
        request.end(400, "Username must be a string");
        return;
    }

    const server = servers.servers.find((server) => server.name.toLowerCase() === request.urlParams.serverName.toLowerCase());
    if (!server) {
        request.end(400, "This server does not exist");
        return;
    }

    if (server.players.some((player) => player.uuid === request.jsonBody.uuid && !player.connecting)) {
        request.end(400, "This player is already in this server");
        return;
    }

    if (server instanceof Lobby) {
        const player = server.players.find((player) => player.uuid === request.jsonBody.uuid && player.connecting);
        if (player) server.players.splice(server.players.indexOf(player), 1);
    }

    server.players.push({ uuid: request.jsonBody.uuid, username: request.jsonBody.username });

    request.end(204);
};

module.exports.infos = {
    method: "POST",
    path: "/servers/:serverName/players",
    requireLogin: true
};
