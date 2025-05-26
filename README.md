# Infinite Minecraft Players POC

A proof of concept of a Minecraft infrastructure that can handle an infinite amount of players  
This is not new, Hypixel (and others) have probably already done it

## Installation

### Prerequisites :

-   A Linux server
-   [Docker](https://docs.docker.com/engine/install/) installed

The installation can be run with any user, but the same for each step, and will create files as root  
The installation will be in the `~/infinite-minecraft-players-poc/` dir

### Step 1 : Clone the repository

Clone the repository with `alpine/git` Docker image by running

```bash
docker run -it --rm \
--volume ~:/git \
alpine/git clone https://github.com/Raraph84/Infinite-Minecraft-Players-POC.git infinite-minecraft-players-poc/
```

### Step 2 : Set the API key

Generate a random string of the length of your choice (100 is good) and replace `exampleapikey` to the one you generated in theses files :

-   `api/.env` and `node/.env`
-   `proxy/plugins/infinite-minecraft-players-poc-proxy-plugin/config.json`
-   `server-template/plugins/Infinite-Minecraft-Players-POC-Server-Plugin/config.yml`

### Step 3 : Install the libs and compile

Install the libs and compile by running

```bash
docker run -it --rm \
--volume ~/infinite-minecraft-players-poc:/home/infinite-minecraft-players-poc \
--workdir /home/infinite-minecraft-players-poc/api \
node bash -c "npm install --omit=dev && npm run build"
docker run -it --rm \
--volume ~/infinite-minecraft-players-poc:/home/infinite-minecraft-players-poc \
--workdir /home/infinite-minecraft-players-poc/node \
node bash -c "npm install --omit=dev && npm run build"
docker run -it --rm \
--volume ~/infinite-minecraft-players-poc:/home/infinite-minecraft-players-poc \
--workdir /home/infinite-minecraft-players-poc/bots \
node npm install --omit=dev
```

### Step 4 : Start the API

Open a terminal and run

```bash
docker run -it --init \
--name api \
--volume ~/infinite-minecraft-players-poc:$HOME/infinite-minecraft-players-poc \
--volume /var/run/docker.sock:/var/run/docker.sock \
--workdir $HOME/infinite-minecraft-players-poc/api \
--publish 8080:8080 \
node npm start
```

### Step 5 : Start the node

Open a terminal and run

```bash
docker run -it --init \
--name node \
--volume ~/infinite-minecraft-players-poc:$HOME/infinite-minecraft-players-poc \
--volume /var/run/docker.sock:/var/run/docker.sock \
--workdir $HOME/infinite-minecraft-players-poc/node \
node npm start
```

### Step 6 : Start the bots

Open a terminal and run

```bash
docker run -it --rm --init \
--volume ~/infinite-minecraft-players-poc:/home/infinite-minecraft-players-poc \
--workdir /home/infinite-minecraft-players-poc/bots \
node index.js <player count> <delay between each player join> <first player number>
```

For example, for 100 bots with 1 second delay between each join, run

```bash
docker run -it --rm --init \
--volume ~/infinite-minecraft-players-poc:/home/infinite-minecraft-players-poc \
--workdir /home/infinite-minecraft-players-poc/bots \
node index.js 100 1000 0
```

## Compiling jars

### Velocity

You can build Velocity from [its repository](https://github.com/PaperMC/Velocity)  
Or download it from [its website](https://papermc.io/downloads/velocity)  
And replace it in `proxy/`

### Paper

You can build Paper from [its repository](https://github.com/PaperMC/Paper)  
Or download it from [its website](https://papermc.io/downloads/paper)  
And replace it in `server-template/`

### Proxy plugin

You can import `proxy-plugin/` into an IDE like IntelliJ as a Maven project  
Then run the default Maven goal and the jar will be built in `proxy/plugins/`

### Server plugin

You can import `server-plugin/` into an IDE like IntelliJ as a Maven project  
Then run the default Maven goal and the jar will be built in `server-template/plugins/`

### WorldEdit

WorldEdit is not required but useful to have on every server  
You can build WorldEdit on [its repository](https://github.com/EngineHub/WorldEdit)  
Or download it on [its Modrinth page](https://modrinth.com/plugin/worldedit)  
And replace it in `server-template/plugins/`

## TODO

-   Scale proxies
