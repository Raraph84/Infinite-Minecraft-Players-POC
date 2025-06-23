import { Request } from "raraph84-lib";
import { Game, Lobby } from "../../Containers";
import Servers from "../../Servers";

export const run = async (request: Request, servers: Servers) => {
    const proxy = servers.proxies.find((proxy) =>
        proxy.players.find((player) => player.uuid === request.urlParams.playerUuid)
    );
    if (!proxy) {
        request.end(400, "This player is not connected");
        return;
    }

    const player = proxy.players.find((player) => player.uuid === request.urlParams.playerUuid)!;

    if (typeof request.jsonBody.serverName !== "string") {
        request.end(400, "Server name must be a string");
        return;
    }

    let server;
    if (request.jsonBody.serverName === "lobby") {
        if (
            servers.servers.some(
                (server) => server instanceof Lobby && server.players.some((p) => p.uuid === player.uuid)
            )
        ) {
            request.end(400, "This player is already connected to this server");
            return;
        }

        server = servers.getAvailableLobby(player.uuid);
        if (!server) {
            request.end(400, "No server available");
            return;
        }
    } else if (request.jsonBody.serverName === "game") {
        if (
            servers.servers.some(
                (server) => server instanceof Game && server.players.some((p) => p.uuid === player.uuid)
            )
        ) {
            request.end(400, "This player is already connected to this server");
            return;
        }

        server = servers.getAvailableGame(player.uuid);
        if (!server) {
            request.end(400, "No server available");
            return;
        }
    } else {
        server = servers.servers.find((server) => server.name === request.jsonBody.serverName);
        if (!server) {
            request.end(400, "This server does not exist");
            return;
        }

        if (server.players.some((p) => p.uuid === player.uuid)) {
            request.end(400, "This player is already connected to this server");
            return;
        }
    }

    if (!proxy.gatewayClient) {
        request.end(502, "Proxy is not connected to the gateway");
        return;
    }

    proxy.gatewayClient.emitEvent("CONNECT_PLAYER", { playerUuid: player.uuid, serverName: server.name });

    request.end(204);
};

export const infos = {
    method: "PUT",
    path: "/players/:playerUuid/server",
    requiresAuth: true
};
