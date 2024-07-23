const { promises: fs, existsSync } = require("fs");
const { TaskManager, WebSocketServer, HttpServer } = require("raraph84-lib");
const path = require("path");
const Dockerode = require("dockerode");
const DockerEventListener = require("./src/DockerEventListener");
const Servers = require("./src/Servers");
const config = require("./config.json");

require("dotenv").config();

const tasks = new TaskManager();

tasks.addTask(async (resolve) => {
    const serversDir = path.resolve(config.serversDir);
    if (!existsSync(serversDir))
        await fs.mkdir(serversDir);
    resolve();
}, (resolve) => resolve());

const docker = new Dockerode();

const dockerEvents = new DockerEventListener(docker);
tasks.addTask(async (resolve) => {
    console.log("Connecting to Docker events...");
    await dockerEvents.connect();
    dockerEvents.on("disconnected", () => {
        console.log("Disconnected from Docker events, exiting.");
        process.exit(1);
    });
    console.log("Connected to Docker events.");
    resolve();
}, (resolve) => { dockerEvents.removeAllListeners("disconnected"); dockerEvents.disconnect().then(() => resolve()); });

const gateway = new WebSocketServer();
tasks.addTask(async (resolve, reject) => {
    console.log("Starting the API...");
    try {
        await require("./src/gateway").start(gateway, servers);
    } catch (error) {
        console.log("Cannot start the gateway - " + error);
        reject();
        return;
    }
    resolve();
}, (resolve) => require("./src/gateway").stop().then(() => resolve()));

const api = new HttpServer();
tasks.addTask(async (resolve, reject) => {
    try {
        await require("./src/api").start(api, gateway, servers);
    } catch (error) {
        console.log("Cannot start the API - " + error);
        reject();
        return;
    }
    console.log("Started the API.");
    resolve();
}, (resolve) => require("./src/api").stop().then(() => resolve()));

const servers = new Servers(docker, dockerEvents, gateway);
tasks.addTask((resolve) => servers.start().then(() => resolve()), (resolve) => resolve());

tasks.run();
