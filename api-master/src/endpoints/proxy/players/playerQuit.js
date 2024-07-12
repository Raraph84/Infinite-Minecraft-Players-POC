/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("../../../Servers")} servers 
 */
module.exports.run = async (request, servers) => {

    const player = servers.proxy.players.find((player) => player.uuid === request.urlParams.playerUuid);
    if (!player) {
        request.end(400, "This player is not on the proxy");
        return;
    }

    servers.proxy.players.splice(servers.proxy.players.indexOf(player), 1);

    request.end(204);
};

module.exports.infos = {
    method: "DELETE",
    path: "/proxy/players/:playerUuid",
    requireLogin: true
};
