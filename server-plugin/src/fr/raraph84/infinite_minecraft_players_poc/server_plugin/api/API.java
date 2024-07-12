package fr.raraph84.infinite_minecraft_players_poc.server_plugin.api;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.Config;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.MinecraftInfinitePlayersPOCServerPlugin;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.utils.HttpRequest;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class API {

    private static final String API_HOST = Config.getApiHost();

    public static List<Server> getServers() {

        List<Server> servers = new ArrayList<>();

        HttpRequest req = new HttpRequest(API_HOST + "/servers");
        req.setHeader("Authorization", Config.getApiKey());
        try {
            req.send();
        } catch (IOException error) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl());
            throw new RuntimeException(error);
        }

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject()) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        JsonObject res = req.getJsonResponse().getAsJsonObject();

        if (req.getResponseCodeType() == HttpRequest.ResponseCodeType.SUCCESS) {

            if (!res.has("servers") || !res.get("servers").isJsonArray()) {
                MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
                throw new RuntimeException("API Error");
            }

            for (JsonElement serverElement : res.get("servers").getAsJsonArray()) {

                if (serverElement == null || !serverElement.isJsonObject()) {
                    MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
                    throw new RuntimeException("API Error");
                }

                if (!serverElement.getAsJsonObject().has("name") || !serverElement.getAsJsonObject().getAsJsonPrimitive("name").isString()
                        || !serverElement.getAsJsonObject().has("port") || !serverElement.getAsJsonObject().getAsJsonPrimitive("port").isNumber()) {
                    MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
                    throw new RuntimeException("API Error");
                }

                servers.add(new Server(serverElement.getAsJsonObject().get("name").getAsString(), serverElement.getAsJsonObject().get("port").getAsInt()));
            }

            return servers;
        }

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString()) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
        throw new RuntimeException("API Error");
    }

    public static void serverPlayerJoin(UUID uuid, String username) {

        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid.toString());
        body.addProperty("username", username);

        HttpRequest req = new HttpRequest(API_HOST + "/servers/" + Config.getServerName() + "/players");
        req.setMethod("POST");
        req.setHeader("Authorization", Config.getApiKey());
        req.setBody(body);
        try {
            req.send();
        } catch (IOException error) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl());
            throw new RuntimeException(error);
        }

        if (req.getResponseCodeType() == HttpRequest.ResponseCodeType.SUCCESS)
            return;

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject()) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        JsonObject res = req.getJsonResponse().getAsJsonObject();

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString()) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
        throw new RuntimeException("API Error");
    }

    public static void serverPlayerQuit(UUID uuid) {

        HttpRequest req = new HttpRequest(API_HOST + "/servers/" + Config.getServerName() + "/players/" + uuid.toString());
        req.setMethod("DELETE");
        req.setHeader("Authorization", Config.getApiKey());
        try {
            req.send();
        } catch (IOException error) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl());
            throw new RuntimeException(error);
        }

        if (req.getResponseCodeType() == HttpRequest.ResponseCodeType.SUCCESS)
            return;

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject()) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        JsonObject res = req.getJsonResponse().getAsJsonObject();

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString()) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
        throw new RuntimeException("API Error");
    }

    public static String getGatewayUrl() {
        return API_HOST.replace("http", "ws") + "/gateway";
    }

    public static class Server {

        private final String name;
        private final int port;

        public Server(String name, int port) {
            this.name = name;
            this.port = port;
        }

        public String getName() {
            return name;
        }

        public int getPort() {
            return port;
        }
    }
}
