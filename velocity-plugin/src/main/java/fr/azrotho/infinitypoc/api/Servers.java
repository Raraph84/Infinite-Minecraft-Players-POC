package fr.azrotho.infinitypoc.api;

import com.google.gson.JsonObject;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.proxy.server.ServerInfo;
import fr.azrotho.infinitypoc.InfinityPlugin;

import java.net.InetSocketAddress;
import java.util.List;

public class Servers {
    private static List<Server> servers;

    public static void init() {

        servers = API.getServers();

        ProxyServer proxy = InfinityPlugin.getInstance().getServer();

        proxy.getAllServers().clear();
        Servers.getServers().forEach((server) -> proxy.getAllServers().add(proxy.registerServer(new ServerInfo(server.getName(), new InetSocketAddress("172.17.0.1", server.getPort())))));
    }

    public static Server getServer(String name) {
        return servers.stream().filter((server) -> server.getName().equals(name)).findFirst().orElse(null);
    }

    public static List<Server> getServers() {
        return servers;
    }

    public static void onServerAdded(Server server) {

        if (getServer(server.getName()) != null)
            throw new RuntimeException("This server already exists");

        servers.add(server);

        ProxyServer proxy = InfinityPlugin.getInstance().getServer();
        proxy.getAllServers().add(proxy.registerServer(new ServerInfo(server.getName(), new InetSocketAddress("172.17.0.1", server.getPort()))));
    }

    public static void onServerRemoved(Server server) {

        if (getServer(server.getName()) == null)
            throw new RuntimeException("This server does not exist");

        ProxyServer proxy = InfinityPlugin.getInstance().getServer();
        proxy.getAllServers().removeIf((serverInfo) -> serverInfo.getServerInfo().getName().equals(server.getName()));

        servers.remove(server);
    }

    public static class Server {

        private final String name;
        private final int port;
        private final int maxPlayers;

        public Server(JsonObject server) {
            this.name = server.getAsJsonPrimitive("name").getAsString();
            this.port = server.getAsJsonPrimitive("port").getAsInt();
            this.maxPlayers = server.getAsJsonPrimitive("maxPlayers").getAsInt();
        }

        public String getName() {
            return name;
        }

        public int getPort() {
            return port;
        }

        public int getMaxPlayers() {
            return maxPlayers;
        }
    }
}
