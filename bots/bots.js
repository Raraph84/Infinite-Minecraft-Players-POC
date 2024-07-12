const { createBot } = require("mineflayer");

const from = parseInt(process.argv[2]);
const to = parseInt(process.argv[3]);
const delay = parseInt(process.argv[4]);

const spawn = (i) => {

    const username = "Crashtester" + i;

    const bot = createBot({
        username,
        host: "raraph.fr",
        port: 25566,
        version: "1.12.2",
        checkTimeoutInterval: 5 * 60 * 1000
    });

    let moveInterval;

    bot.on("login", () => {

        console.log(`${username} has joined.`);

        moveInterval = setInterval(() => {

            bot.setControlState("forward", true);
            bot.setControlState("jump", true);
            bot.look(Math.round(Math.random() * 200 - 100), 0);

        }, 1000);
    });

    bot.on("end", () => {
        clearInterval(moveInterval);
        console.log(`${username} has disconnected.`);
    });

    bot.on("kicked", (reason) => {
        console.log(`${username} was kicked for :`, reason);
    });

    bot.on("error", (error) => {
        console.log(`${username} encountered an error :`, error);
    });
}

for (let i = 0; i <= to - from; i++)
    setTimeout(() => spawn(from + i), i * delay);
