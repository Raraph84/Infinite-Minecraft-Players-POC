import { PassThrough, Readable } from "stream";
import EventEmitter from "events";
import Dockerode from "dockerode";

export default class DockerEventListener extends EventEmitter {
    docker: Dockerode;
    state: "disconnected" | "connecting" | "connected" | "disconnecting" = "disconnected";
    #stream: Readable | null = null;

    constructor(docker: Dockerode) {
        super();
        this.docker = docker;
    }

    _setState(state: "disconnected" | "connecting" | "connected" | "disconnecting") {
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

                this.#stream = stream as Readable;

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
                resolve(null);
            });
        });
    }

    disconnect() {
        if (this.state !== "connected") throw new Error("Not connected");
        return new Promise((resolve) => {
            this.#stream!.on("close", () => resolve(null));
            this.#stream!.destroy();
        });
    }
}
