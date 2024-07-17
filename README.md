# Infinite Minecraft Players POC

A proof of concept of a Minecraft infrastructure that can handle an infinite amount of players  
This is not new, Hypixel (and others) have probably already done it

## Installation

### Prerequisites :
- A Linux server
- Installed [Docker](https://docs.docker.com/engine/install/)
- Installed [NodeJS](https://nodejs.org/en/download/package-manager)
- Installed git (for cloning the repo)

### Step 1 : Cloning the repo
Run `git clone https://github.com/Raraph84/Infinite-Minecraft-Players-POC ~/infinite-minecraft-players-poc`

### Step 2 : Set the API key
Generate a random string of the length that you want (100 is good)  
Copy `config.example.yml` to `config.yml` and fill it with the generated key
- in `proxy/plugins/Infinite-Minecraft-Players-POC-Proxy-Plugin/`
- and `server-template/plugins/Infinite-Minecraft-Players-POC-Server-Plugin/`

Copy `api-master/.env.example` to `api-master/.env` and fill it with the same generated key

### Step 3 : Install libs
Go to `api-master/` and run `npm install --omit=dev` to avoid useless packages  
Go to `bots/` and run `npm install --omit=dev` for the same reason

### Step 4 : Pull Java Docker image
Run `docker pull openjdk:8`

### Step 5 : Start the API and the bots
Open a terminal and go to `api-master/`, then run `node index.js`  
Open another terminal and go to `bots/`, then run `node index.js <player count> <delay between each player join>`  
For example, if I want 100 bots with 1 second delay between each join, I can run `node index.js 100 1000`

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
You can import `proxy-plugin/` into an IDE like IntelliJ and import the libs in `proxy-plugin/libs/` :  
- BungeeCord jar as provided
- Java websocket as compile

Then build the jar and replace it in `proxy/plugins/`

### Server plugin
You can import `server-plugin/` into an IDE like IntelliJ and import the libs in `server-plugin/libs/` :  
- Spigot jar as provided
- Java websocket, SLF4J API and Simple as compile

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

- Save state on api restart
- Scale proxies
- Support of multiple nodes
