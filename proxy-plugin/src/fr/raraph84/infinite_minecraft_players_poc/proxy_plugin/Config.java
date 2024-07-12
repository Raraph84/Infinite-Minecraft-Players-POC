package fr.raraph84.infinite_minecraft_players_poc.proxy_plugin;

import net.md_5.bungee.config.Configuration;
import net.md_5.bungee.config.ConfigurationProvider;
import net.md_5.bungee.config.YamlConfiguration;

import java.io.File;
import java.io.IOException;

public class Config {

    private static Configuration config;

    public static void init() {

        File datafolder = MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getDataFolder();
        if (!datafolder.exists() && !datafolder.mkdirs())
            throw new RuntimeException("Data folder could not be created.");

        File configfile = new File(datafolder, "config.yml");
        try {
            if (!configfile.exists() && !configfile.createNewFile())
                throw new RuntimeException("File " + configfile.getName() + " could not be created.");
        } catch (IOException error) {
            throw new RuntimeException(error.getMessage());
        }

        try {
            config = ConfigurationProvider.getProvider(YamlConfiguration.class).load(configfile);
        } catch (IOException exception) {
            throw new RuntimeException(exception);
        }
    }

    public static String getApiHost() {
        return config.getString("apihost");
    }

    public static String getApiKey() {
        return config.getString("apikey");
    }
}
