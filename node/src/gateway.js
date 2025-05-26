const Ws = require("ws");
const config = require("../config.json");

/** @type {import("ws")} */
let lastWs = null;
module.exports.getLastWs = () => lastWs;

/**
 * @param {import("./Servers")} servers
 */
module.exports.init = async (servers) => {
    let lastHeartbeat = -1;
    let connected = false;

    const connect = () => {
        const ws = new Ws("ws://" + config.apiHost + "/gateway", { handshakeTimeout: 5000 });
        ws.sendCommand = (command, message = {}) => {
            //console.log("->", { command, ...message });
            ws.send(JSON.stringify({ command, ...message }));
        };

        ws.on("open", () => {
            lastWs = ws;
            ws.sendCommand("LOGIN", {
                token: process.env.API_KEY,
                type: "node",
                node: config.nodeName
            });
        });

        ws.on("close", async (code, reason) => {
            if (connected) console.log("Disconnected from the gateway, reconnecting...", code, reason.toString());
            await servers.clearServers();
            lastWs = null;
            lastHeartbeat = -1;
            connected = false;
            setTimeout(connect, 3000);
        });

        ws.on("error", () => {});

        ws.on("message", (data) => {
            let message;
            try {
                message = JSON.parse(data);
            } catch (error) {
                return;
            }

            //console.log("<-", message);

            const event = message.event;
            delete message.event;

            if (event === "LOGGED") {
                lastHeartbeat = Date.now();
                connected = true;
                console.log("Connected to the gateway !");
            } else if (event === "HEARTBEAT") {
                lastHeartbeat = Date.now();
                ws.sendCommand("HEARTBEAT");
            } else if (event === "SERVER_ACTION") {
                if (message.action === "create") {
                    if (message.type === "lobby") servers.startLobbyServer(message.id, message.port);
                    else if (message.type === "game") servers.startGameServer(message.id, message.port);
                } else if (message.action === "remove") {
                    const server = servers.servers.find((s) => s.name === message.name);
                    servers.removeServer(server);
                }
            }
        });
    };

    setInterval(() => {
        if (lastHeartbeat >= 0 && Date.now() - lastHeartbeat > (30 + 10) * 1000) lastWs.terminate();
    }, 5000);

    console.log("Connecting to the gateway...");
    connect();
};
