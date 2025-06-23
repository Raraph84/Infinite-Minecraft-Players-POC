import { Request } from "raraph84-lib";
import Servers from "../../Servers";

export const run = async (request: Request, servers: Servers) => {
    const players = [];
    for (const proxy of servers.proxies)
        for (const player of proxy.players) players.push({ ...player, proxy: proxy.name });

    request.end(200, { players });
};

export const infos = {
    method: "GET",
    path: "/players",
    requiresAuth: false
};
