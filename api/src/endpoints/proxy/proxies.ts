import { Request } from "raraph84-lib";
import Servers from "../../Servers";

export const run = async (request: Request, servers: Servers) => {
    request.end(200, { servers: servers.proxies.map((proxy) => proxy.toApiObj(request.metadata.logged)) });
};

export const infos = {
    method: "GET",
    path: "/proxies",
    requiresAuth: false
};
