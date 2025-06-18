import { Request } from "raraph84-lib";
import Servers from "../../../Servers";

export const run = async (request: Request, servers: Servers) => {
    const player = servers.proxy.players.find((player) => player.uuid === request.urlParams.playerUuid);
    if (!player) {
        request.end(400, "This player is already disconnected");
        return;
    }

    servers.proxy.playerQuit(player.uuid);

    request.end(204);
};

export const infos = {
    method: "DELETE",
    path: "/proxy/players/:playerUuid",
    requiresAuth: true
};
