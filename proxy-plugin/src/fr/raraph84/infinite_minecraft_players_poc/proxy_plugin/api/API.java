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

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject()) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        JsonObject res = req.getJsonResponse().getAsJsonObject();

        if (req.getResponseCodeType() == HttpRequest.ResponseCodeType.SUCCESS) {

            if (!res.has("servers") || !res.get("servers").isJsonArray()) {
                MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
                throw new RuntimeException("API Error");
            }

            for (JsonElement serverElement : res.get("servers").getAsJsonArray()) {

                if (serverElement == null || !serverElement.isJsonObject()) {
                    MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
                    throw new RuntimeException("API Error");
                }

                servers.add(new Servers.Server(serverElement.getAsJsonObject()));
            }

            return servers;
        }

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString()) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
        throw new RuntimeException("API Error");
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

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject()) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        JsonObject res = req.getJsonResponse().getAsJsonObject();

        if (req.getResponseCodeType() == HttpRequest.ResponseCodeType.SUCCESS) {

            if (!res.has("server") || !res.get("server").isJsonPrimitive() || !res.get("server").getAsJsonPrimitive().isString()) {
                MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
                throw new RuntimeException("API Error");
            }

            return res.get("server").getAsString();
        }

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString()) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        if (res.get("message").getAsString().equals("No server available"))
            throw new RuntimeException("No server available");

        MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
        throw new RuntimeException("API Error");
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

        if (req.getResponseCodeType() == HttpRequest.ResponseCodeType.SUCCESS)
            return;

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject()) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        JsonObject res = req.getJsonResponse().getAsJsonObject();

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString()) {
            MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode());
            throw new RuntimeException("API Error");
        }

        if (res.get("message").getAsString().equals("This player is not on the proxy"))
            throw new RuntimeException("This player is not on the proxy");

        MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().severe("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
        throw new RuntimeException("API Error");
    }

    public static String getGatewayUrl() {
        return API_HOST.replace("http", "ws") + "/gateway";
    }
}
