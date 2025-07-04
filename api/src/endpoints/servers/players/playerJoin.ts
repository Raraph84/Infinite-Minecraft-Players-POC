import { Request } from "raraph84-lib";
import Servers from "../../../Servers";

export const run = async (request: Request, servers: Servers) => {
    if (!request.jsonBody) {
        request.end(400, "Invalid JSON");
        return;
    }

    if (typeof request.jsonBody.uuid !== "string") {
        request.end(400, "Uuid must be a string");
        return;
    }

    if (typeof request.jsonBody.username !== "string") {
        request.end(400, "Username must be a string");
        return;
    }

    const server = servers.servers.find(
        (server) => server.name.toLowerCase() === request.urlParams.serverName.toLowerCase()
    );
    if (!server) {
        request.end(400, "This server does not exist");
        return;
    }

    if (server.players.some((player) => player.uuid === request.jsonBody.uuid)) {
        request.end(400, "This player is already connected to this server");
        return;
    }

    server.playerJoin(request.jsonBody.uuid, request.jsonBody.username);

    request.end(204);
};

export const infos = {
    method: "POST",
    path: "/servers/:serverName/players",
    requiresAuth: true
};
