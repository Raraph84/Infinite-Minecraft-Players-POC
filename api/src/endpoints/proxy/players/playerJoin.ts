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

    if (servers.proxy.players.some((player) => player.uuid === request.jsonBody.uuid)) {
        request.end(400, "This player is already connected");
        return;
    }

    const availableLobby = servers.getAvailableLobby(request.jsonBody.uuid);
    if (!availableLobby) {
        request.end(400, "No server available");
        return;
    }

    servers.proxy.playerJoin(request.jsonBody.uuid, request.jsonBody.username);

    request.end(200, { serverName: availableLobby.name });
};

export const infos = {
    method: "POST",
    path: "/proxy/players",
    requiresAuth: true
};
