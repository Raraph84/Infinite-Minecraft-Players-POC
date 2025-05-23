package fr.azrotho.infinitypoc;

import com.google.inject.Inject;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.event.proxy.ProxyShutdownEvent;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.plugin.PluginContainer;
import com.velocitypowered.api.plugin.annotation.DataDirectory;
import com.velocitypowered.api.proxy.ProxyServer;
import fr.azrotho.infinitypoc.api.Gateway;
import fr.azrotho.infinitypoc.api.Servers;
import fr.azrotho.infinitypoc.listeners.PlayerJoinQuitListener;
import fr.azrotho.infinitypoc.listeners.ProxyPingListener;

import java.nio.file.Path;
import java.util.logging.Logger;

@Plugin(id= "infinitypoc", name= "InfinityPoc", version = "1.0-SNAPSHOT", description = "uwu", authors = {"Azrotho"}, url = "https://azrotho.fr")

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
        logger.info("Plugin loaded successfully!");
    }

    @Subscribe
    public void onProxyShutdown(ProxyShutdownEvent event) {
        Gateway.disconnect();
        logger.info("Plugin unloaded successfully!");
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
