package fr.raraph84.infinite_minecraft_players_poc.server_plugin.api;

import com.google.gson.JsonObject;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.Config;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.MinecraftInfinitePlayersPOCServerPlugin;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.utils.HttpRequest;

import java.io.IOException;
import java.util.UUID;

public class API {

    private static final String API_HOST = Config.getApiHost();

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

        if (req.getResponseCodeType() != HttpRequest.ResponseCodeType.SUCCESS)
            throw parseErrorMessage(req, parseJsonResponse(req));
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

        if (req.getResponseCodeType() != HttpRequest.ResponseCodeType.SUCCESS)
            throw parseErrorMessage(req, parseJsonResponse(req));
    }

    public static void connectPlayer(UUID uuid, String serverName) {

        JsonObject body = new JsonObject();
        body.addProperty("serverName", serverName);

        HttpRequest req = new HttpRequest(API_HOST + "/proxy/players/" + uuid.toString() + "/server");
        req.setMethod("PUT");
        req.setHeader("Authorization", Config.getApiKey());
        req.setBody(body);
        try {
            req.send();
        } catch (IOException error) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl());
            throw new RuntimeException(error);
        }

        if (req.getResponseCodeType() != HttpRequest.ResponseCodeType.SUCCESS)
            throw parseErrorMessage(req, parseJsonResponse(req), "No server available");
    }

    public static String getGatewayUrl() {
        return API_HOST.replace("http", "ws") + "/gateway";
    }

    private static JsonObject parseJsonResponse(HttpRequest req) {

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject()) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        return req.getJsonResponse().getAsJsonObject();
    }

    private static RuntimeException parseErrorMessage(HttpRequest req, JsonObject res, String... errors) {

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString()) {
            MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            return new RuntimeException("API Error");
        }

        for (String error : errors)
            if (res.get("message").getAsString().equals(error))
                throw new RuntimeException(error);

        MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
        return new RuntimeException("API Error");
    }
}
