/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("../../../Servers")} servers 
 */
module.exports.run = async (request, servers) => {

    const server = servers.servers.find((server) => server.name.toLowerCase() === request.urlParams.serverName.toLowerCase());
    if (!server) {
        request.end(400, "This server does not exist");
        return;
    }

    request.end(200, { players: server.players });
};

module.exports.infos = {
    method: "GET",
    path: "/servers/:serverName/players",
    requireLogin: false
};
