import { Request } from "raraph84-lib";
import Servers from "../../../Servers";

export const run = async (request: Request, servers: Servers) => {
    const server = servers.servers.find(
        (server) => server.name.toLowerCase() === request.urlParams.serverName.toLowerCase()
    );
    if (!server) {
        request.end(400, "This server does not exist");
        return;
    }

    request.end(200, { players: server.players });
};

export const infos = {
    method: "GET",
    path: "/servers/:serverName/players",
    requiresAuth: false
};
