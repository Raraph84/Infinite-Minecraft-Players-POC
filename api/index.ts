import { HttpServer, WebSocketServer } from "raraph84-lib";
import Servers from "./src/Servers";
import Node from "./src/Node";
import Api from "./src/api";
import Gateway from "./src/gateway";

const config = require("./config.json");

require("dotenv").config();

(async () => {
    const api = new HttpServer();
    const gateway = new WebSocketServer();

    const nodes: Node[] = [];
    const servers = new Servers(gateway, nodes);
    config.nodes.forEach((node: any) => nodes.push(new Node(node.name, node.host, node.maxMemory, gateway, servers)));

    console.log("Starting the API...");
    try {
        await Api.start(api, gateway, servers);
        await Gateway.start(gateway, servers);
    } catch (error) {
        console.log("Cannot start the API/gateway - " + error);
        return;
    }
    console.log("Started the API.");

    servers.start();
})();
