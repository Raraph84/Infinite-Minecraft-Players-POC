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

    const proxy = servers.proxies.find(
        (proxy) => proxy.name.toLowerCase() === request.urlParams.proxyName.toLowerCase()
    );
    if (!proxy) {
        request.end(400, "This proxy does not exist");
        return;
    }

    if (servers.proxies.some((proxy) => proxy.players.some((player) => player.uuid === request.jsonBody.uuid))) {
        request.end(400, "This player is already connected to a proxy");
        return;
    }

    const availableLobby = servers.getAvailableLobby(request.jsonBody.uuid);
    if (!availableLobby) {
        request.end(400, "No server available");
        return;
    }

    proxy.playerJoin(request.jsonBody.uuid, request.jsonBody.username);

    request.end(200, { serverName: availableLobby.name });
};

export const infos = {
    method: "POST",
    path: "/proxies/:proxyName/players",
    requiresAuth: true
};
