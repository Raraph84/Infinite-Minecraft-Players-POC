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
Copy `config.example.{yml/json}` to `config.{yml/json}` and fill it with the generated key

-   in `proxy/plugins/Infinite-Minecraft-Players-POC-Proxy-Plugin/`
-   and `server-template/plugins/Infinite-Minecraft-Players-POC-Server-Plugin/`

Copy `api/.env.example` to `api/.env` and fill it with the same generated key

### Step 3 : Install the libs

Install the libs by running

```bash
docker run -it --rm \
--volume ~/infinite-minecraft-players-poc:/home/infinite-minecraft-players-poc \
--workdir /home/infinite-minecraft-players-poc/api \
node npm install --omit=dev
```

and

```bash
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
--publish 172.17.0.1:8080:8080 \
node index.js
```

To expose the API, you can remove the `172.17.0.1:` part

### Step 5 : Start the bots

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

### BungeeCord

You can build BungeeCord on [its repository](https://github.com/SpigotMC/BungeeCord)  
Or download it on [its ci](https://ci.md-5.net/job/BungeeCord/)  
And replace it in `proxy/` and `proxy-plugin/libs/`

### Spigot

You can build Spigot with [their buildtools](https://www.spigotmc.org/wiki/buildtools/)  
And replace it in `server-template/` and `server-plugin/libs/`

### Java Websocket

You can build or download the Java websocket lib on [its repository](https://github.com/TooTallNate/Java-WebSocket)  
And replace it in `proxy-plugin/libs/` and `server-plugin/libs/`

### SLF4J

SLF4J API and Simple is required by Java websocket to run without errors on the Spigot (probably already built in BungeeCord)  
You can build the jars on [its repository](https://github.com/qos-ch/slf4j)  
Or download them on mvnrepository : [SLF4J API](https://mvnrepository.com/artifact/org.slf4j/slf4j-api) and [SLF4J Simple](https://mvnrepository.com/artifact/org.slf4j/slf4j-simple)  
And replace them in `server-plugin/libs/`

### Proxy plugin

You can import `proxy-plugin/` into an IDE like IntelliJ as a Maven project :
Then run the default Maven goal and replace the jar in `proxy/plugins/` by the one you built in `proxy-plugins/target`

### Server plugin

You can import `server-plugin/` into an IDE like IntelliJ and import the libs in `server-plugin/libs/` :

-   Spigot jar as provided
-   Java websocket, SLF4J API and Simple as compile

Then build the jar and replace it in `server-template/plugins/`

### Spark

Spark is not required but useful for debugging lag on the proxy or the Spigots  
You can build Spark on [its repository](https://github.com/lucko/spark)  
Or download it on [its website](https://spark.lucko.me/download)  
And replace it in `proxy/plugins/` and `server-template/plugins/`

### WorldEdit

WorldEdit is not required but useful to have on every server  
You can build WeoldEdit on [its repository](https://github.com/EngineHub/WorldEdit)  
Or download it on [its CurseForge Bukkit page](https://dev.bukkit.org/projects/worldedit/files)  
And replace it in `server-template/plugins/`

## TODO

-   Support of multiple nodes
-   Switch to Paper
-   Scale proxies
