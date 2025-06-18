/**
 * @param {import("raraph84-lib/src/Request")} request
 * @param {import("../../../Servers")} servers
 */
module.exports.run = async (request, servers) => {
    const server = servers.servers.find(
        (server) => server.name.toLowerCase() === request.urlParams.serverName.toLowerCase()
    );
    if (!server) {
        request.end(400, "This server does not exist");
        return;
    }

    const player = server.players.find((player) => player.uuid === request.urlParams.playerUuid);
    if (!player) {
        request.end(400, "This player is already disconnected from this server");
        return;
    }

    server.playerQuit(player.uuid);

    request.end(204);
};

module.exports.infos = {
    method: "DELETE",
    path: "/servers/:serverName/players/:playerUuid",
    requiresAuth: true
};
