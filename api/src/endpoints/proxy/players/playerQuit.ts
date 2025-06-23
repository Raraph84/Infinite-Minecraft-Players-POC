import { Request } from "raraph84-lib";
import Servers from "../../../Servers";

export const run = async (request: Request, servers: Servers) => {
    const proxy = servers.proxies.find(
        (proxy) => proxy.name.toLowerCase() === request.urlParams.proxyName.toLowerCase()
    );
    if (!proxy) {
        request.end(400, "This proxy does not exist");
        return;
    }

    const player = proxy.players.find((player) => player.uuid === request.urlParams.playerUuid);
    if (!player) {
        request.end(400, "This player is already disconnected");
        return;
    }

    proxy.playerQuit(player.uuid);

    request.end(204);
};

export const infos = {
    method: "DELETE",
    path: "/proxies/:proxyName/players/:playerUuid",
    requiresAuth: true
};
