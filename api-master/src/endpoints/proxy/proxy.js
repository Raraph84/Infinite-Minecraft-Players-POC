/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("../../Servers")} servers 
 */
module.exports.run = async (request, servers) => {

    request.end(200, servers.proxy.toApiObj(request.logged));
};

module.exports.infos = {
    method: "GET",
    path: "/proxy",
    requireLogin: false
};
