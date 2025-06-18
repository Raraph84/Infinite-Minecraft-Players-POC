import { HttpServer, WebSocketServer } from "raraph84-lib";
import Dockerode from "dockerode";
import DockerEventListener from "./src/DockerEventListener";
import Servers from "./src/Servers";
import Node from "./src/Node";
import Api from "./src/api";
import Gateway from "./src/gateway";

const config = require("./config.json");

require("dotenv").config();

(async () => {
    const docker = new Dockerode();

    await new Promise(async (resolve) => {
        console.log("Pulling openjdk:21 Docker image...");
        docker.modem.followProgress(await docker.pull("openjdk:21"), (error: any) => {
            if (error) console.log("Cannot pull openjdk:21 Docker image - " + error);
            else {
                console.log("Pulled openjdk:21 Docker image.");
                resolve(null);
            }
        });
    });

    const dockerEvents = new DockerEventListener(docker);
    dockerEvents.on("disconnected", () => {
        console.log("Disconnected from Docker events, exiting.");
        process.exit(1);
    });

    console.log("Connecting to Docker events...");
    await dockerEvents.connect();
    console.log("Connected to Docker events.");

    const api = new HttpServer();
    const gateway = new WebSocketServer();

    const nodes: Node[] = [];
    const servers = new Servers(docker, dockerEvents, gateway, nodes);
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
