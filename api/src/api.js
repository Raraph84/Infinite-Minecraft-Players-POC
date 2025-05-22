const { promises: fs } = require("fs");
const { filterEndpointsByPath } = require("raraph84-lib");
const path = require("path");
const config = require("../config.json");

/**
 * @param {import("raraph84-lib/src/HttpServer")} api
 * @param {import("raraph84-lib/src/WebSocketServer")} gateway
 * @param {import("./Servers")} servers
 */
const start = async (api, gateway, servers) => {
    const endpointsFiles = (await fs.readdir(path.join(__dirname, "endpoints"), { recursive: true }))
        .filter((file) => file.endsWith(".js"))
        .map((command) => require(path.join(__dirname, "endpoints", command)));

    api.handleUpgrade("/gateway", gateway);
    api.on("request", async (/** @type {import("raraph84-lib/src/Request")} */ request) => {
        const endpoints = filterEndpointsByPath(endpointsFiles, request);

        request.setHeader("Access-Control-Allow-Origin", "*");

        if (!endpoints[0]) {
            request.end(404, "Not found");
            return;
        }

        if (request.method === "OPTIONS") {
            request.setHeader(
                "Access-Control-Allow-Methods",
                endpoints.map((endpoint) => endpoint.infos.method).join(",")
            );
            if (request.headers["access-control-request-headers"])
                request.setHeader("Access-Control-Allow-Headers", request.headers["access-control-request-headers"]);
            request.setHeader("Vary", "Access-Control-Request-Headers");
            request.end(204);
            return;
        }

        const endpoint = endpoints.find((endpoint) => endpoint.infos.method === request.method);
        if (!endpoint) {
            request.end(405, "Method not allowed");
            return;
        }

        request.urlParams = endpoint.params;

        if (endpoint.infos.requireLogin && !request.headers.authorization) {
            request.end(401, "Missing authorization");
            return;
        }

        if (request.headers.authorization) {
            if (request.headers.authorization !== process.env.API_KEY) {
                request.end(401, "Invalid token");
                return;
            }

            request.logged = true;
        }

        endpoint.run(request, servers);
    });

    await api.listen(config.port);

    return api;
};

/**
 * @param {import("raraph84-lib/src/HttpServer")} api
 */
const stop = async (api) => {
    await api.close();
};

module.exports = { start, stop };
