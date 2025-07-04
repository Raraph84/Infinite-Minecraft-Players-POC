import { Request } from "raraph84-lib";
import Servers from "../../Servers";

export const run = async (request: Request, servers: Servers) => {
    request.end(200, servers.proxy.toApiObj(request.metadata.logged));
};

export const infos = {
    method: "GET",
    path: "/proxy",
    requiresAuth: false
};
