/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("../../../Servers")} servers 
 */
module.exports.run = async (request, servers) => {

    request.end(200, { players: servers.proxy.players });
};

module.exports.infos = {
    method: "GET",
    path: "/proxy/players",
    requireLogin: false
};
