const { PassThrough } = require("stream");
const EventEmitter = require("events");

module.exports = class DockerEventListener extends EventEmitter {
    #stream = null;

    /**
     * @param {import("dockerode")} docker
     */
    constructor(docker) {
        super();

        this.docker = docker;

        /** @type {"disconnected"|"connecting"|"connected"|"disconnecting"} */
        this.state = "disconnected";
    }

    _setState(state) {
        this.state = state;
        this.emit(state);
    }

    connect() {
        if (this.state !== "disconnected") throw new Error("Not disconnected");
        this._setState("connecting");

        return new Promise((resolve, reject) => {
            this.docker.getEvents((error, stream) => {
                if (error) {
                    this._setState("disconnected");
                    reject(error);
                    return;
                }

                this.#stream = stream;

                const parser = new PassThrough();
                parser.on("data", (data) => {
                    let event;
                    try {
                        event = JSON.parse(data.toString());
                    } catch {
                        return;
                    }

                    this.emit("rawEvent", event);
                });

                this.#stream.on("close", () => {
                    parser.end();
                    this.#stream = null;
                    this._setState("disconnected");
                });

                this.#stream.pipe(parser);
                this._setState("connected");
                resolve();
            });
        });
    }

    disconnect() {
        if (this.state !== "connected") throw new Error("Not connected");
        return new Promise((resolve) => {
            this.#stream.on("close", () => resolve());
            this.#stream.destroy();
        });
    }
};
