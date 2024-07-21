package fr.raraph84.infinite_minecraft_players_poc.server_plugin.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.Config;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.MinecraftInfinitePlayersPOCServerPlugin;
import org.bukkit.scheduler.BukkitTask;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.concurrent.CountDownLatch;

public class Gateway {

    private static Client gateway;
    private static State state = State.DISCONNECTED;
    private static CountDownLatch latch;
    private static BukkitTask reconnectTask;

    public static void connect() {

        if (state != State.DISCONNECTED)
            throw new RuntimeException("The gateway is not disconnected.");
        state = State.CONNECTING;

        MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().info("Connecting to the gateway...");

        latch = new CountDownLatch(1);
        gateway = new Client();

        try {
            gateway.connectBlocking();
            latch.await();
        } catch (InterruptedException error) {
            throw new RuntimeException(error);
        }

        if (state != State.CONNECTED) return;

        MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().info("Connected to the gateway.");
    }

    public static void disconnect() {

        if (state != State.CONNECTED && state != State.RECONNECTING)
            throw new RuntimeException("The gateway is not connected.");

        MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().info("Disconnecting from the gateway...");

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

        MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().info("Disconnected from the gateway.");
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
            message.addProperty("server", Config.getServerName());

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
                    MinecraftInfinitePlayersPOCServerPlugin.getInstance().getServer().getOnlinePlayers().forEach((player) -> API.serverPlayerJoin(player.getUniqueId(), player.getName()));
                    state = State.CONNECTED;
                    latch.countDown();
                    break;

                case "HEARTBEAT":
                    Gateway.send("HEARTBEAT", new JsonObject());
                    break;
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

                MinecraftInfinitePlayersPOCServerPlugin.getInstance().getLogger().info("Disconnected from the gateway, reconnecting in 3 seconds... " + reason + " (" + code + ")");

                reconnectTask = MinecraftInfinitePlayersPOCServerPlugin.getInstance().getServer().getScheduler().runTaskLater(MinecraftInfinitePlayersPOCServerPlugin.getInstance(), () -> {
                    state = State.DISCONNECTED;
                    Gateway.connect();
                }, 3 * 20);

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
