/**
 * @param {import("raraph84-lib/src/Request")} request
 * @param {import("../../Servers")} servers
 */
module.exports.run = async (request, servers) => {
    request.end(200, { servers: servers.servers.map((server) => server.toApiObj(request.metadata.logged)) });
};

module.exports.infos = {
    method: "GET",
    path: "/servers",
    requiresAuth: false
};
