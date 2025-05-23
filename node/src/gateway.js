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
        ws.sendCommand = (command, message = {}) => ws.send(JSON.stringify({ command, ...message }));

        ws.on("open", () => {
            ws.sendCommand("LOGIN", {
                token: process.env.API_KEY,
                type: "node",
                node: config.nodeName
            });
        });

        ws.on("close", (code, reason) => {
            if (connected) console.log("Disconnected from the gateway, reconnecting...", code, reason.toString());
            lastWs = null;
            lastHeartbeat = -1;
            connected = false;
            setTimeout(connect, 5000);
        });

        ws.on("error", () => {});

        ws.on("message", (data) => {
            let message;
            try {
                message = JSON.parse(data);
            } catch (error) {
                return;
            }

            const event = message.event;
            delete message.event;

            if (event === "LOGGED") {
                lastWs = ws;
                lastHeartbeat = Date.now();
                connected = true;
                console.log("Connected to the gateway !");
            } else if (event === "HEARTBEAT") {
                lastHeartbeat = Date.now();
                ws.sendCommand("HEARTBEAT");
            }
        });
    };

    setInterval(() => {
        if (lastHeartbeat >= 0 && Date.now() - lastHeartbeat > (30 + 10) * 1000) lastWs.terminate();
    }, 5000);

    console.log("Connecting to the gateway...");
    connect();
};
