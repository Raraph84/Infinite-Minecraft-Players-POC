const EventEmitter = require("events");

class Node extends EventEmitter {
    /**
     * @param {string} name
     * @param {string} host
     * @param {number} maxMemory
     * @param {import("raraph84-lib/src/WebSocketServer")} gateway
     * @param {import("./Servers")} servers
     */
    constructor(name, host, maxMemory, gateway, servers) {
        super();

        this.name = name;
        this.host = host;
        this.maxMemory = maxMemory;
        this.gateway = gateway;
        this.servers = servers;

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

        for (const server of this.servers.servers) {
            if (server.node.name !== this.name) continue;
            client.emitEvent("SERVER_ACTION", { action: "create", ...server.toApiObj(true) });
        }
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
