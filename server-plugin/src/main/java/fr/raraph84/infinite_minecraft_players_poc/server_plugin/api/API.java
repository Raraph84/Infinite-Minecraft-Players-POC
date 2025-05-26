package fr.raraph84.infinite_minecraft_players_poc.server_plugin.api;

import com.google.gson.JsonObject;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.Config;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.utils.HttpRequest;

import java.io.IOException;
import java.util.UUID;

public class API {

    public static void serverPlayerJoin(UUID uuid, String username) {

        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid.toString());
        body.addProperty("username", username);

        HttpRequest req = new HttpRequest(Config.getApiHost() + "/servers/" + Config.getServerName() + "/players").setMethod("POST").setBody(body);
        sendNoContentRequest(req);
    }

    public static void serverPlayerQuit(UUID uuid) {

        HttpRequest req = new HttpRequest(Config.getApiHost() + "/servers/" + Config.getServerName() + "/players/" + uuid.toString()).setMethod("DELETE");
        sendNoContentRequest(req);
    }

    public static void connectPlayer(UUID uuid, String serverName) {

        JsonObject body = new JsonObject();
        body.addProperty("serverName", serverName);

        HttpRequest req = new HttpRequest(Config.getApiHost() + "/proxy/players/" + uuid.toString() + "/server").setMethod("PUT").setBody(body);
        sendNoContentRequest(req, "No server available");
    }

    public static String getGatewayUrl() {
        return Config.getApiHost().replace("http", "ws") + "/gateway";
    }

    private static JsonObject sendRequest(HttpRequest req, String... errors) {

        req.setHeader("Authorization", Config.getApiKey());

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

        req.setHeader("Authorization", Config.getApiKey());

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
