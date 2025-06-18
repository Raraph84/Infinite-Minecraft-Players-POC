import { Request } from "raraph84-lib";
import Servers from "../../../Servers";

export const run = async (request: Request, servers: Servers) => {
    request.end(200, { players: servers.proxy.players });
};

export const infos = {
    method: "GET",
    path: "/proxy/players",
    requiresAuth: false
};
