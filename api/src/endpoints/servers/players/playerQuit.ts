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

    const player = server.players.find((player) => player.uuid === request.urlParams.playerUuid);
    if (!player) {
        request.end(400, "This player is already disconnected from this server");
        return;
    }

    server.playerQuit(player.uuid);

    request.end(204);
};

export const infos = {
    method: "DELETE",
    path: "/servers/:serverName/players/:playerUuid",
    requiresAuth: true
};
