const child_process = require("child_process");

if (process.argv.length < 5) {
    console.log("Usage: node index.js <count> <delay> <start>");
    process.exit(1);
}

const count = parseInt(process.argv[2]);
const delay = parseInt(process.argv[3]);
const start = parseInt(process.argv[4]);

const spawn = (from, to, delay) => {
    const proc = child_process.spawn("node", ["bots.js", start + from, start + to, delay]);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
};

let procs = [];
let c = 0;
for (let i = 0; i < count; i++) {
    c++;
    if (c >= 10 || i === count - 1) {
        procs.push(c);
        c = 0;
    }
}

for (let i = 0; i < procs.length; i++) setTimeout(() => spawn(i * 10 + 1, i * 10 + procs[i], delay), i * 10 * delay);
