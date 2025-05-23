const EventEmitter = require("events");

class Node extends EventEmitter {
    /**
     * @param {string} name
     * @param {import("raraph84-lib/src/WebSocketServer")} gateway
     */
    constructor(name, gateway) {
        super();

        this.name = name;
        this.gateway = gateway;

        /** @type {import("raraph84-lib/src/WebSocketClient")} */
        this.gatewayClient = null;
    }

    /**
     * @param {import("raraph84-lib/src/WebSocketClient")} client
     */
    gatewayConnected(client) {
        if (this.gatewayClient) this.gatewayClient.close("Another client is already connected");
        this.gatewayClient = client;
        this.emit("gatewayConnected");
        this.gateway.clients
            .filter((client) => client.infos.logged)
            .forEach((client) => client.emitEvent("NODE_GATEWAY_CONNECTED", { name: this.name }));
        console.log("Node " + this.name + " connected to the gateway.");
    }

    gatewayDisconnected() {
        if (!this.gatewayClient) throw new Error("No client connected");
        while (this.players.length > 0) this.playerQuit(this.players[0].uuid);
        this.gatewayClient = null;
        this.emit("gatewayDisconnected");
        this.gateway.clients
            .filter((client) => client.infos.logged)
            .forEach((client) => client.emitEvent("NODE_GATEWAY_DISCONNECTED", { name: this.name }));
        console.log("Node " + this.name + " disconnected from the gateway.");
    }
}

module.exports = Node;
