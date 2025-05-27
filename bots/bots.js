const { createBot } = require("mineflayer");

const from = parseInt(process.argv[2]);
const to = parseInt(process.argv[3]);
const delay = parseInt(process.argv[4]);

const host = "172.17.0.1";
const playing = false;
const moving = false;

const spawn = (i) => {
    const username = "Crashtester" + i;

    const bot = createBot({
        username,
        host: host.split(":")[0],
        port: host.split(":")[1] ?? 25565,
        version: "1.12.2",
        checkTimeoutInterval: 5 * 60 * 1000,
        logErrors: false,
        viewDistance: "tiny"
    });

    let moveInterval;
    let playTimeout;

    bot.on("login", () => {
        console.log(`${username} has joined.`);

        if (playing) play();
    });

    bot.on("spawn", () => {
        moveInterval = setInterval(() => {
            bot.setControlState("forward", true);
            bot.setControlState("jump", true);
            bot.look(Math.round(Math.random() * 200 - 100), 0);
        }, 1000);

        if (!moving) {
            setTimeout(() => {
                clearInterval(moveInterval);
                bot.setControlState("forward", false);
                bot.setControlState("jump", false);
                setTimeout(() => {
                    bot.physicsEnabled = false;
                }, 5 * 1000);
            }, 30 * 1000);
        }
    });

    bot.on("end", () => {
        clearInterval(moveInterval);
        clearTimeout(playTimeout);
        setTimeout(() => spawn(i), 5 * 1000);
        console.log(`${username} has disconnected.`);
    });

    bot.on("kicked", (reason) => {
        console.log(`${username} was kicked for : ${reason}`);
    });

    bot.on("error", (error) => {
        console.log(`${username} encountered an error : ${error}`);
    });

    let onLobby = true;
    const play = () =>
        (playTimeout = setTimeout(
            () => {
                if (onLobby) {
                    onLobby = false;
                    bot.chat("/play");
                    console.log(`${username} is playing.`);
                } else {
                    onLobby = true;
                    bot.chat("/lobby");
                    console.log(`${username} is in the lobby.`);
                }

                play();
            },
            Math.round(15 * 1000 + Math.random() * 2 * 60 * 1000)
        ));
};

for (let i = 0; i <= to - from; i++) setTimeout(() => spawn(from + i), i * delay);
