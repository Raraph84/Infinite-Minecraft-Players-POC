package fr.azrotho.infinite_minecraft_players_poc.proxy_plugin;

import com.google.inject.Inject;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.event.proxy.ProxyShutdownEvent;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.plugin.annotation.DataDirectory;
import com.velocitypowered.api.proxy.ProxyServer;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.api.Gateway;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.api.Servers;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.listeners.PlayerJoinQuitListener;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.listeners.ProxyPingListener;

import java.nio.file.Path;
import java.util.logging.Logger;

@Plugin(id = "infinite-minecraft-players-poc-proxy-plugin", name = "Infinite-Minecraft-Players-POC-Proxy-Plugin", version = "1.0-SNAPSHOT", authors = {"Azrotho"}, url = "https://github.com/Raraph84/Infinite-Minecraft-Players-POC")

public class InfinityPlugin {
    private final ProxyServer server;
    private final Logger logger;
    private final Path dataDirectory;
    private static InfinityPlugin instance;

    @Inject
    public InfinityPlugin(ProxyServer server, Logger logger, @DataDirectory Path dataDirectory) {
        this.server = server;
        this.logger = logger;
        this.dataDirectory = dataDirectory;
        instance = this;
    }

    @Subscribe
    public void onProxyInitialized(ProxyInitializeEvent event) {
        Config.init();
        Servers.init();
        Gateway.connect();

        server.getEventManager().register(this, new PlayerJoinQuitListener());
        server.getEventManager().register(this, new ProxyPingListener());
        logger.info(getServer().getPluginManager().fromInstance(this).get().getDescription().getName().get() + " loaded successfully!");
    }

    @Subscribe
    public void onProxyShutdown(ProxyShutdownEvent event) {
        Gateway.disconnect();
        logger.info(getServer().getPluginManager().fromInstance(this).get().getDescription().getName().get() + " unloaded successfully!");
    }

    public static InfinityPlugin getInstance() {
        return instance;
    }

    public ProxyServer getServer() {
        return server;
    }

    public Logger getLogger() {
        return logger;
    }

    public Path getDataDirectory() {
        return dataDirectory;
    }
}
