package fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.velocitypowered.api.proxy.Player;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.proxy.server.RegisteredServer;
import com.velocitypowered.api.scheduler.ScheduledTask;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.Config;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.InfinityPlugin;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;
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

        InfinityPlugin.getInstance().getLogger().info("Connecting to the gateway...");

        latch = new CountDownLatch(1);
        gateway = new Client();

        try {
            gateway.connectBlocking();
            latch.await();
        } catch (InterruptedException error) {
            throw new RuntimeException(error);
        }

        if (state != State.CONNECTED) return;

        InfinityPlugin.getInstance().getLogger().info("Connected to the gateway.");
    }

    public static void disconnect() {

        if (state != State.CONNECTED && state != State.RECONNECTING)
            throw new RuntimeException("The gateway is not connected.");

        InfinityPlugin.getInstance().getLogger().info("Disconnecting from the gateway...");

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

        InfinityPlugin.getInstance().getLogger().info("Disconnected from the gateway.");
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
            message.addProperty("token", Config.apiKey);
            message.addProperty("type", "proxy");
            message.addProperty("proxy", Config.proxyName);

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
                    InfinityPlugin.getInstance().getServer().getAllPlayers().forEach(player -> API.proxyPlayerJoin(player.getUniqueId(), player.getUsername()));
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
                    Servers.onServerRemoved(Servers.getServer(message.get("name").getAsString()));
                    break;

                case "CONNECT_PLAYER": {

                    UUID playerUuid = UUID.fromString(message.get("playerUuid").getAsString());
                    String serverName = message.get("serverName").getAsString();

                    ProxyServer proxy = InfinityPlugin.getInstance().getServer();
                    Optional<Player> Oplayer = proxy.getPlayer(playerUuid);
                    if (Oplayer.isEmpty()) {
                        throw new RuntimeException("Player " + playerUuid + " not found.");
                    }
                    Player player = Oplayer.get();
                    Optional<RegisteredServer> oserver = proxy.getServer(serverName);
                    if (oserver.isEmpty()) {
                        throw new RuntimeException("Server " + serverName + " not found.");
                    }
                    RegisteredServer server = oserver.get();

                    player.createConnectionRequest(server).fireAndForget();
                    break;
                }
                case "PLAYER_COUNT": {
                    int count = message.get("count").getAsInt();
                    InfinityPlugin.getInstance().setConnectedPlayerCount(count);
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

                InfinityPlugin.getInstance().getLogger().info("Disconnected from the gateway, reconnecting in 3 seconds... " + reason + " (" + code + ")");

                reconnectTask = InfinityPlugin.getInstance().getServer().getScheduler().buildTask(InfinityPlugin.getInstance(), () -> {
                        state = State.DISCONNECTED;
                        Gateway.connect();
                    })
                    .delay(3L, TimeUnit.SECONDS)
                    .schedule();

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
