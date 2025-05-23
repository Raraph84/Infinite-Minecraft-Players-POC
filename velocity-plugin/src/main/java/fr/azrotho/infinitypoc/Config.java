package fr.azrotho.infinitypoc;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

public class Config {

    public static File jsonFile;
    public static String apiHost;
    public static String apiKey;

    public void init() {
        jsonFile = InfinityPlugin.getInstance().getDataDirectory().resolve("config.json").toFile();
        if (!jsonFile.exists()) {
            try {
                jsonFile.createNewFile();
            } catch (IOException e) {
                throw new RuntimeException("Could not create config file", e);
            }
        }

        try {
            String json = new String(Files.readAllBytes(jsonFile.toPath()));
            JsonObject jsonObject = JsonParser.parseString(json).getAsJsonObject();
            apiHost = jsonObject.get("apiHost").getAsString();
            apiKey = jsonObject.get("apiKey").getAsString();
        } catch (IOException e) {
            throw new RuntimeException("Could not load config file", e);
        }
    }
}
