package fr.raraph84.infinite_minecraft_players_poc.server_plugin.utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class HttpRequest {

    private final String url;
    private String method = "GET";
    private final Map<String, String> headers = new HashMap<>();
    private JsonElement body;
    private String response;
    private int responseCode;

    public HttpRequest(String url) {
        this.url = url;
    }

    public String getUrl() {
        return url;
    }

    public HttpRequest setMethod(String method) {
        this.method = method;
        return this;
    }

    public HttpRequest setHeader(String key, String value) {
        headers.put(key, value);
        return this;
    }

    public HttpRequest setBody(JsonElement body) {
        this.body = body;
        return this;
    }

    public void send() throws IOException {

        HttpURLConnection con = (HttpURLConnection) new URL(url.replaceAll(" ", "%20")).openConnection();
        con.setRequestMethod(method);
        headers.forEach(con::setRequestProperty);

        if (body != null) {
            String message = new GsonBuilder().disableHtmlEscaping().serializeNulls().create().toJson(body);
            con.setRequestProperty("Content-Type", "application/json");
            con.setDoOutput(true);
            con.getOutputStream().write(message.getBytes(StandardCharsets.UTF_8));
        }

        responseCode = con.getResponseCode();

        Reader streamReader = new InputStreamReader(con.getErrorStream() != null ? con.getErrorStream() : con.getInputStream(), StandardCharsets.UTF_8);
        BufferedReader in = new BufferedReader(streamReader);

        String inputLine;
        StringBuilder data = new StringBuilder();
        while ((inputLine = in.readLine()) != null) data.append(inputLine);
        in.close();
        con.disconnect();

        response = data.toString();
    }

    public int getResponseCode() {
        return responseCode;
    }

    public ResponseCodeType getResponseCodeType() {
        return ResponseCodeType.fromCode(responseCode);
    }

    public String getResponse() {
        return response;
    }

    public JsonElement getJsonResponse() {
        try {
            return new Gson().fromJson(response, JsonElement.class);
        } catch (Exception error) {
            return null;
        }
    }

    public enum ResponseCodeType {

        INFORMATION("1"),

        SUCCESS("2"),

        REDIRECT("3"),

        CLIENT_ERROR("4"),

        SERVER_ERROR("5");

        private final String startWith;

        ResponseCodeType(String startWith) {
            this.startWith = startWith;
        }

        private static ResponseCodeType fromCode(int code) {
            return Arrays.stream(values()).filter((responseCodeType) -> Integer.toString(code).startsWith(responseCodeType.startWith)).findFirst().orElse(null);
        }
    }
}
