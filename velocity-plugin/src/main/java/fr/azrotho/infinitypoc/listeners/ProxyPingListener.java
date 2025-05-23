package fr.azrotho.infinitypoc.listeners;

import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyPingEvent;
import com.velocitypowered.api.proxy.server.ServerPing;
import fr.azrotho.infinitypoc.api.Servers;

public class ProxyPingListener {
    @Subscribe
    public void onProxyPing(ProxyPingEvent event) {
        int maxPlayers = 0;
        for (Servers.Server server : Servers.getServers()) {
            maxPlayers += server.getMaxPlayers();
        }

        ServerPing originalPing = event.getPing();
        ServerPing.Builder builder = ServerPing.builder();
        builder.maximumPlayers(maxPlayers);

        event.setPing(builder.build());
    }
}
