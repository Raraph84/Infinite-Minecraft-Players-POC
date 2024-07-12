package fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.listeners;

import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.api.Servers;
import net.md_5.bungee.api.event.ProxyPingEvent;
import net.md_5.bungee.api.plugin.Listener;
import net.md_5.bungee.event.EventHandler;

public class ProxyPingListener implements Listener {

    @EventHandler
    public void onProxyPing(ProxyPingEvent event) {

        int maxPlayers = 0;
        for (Servers.Server server : Servers.getServers())
            maxPlayers += server.getMaxPlayers();

        event.getResponse().getPlayers().setMax(maxPlayers);
    }
}
