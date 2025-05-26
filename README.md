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

Generate a random string of the length that you want (100 is good)  
Fill theses files with the generated key

-   `api/.env` and `node/.env`
-   `proxy/plugins/Infinite-Minecraft-Players-POC-Proxy-Plugin/config.yml`
-   `server-template/plugins/Infinite-Minecraft-Players-POC-Server-Plugin/config.json`

### Step 3 : Install the libs

Install the libs by running

```bash
docker run -it --rm \
--volume ~/infinite-minecraft-players-poc:/home/infinite-minecraft-players-poc \
--workdir /home/infinite-minecraft-players-poc/api \
node npm install --omit=dev
docker run -it --rm \
--volume ~/infinite-minecraft-players-poc:/home/infinite-minecraft-players-poc \
--workdir /home/infinite-minecraft-players-poc/node \
node npm install --omit=dev
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
node index.js
```

### Step 5 : Start the node

Open a terminal and run

```bash
docker run -it --init \
--name node \
--volume ~/infinite-minecraft-players-poc:$HOME/infinite-minecraft-players-poc \
--volume /var/run/docker.sock:/var/run/docker.sock \
--workdir $HOME/infinite-minecraft-players-poc/node \
node index.js
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
And replace it in `proxy/`

You can build Paper with [their buildtools](https://www.spigotmc.org/wiki/buildtools/)  
And replace it in `server-template/` and `server-plugin/libs/`

### Java Websocket

You can build or download the Java websocket lib on [its repository](https://github.com/TooTallNate/Java-WebSocket)
And replace it in `server-plugin/libs/`

### SLF4J

SLF4J API and Simple is required by Java websocket to run without errors on the Spigot (probably already built in BungeeCord)  
You can build the jars on [its repository](https://github.com/qos-ch/slf4j)  
Or download them on mvnrepository : [SLF4J API](https://mvnrepository.com/artifact/org.slf4j/slf4j-api) and [SLF4J Simple](https://mvnrepository.com/artifact/org.slf4j/slf4j-simple)  
And replace them in `server-plugin/libs/`

### Proxy plugin

You can import `proxy-plugin/` into an IDE like IntelliJ as a Maven project
Then run the default Maven goal and replace the jar in `proxy/plugins/` by the one you built in `proxy-plugin/target`

### Server plugin

You can import `server-plugin/` into an IDE like IntelliJ as a Maven project
Then run the default Maven goal and replace the jar in `server-template/plugins/` by the one you built in `server-plugin/target`

### WorldEdit

WorldEdit is not required but useful to have on every server  
You can build WorldEdit on [its repository](https://github.com/EngineHub/WorldEdit)  
Or download it on [its Modrinth page](https://modrinth.com/plugin/worldedit)  
And replace it in `server-template/plugins/`

## TODO

-   Scale proxies
