import { Request } from "raraph84-lib";
import Servers from "../../Servers";

export const run = async (request: Request, servers: Servers) => {
    request.end(200, { servers: servers.servers.map((server) => server.toApiObj(request.metadata.logged)) });
};

export const infos = {
    method: "GET",
    path: "/servers",
    requiresAuth: false
};
