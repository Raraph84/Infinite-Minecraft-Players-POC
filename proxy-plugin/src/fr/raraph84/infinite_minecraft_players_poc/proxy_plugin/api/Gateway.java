package fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.Config;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.MinecraftInfinitePlayersPOCProxyPlugin;
import net.md_5.bungee.api.scheduler.ScheduledTask;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class Gateway {

    private static Client gateway;
    private static State state = State.DISCONNECTED;
    private static CountDownLatch latch;
    private static ScheduledTask reconnectTask;

    public static void connect() {

        if (state != State.DISCONNECTED)
            throw new RuntimeException("The gateway is not disconnected.");
        state = State.CONNECTING;

        MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().info("Connecting to the gateway...");

        latch = new CountDownLatch(1);
        gateway = new Client();

        try {
            gateway.connectBlocking();
            latch.await();
        } catch (InterruptedException error) {
            throw new RuntimeException(error);
        }

        if (state != State.CONNECTED) return;

        MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().info("Connected to the gateway.");
    }

    public static void disconnect() {

        if (state != State.CONNECTED && state != State.RECONNECTING)
            throw new RuntimeException("The gateway is not connected.");

        MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().info("Disconnecting from the gateway...");

        if (state == State.RECONNECTING) {
            reconnectTask.cancel();
        } else {
            state = State.DISCONNECTING;
            try {
                gateway.closeBlocking();
            } catch (InterruptedException exception) {
                throw new RuntimeException(exception);
            }
        }

        MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().info("Disconnected from the gateway.");
    }

    public static void send(String command, JsonObject json) {

        if (state != State.CONNECTED)
            throw new RuntimeException("The gateway is not connected.");

        json.addProperty("command", command);

        gateway.send(new GsonBuilder().disableHtmlEscaping().serializeNulls().create().toJson(json));
    }

    public static class Client extends WebSocketClient {

        public Client() {
            super(URI.create(API.getGatewayUrl()));
        }

        @Override
        public void onOpen(ServerHandshake serverHandshake) {

            JsonObject message = new JsonObject();
            message.addProperty("token", Config.getApiKey());
            message.addProperty("server", "proxy");

            state = State.CONNECTED;
            Gateway.send("LOGIN", message);
            state = State.CONNECTING;
        }

        @Override
        public void onMessage(String data) {

            JsonObject message = new Gson().fromJson(data, JsonObject.class);
            String event = message.get("event").getAsString();

            switch (event) {

                case "LOGGED":
                    state = State.CONNECTED;
                    latch.countDown();
                    break;
                case "HEARTBEAT":
                    Gateway.send("HEARTBEAT", new JsonObject());
                    break;

                case "SERVER_CREATED":
                    Servers.onServerAdded(new Servers.Server(message));
                    break;

                case "SERVER_REMOVED":
                case "SERVER_STATE":
                case "SERVER_GATEWAY_CONNECTED":
                case "SERVER_GATEWAY_DISCONNECTED":
                    Servers.Server server = Servers.getServer(message.get("name").getAsString());
                    switch (event) {
                        case "SERVER_REMOVED":
                            Servers.onServerRemoved(server);
                            break;
                        case "SERVER_STATE":
                            server.setState(Servers.ServerState.valueOf(message.get("state").getAsString().toUpperCase()));
                            break;
                        case "SERVER_GATEWAY_CONNECTED":
                            server.setGatewayConnected(true);
                            break;
                        case "SERVER_GATEWAY_DISCONNECTED":
                            server.setGatewayConnected(false);
                            break;
                    }
            }
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {

            if (state == State.CONNECTED || state == State.CONNECTING) {

                if (state == State.CONNECTING) {
                    state = State.RECONNECTING;
                    latch.countDown();
                } else
                    state = State.RECONNECTING;

                MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getLogger().info("Disconnected from the gateway, reconnecting in 3 seconds... " + reason + " (" + code + ")");

                reconnectTask = MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getProxy().getScheduler().schedule(MinecraftInfinitePlayersPOCProxyPlugin.getInstance(), () -> {
                    state = State.DISCONNECTED;
                    Gateway.connect();
                }, 3, TimeUnit.SECONDS);

            } else if (state == State.DISCONNECTING)
                state = State.DISCONNECTED;
            else
                throw new RuntimeException("Gateway closed in an unexpected state " + state + ".");
        }

        @Override
        public void onError(Exception exception) {
        }
    }

    enum State {
        DISCONNECTED, CONNECTING, CONNECTED, DISCONNECTING, RECONNECTING
    }
}
