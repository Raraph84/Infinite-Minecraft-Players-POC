package fr.azrotho.infinite_minecraft_players_poc.proxy_plugin;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

public class Config {

    public static File jsonFile;
    public static String apiHost;
    public static String apiKey;
    public static String proxyName;

    public static void init() {
        jsonFile = InfinityPlugin.getInstance().getDataDirectory().resolve("config.json").toFile();

        try {
            String json = new String(Files.readAllBytes(jsonFile.toPath()));
            JsonObject jsonObject = JsonParser.parseString(json).getAsJsonObject();
            apiHost = jsonObject.get("apiHost").getAsString();
            apiKey = jsonObject.get("apiKey").getAsString();
            proxyName = jsonObject.get("proxyName").getAsString();
        } catch (IOException e) {
            throw new RuntimeException("Could not load config file", e);
        }
    }
}
