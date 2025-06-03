package fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.listeners;

import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyPingEvent;
import com.velocitypowered.api.proxy.server.ServerPing;

import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.InfinityPlugin;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.api.Servers;

public class ProxyPingListener {
    @Subscribe
    public void onProxyPing(ProxyPingEvent event) {
        int maxPlayers = 0;
        for (Servers.Server server : Servers.getServers())
            maxPlayers += server.getMaxPlayers();

        ServerPing.Builder builder = event.getPing().asBuilder();
        builder.maximumPlayers(maxPlayers);
        builder.onlinePlayers(InfinityPlugin.getNbPlayerConnected());

        event.setPing(builder.build());
    }
}
