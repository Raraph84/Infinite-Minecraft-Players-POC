package fr.raraph84.infinite_minecraft_players_poc.server_plugin;

import fr.raraph84.infinite_minecraft_players_poc.server_plugin.api.Gateway;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.listeners.PlayerJoinQuitListener;
import org.bukkit.plugin.java.JavaPlugin;

public class MinecraftInfinitePlayersPOCServerPlugin extends JavaPlugin {

    private static MinecraftInfinitePlayersPOCServerPlugin instance;

    @Override
    public void onEnable() {

        instance = this;

        Config.init();
        Gateway.connect();

        getServer().getPluginManager().registerEvents(new PlayerJoinQuitListener(), this);

        getLogger().info(getName() + " successfully enabled.");
    }

    @Override
    public void onDisable() {

        Gateway.disconnect();

        getLogger().info(getName() + " successfully disabled.");
    }

    public static MinecraftInfinitePlayersPOCServerPlugin getInstance() {
        return instance;
    }
}
