import { Request } from "raraph84-lib";
import Servers from "../../Servers";

export const run = async (request: Request, servers: Servers) => {
    const proxy = servers.proxies.find(
        (proxy) => proxy.name.toLowerCase() === request.urlParams.proxyName.toLowerCase()
    );
    if (!proxy) {
        request.end(400, "This proxy does not exist");
        return;
    }

    request.end(200, proxy.toApiObj(request.metadata.logged));
};

export const infos = {
    method: "GET",
    path: "/proxies/:proxyName",
    requiresAuth: false
};
