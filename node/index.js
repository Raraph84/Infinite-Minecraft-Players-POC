const { promises: fs, existsSync } = require("fs");
const path = require("path");
const Dockerode = require("dockerode");
const DockerEventListener = require("./src/DockerEventListener");
const Servers = require("./src/Servers");
const config = require("./config.json");

require("dotenv").config();

(async () => {
    const serversDir = path.resolve(config.serversDir);
    if (!existsSync(serversDir)) await fs.mkdir(serversDir);

    const docker = new Dockerode();

    await new Promise(async (resolve) => {
        console.log("Pulling openjdk:8 Docker image...");
        docker.modem.followProgress(await docker.pull("openjdk:8"), (error) => {
            if (error) console.log("Cannot pull openjdk:8 Docker image - " + error);
            else {
                console.log("Pulled openjdk:8 Docker image.");
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

    const servers = new Servers(docker, dockerEvents);

    require("./src/gateway").init(servers);
})();
