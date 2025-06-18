/**
 * @param {object} message
 * @param {import("raraph84-lib/src/WebSocketClient")} client
 */
module.exports.run = async (message, client) => {
    if (!client.metadata.waitingHeartbeat) {
        client.close("Useless heartbeat");
        return;
    }

    client.metadata.waitingHeartbeat = false;
};

module.exports.infos = {
    command: "HEARTBEAT",
    requiresAuth: true
};
