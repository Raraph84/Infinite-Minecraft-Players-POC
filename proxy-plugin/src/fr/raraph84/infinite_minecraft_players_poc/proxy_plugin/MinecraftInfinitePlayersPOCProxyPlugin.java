package fr.raraph84.infinite_minecraft_players_poc.proxy_plugin;

import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.api.Gateway;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.api.Servers;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.commands.HelpBungeeCommand;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.listeners.PlayerJoinQuitListener;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.listeners.ProxyPingListener;
import net.md_5.bungee.api.plugin.Plugin;

public class MinecraftInfinitePlayersPOCProxyPlugin extends Plugin {

    private static MinecraftInfinitePlayersPOCProxyPlugin instance;

    @Override
    public void onEnable() {

        instance = this;

        Config.init();
        Servers.init();
        Gateway.connect();

        getProxy().getPluginManager().registerListener(this, new PlayerJoinQuitListener());
        getProxy().getPluginManager().registerListener(this, new ProxyPingListener());

        getProxy().getPluginManager().registerCommand(this, new HelpBungeeCommand());

        getLogger().info(getDescription().getName() + " successfully enabled.");
    }

    @Override
    public void onDisable() {

        Gateway.disconnect();

        getLogger().info(getDescription().getName() + " successfully disabled.");
    }

    public static MinecraftInfinitePlayersPOCProxyPlugin getInstance() {
        return instance;
    }
}
