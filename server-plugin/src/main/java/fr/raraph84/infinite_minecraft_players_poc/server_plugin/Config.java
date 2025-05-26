package fr.raraph84.infinite_minecraft_players_poc.server_plugin;

import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;

public class Config {

    private static YamlConfiguration config;

    public static void init() {

        File datafolder = MinecraftInfinitePlayersPOCServerPlugin.getInstance().getDataFolder();
        if (!datafolder.exists() && !datafolder.mkdirs())
            throw new RuntimeException("Data folder could not be created.");

        File configfile = new File(datafolder, "config.yml");
        try {
            if (!configfile.exists() && !configfile.createNewFile())
                throw new RuntimeException("File " + configfile.getName() + " could not be created.");
        } catch (IOException error) {
            throw new RuntimeException(error.getMessage());
        }

        config = YamlConfiguration.loadConfiguration(configfile);
    }

    public static String getServerName() {
        return config.getString("servername");
    }

    public static String getApiHost() {
        return config.getString("apihost");
    }

    public static String getApiKey() {
        return config.getString("apikey");
    }
}
