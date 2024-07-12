const { Lobby } = require("../../../Containers");
const config = require("../../../../config.json");

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

    if (servers.proxy.players.some((player) => player.uuid === request.jsonBody.uuid)) {
        request.end(400, "This player is already on the proxy");
        return;
    }

    const availableLobbies = servers.servers.filter((server) => server instanceof Lobby && server.gatewayClient);
    let availableLobby = availableLobbies.find((server) => server.players.length < config.lobbyPlayers);
    if (!availableLobby) {
        availableLobbies.sort((a, b) => a.players.length - b.players.length);
        availableLobby = availableLobbies.find((server) => server.players.length < config.lobbyMaxPlayers);
    }

    if (!availableLobby) {
        request.end(400, "No server available");
        return;
    }

    servers.proxy.players.push({ uuid: request.jsonBody.uuid, username: request.jsonBody.username })

    availableLobby.players.push({ uuid: request.jsonBody.uuid, username: request.jsonBody.username, connecting: true });
    setTimeout(() => {
        const player = availableLobby.players.find((player) => player.uuid === request.jsonBody.uuid && player.connecting);
        if (player) availableLobby.players.splice(availableLobby.players.indexOf(player), 1);
    }, 5 * 1000);

    console.log("Connecting player", request.jsonBody.username, "to", availableLobby.name);

    request.end(200, {
        server: availableLobby.name
    });
};

module.exports.infos = {
    method: "POST",
    path: "/proxy/players",
    requireLogin: true
};
