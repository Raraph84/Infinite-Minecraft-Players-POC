package fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.api;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.Config;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.utils.HttpRequest;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class API {

    public static List<Servers.Server> getServers() {

        HttpRequest req = new HttpRequest(Config.apiHost + "/servers");
        JsonObject res = sendRequest(req);

        List<Servers.Server> servers = new ArrayList<>();
        for (JsonElement server : res.get("servers").getAsJsonArray())
            servers.add(new Servers.Server(server.getAsJsonObject()));

        return servers;
    }

    public static String proxyPlayerJoin(UUID uuid, String username) {

        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid.toString());
        body.addProperty("username", username);

        HttpRequest req = new HttpRequest(Config.apiHost + "/proxies/" + Config.proxyName + "/players").setMethod("POST").setBody(body);
        JsonObject res = sendRequest(req, "No server available");

        return res.get("serverName").getAsString();
    }

    public static void proxyPlayerQuit(UUID uuid) {

        HttpRequest req = new HttpRequest(Config.apiHost + "/proxies/" + Config.proxyName + "/players/" + uuid.toString()).setMethod("DELETE");
        sendNoContentRequest(req, "This player is already disconnected");
    }

    public static String getGatewayUrl() {
        return Config.apiHost.replace("http", "ws") + "/gateway";
    }

    private static JsonObject sendRequest(HttpRequest req, String... errors) {

        req.setHeader("Authorization", Config.apiKey);

        try {
            req.send();
        } catch (IOException error) {
            throw new RuntimeException("API Error - " + req.getUrl(), error);
        }

        JsonObject res = parseJsonResponse(req);

        if (req.getResponseCodeType() != HttpRequest.ResponseCodeType.SUCCESS)
            throw parseErrorMessage(req, res, errors);

        return res;
    }

    private static void sendNoContentRequest(HttpRequest req, String... errors) {

        req.setHeader("Authorization", Config.apiKey);

        try {
            req.send();
        } catch (IOException error) {
            throw new RuntimeException("API Error - " + req.getUrl(), error);
        }

        if (req.getResponseCodeType() != HttpRequest.ResponseCodeType.SUCCESS)
            throw parseErrorMessage(req, parseJsonResponse(req), errors);
    }

    private static JsonObject parseJsonResponse(HttpRequest req) {

        if (req.getJsonResponse() == null || !req.getJsonResponse().isJsonObject())
            throw new RuntimeException("API Error - " + req.getUrl() + " - " + req.getResponseCode());

        return req.getJsonResponse().getAsJsonObject();
    }

    private static RuntimeException parseErrorMessage(HttpRequest req, JsonObject res, String... errors) {

        if (!res.has("message") || !res.get("message").isJsonPrimitive() || !res.get("message").getAsJsonPrimitive().isString())
            return new RuntimeException("API Error - " + req.getUrl() + " - " + req.getResponseCode());

        for (String error : errors)
            if (res.get("message").getAsString().equals(error))
                throw new RuntimeException(error);

        return new RuntimeException("API Error - " + req.getUrl() + " - " + req.getResponseCode() + " " + res.get("message").getAsString());
    }
}
