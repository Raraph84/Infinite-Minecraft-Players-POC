/**
 * @param {object} message
 * @param {import("raraph84-lib/src/WebSocketClient")} client
 */
module.exports.run = async (message, client) => {
    if (!client.infos.waitingHeartbeat) {
        client.close("Useless heartbeat");
        return;
    }

    client.infos.waitingHeartbeat = false;
};

module.exports.infos = {
    command: "HEARTBEAT",
    requireLogin: true
};
