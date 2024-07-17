const { createBot } = require("mineflayer");

const from = parseInt(process.argv[2]);
const to = parseInt(process.argv[3]);
const delay = parseInt(process.argv[4]);

const spawn = (i) => {

    const username = "Crashtester" + i;

    const bot = createBot({
        username,
        host: "127.0.0.1",
        port: 25565,
        version: "1.12.2",
        checkTimeoutInterval: 5 * 60 * 1000
    });

    let moveInterval;
    let playTimeout;

    bot.on("login", () => {

        console.log(`${username} has joined.`);

        moveInterval = setInterval(() => {

            bot.setControlState("forward", true);
            bot.setControlState("jump", true);
            bot.look(Math.round(Math.random() * 200 - 100), 0);

        }, 1000);

        play();
    });

    bot.on("end", () => {
        clearInterval(moveInterval);
        clearTimeout(playTimeout);
        console.log(`${username} has disconnected.`);
    });

    bot.on("kicked", (reason) => {
        console.log(`${username} was kicked for : ${reason}`);
        setTimeout(() => spawn(i), 5 * 1000);
    });

    bot.on("error", (error) => {
        console.log(`${username} encountered an error : ${error}`);
    });

    let onLobby = true;
    const play = () => playTimeout = setTimeout(() => {

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

    }, Math.round(15 * 1000 + Math.random() * 2 * 60 * 1000));
}

for (let i = 0; i <= to - from; i++)
    setTimeout(() => spawn(from + i), i * delay);
