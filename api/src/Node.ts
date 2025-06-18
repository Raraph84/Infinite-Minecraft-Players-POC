import { WebSocketClient, WebSocketServer } from "raraph84-lib";
import EventEmitter from "events";
import Servers from "./Servers";

export default class Node extends EventEmitter {
    name;
    host;
    maxMemory;
    gateway;
    servers;
    gatewayClient: WebSocketClient | null = null;

    constructor(name: string, host: string, maxMemory: number, gateway: WebSocketServer, servers: Servers) {
        super();

        this.name = name;
        this.host = host;
        this.maxMemory = maxMemory;
        this.gateway = gateway;
        this.servers = servers;
    }

    gatewayConnected(client: WebSocketClient) {
        if (this.gatewayClient) this.gatewayClient.close("Another client is already connected");
        this.gatewayClient = client;
        this.emit("gatewayConnected");
        this.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("NODE_GATEWAY_CONNECTED", { name: this.name }));
        console.log("Node " + this.name + " connected to the gateway.");

        for (const server of this.servers.servers) {
            if (server.node.name !== this.name) continue;
            client.emitEvent("SERVER_ACTION", { action: "create", ...server.toApiObj(true) });
        }
    }

    gatewayDisconnected() {
        if (!this.gatewayClient) throw new Error("No client connected");
        this.gatewayClient = null;
        this.emit("gatewayDisconnected");
        this.gateway.clients
            .filter((client) => client.metadata.logged)
            .forEach((client) => client.emitEvent("NODE_GATEWAY_DISCONNECTED", { name: this.name }));
        console.log("Node " + this.name + " disconnected from the gateway.");
    }
}
