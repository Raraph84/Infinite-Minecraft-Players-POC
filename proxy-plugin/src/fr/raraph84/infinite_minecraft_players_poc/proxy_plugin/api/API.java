package fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.api;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.Config;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.MinecraftInfinitePlayersPOCProxyPlugin;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.utils.HttpRequest;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class API {

    private static final String API_HOST = Config.getApiHost();

    public static List<Servers.Server> getServers() {

        List<Servers.Server> servers = new ArrayList<>();

        HttpRequest req = new HttpRequest(API_HOST + "/servers");
        req.setHeader("Authorization", Config.getApiKey());
        try {
            req.send();
        } catch (IOException error) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl());
            throw new RuntimeException(error);
        }

        JsonObject res = parseJsonResponse(req);

        if (req.getResponseCodeType() != HttpRequest.ResponseCodeType.SUCCESS)
            throw parseErrorMessage(req, res);

        for (JsonElement server : res.get("servers").getAsJsonArray())
            servers.add(new Servers.Server(server.getAsJsonObject()));

        return servers;
    }

    public static String proxyPlayerJoin(UUID uuid, String username) {

        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid.toString());
        body.addProperty("username", username);

        HttpRequest req = new HttpRequest(API_HOST + "/proxy/players");
        req.setMethod("POST");
        req.setHeader("Authorization", Config.getApiKey());
        req.setBody(body);
        try {
            req.send();
        } catch (IOException error) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl());
            throw new RuntimeException(error);
        }

        JsonObject res = parseJsonResponse(req);

        if (req.getResponseCodeType() != HttpRequest.ResponseCodeType.SUCCESS)
            throw parseErrorMessage(req, res, "No server available");

        return res.get("serverName").getAsString();
    }

    public static void proxyPlayerQuit(UUID uuid) {

        HttpRequest req = new HttpRequest(API_HOST + "/proxy/players/" + uuid.toString());
        req.setMethod("DELETE");
        req.setHeader("Authorization", Config.getApiKey());
        try {
            req.send();
        } catch (IOException error) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl());
            throw new RuntimeException(error);
        }

        if (req.getResponseCodeType() != HttpRequest.ResponseCodeType.SUCCESS)
            throw parseErrorMessage(req, parseJsonResponse(req), "This player is already disconnected");
    }

    public static String getGatewayUrl() {
        return API_HOST.replace("http", "ws") + "/gateway";
    }

    private static JsonObject parseJsonResponse(HttpRequest req) {

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject()) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        return req.getJsonResponse().getAsJsonObject();
    }

    private static RuntimeException parseErrorMessage(HttpRequest req, JsonObject res, String... errors) {

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString()) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            return new RuntimeException("API Error");
        }

        for (String error : errors)
            if (res.get("message").getAsString().equals(error))
                throw new RuntimeException(error);

        MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
        return new RuntimeException("API Error");
    }
}
