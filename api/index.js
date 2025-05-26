const { WebSocketServer, HttpServer } = require("raraph84-lib");
const Dockerode = require("dockerode");
const DockerEventListener = require("./src/DockerEventListener");
const Node = require("./src/Node");
const Servers = require("./src/Servers");
const config = require("./config.json");

require("dotenv").config();

(async () => {
    const docker = new Dockerode();

    await new Promise(async (resolve) => {
        console.log("Pulling openjdk:21 Docker image...");
        docker.modem.followProgress(await docker.pull("openjdk:21"), (error) => {
            if (error) console.log("Cannot pull openjdk:21 Docker image - " + error);
            else {
                console.log("Pulled openjdk:21 Docker image.");
                resolve();
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

    const nodes = [];
    const servers = new Servers(docker, dockerEvents, gateway, nodes);
    config.nodes.forEach((node) => nodes.push(new Node(node.name, node.host, node.maxMemory, gateway, servers)));

    console.log("Starting the API...");
    try {
        await require("./src/api").start(api, gateway, servers);
        await require("./src/gateway").start(gateway, servers);
    } catch (error) {
        console.log("Cannot start the API/gateway - " + error);
        return;
    }
    console.log("Started the API.");

    servers.start();
})();
