import { WebSocketClient } from "raraph84-lib";

export const run = async (message: any, client: WebSocketClient) => {
    if (!client.metadata.waitingHeartbeat) {
        client.close("Useless heartbeat");
        return;
    }

    client.metadata.waitingHeartbeat = false;
};

export const infos = {
    command: "HEARTBEAT",
    requiresAuth: true
};
