package fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.listeners;

import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.MinecraftInfinitePlayersPOCProxyPlugin;
import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.api.API;
import net.md_5.bungee.api.chat.TextComponent;
import net.md_5.bungee.api.event.PlayerDisconnectEvent;
import net.md_5.bungee.api.event.PostLoginEvent;
import net.md_5.bungee.api.plugin.Listener;
import net.md_5.bungee.event.EventHandler;

public class PlayerJoinQuitListener implements Listener {

    @EventHandler
    public void onPostLogin(PostLoginEvent event) {

        String server;
        try {
            server = API.proxyPlayerJoin(event.getPlayer().getUniqueId(), event.getPlayer().getName());
        } catch (RuntimeException exception) {
            if (exception.getMessage().equals("No server available")) {
                event.getPlayer().disconnect(new TextComponent("§cThere is no server available at the moment, please try again later."));
                return;
            }
            event.getPlayer().disconnect(new TextComponent("§cAn error occurred, please try again later."));
            throw exception;
        }

        event.setTarget(MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getProxy().getServerInfo(server));
    }

    @EventHandler
    public void onPlayerDisconnect(PlayerDisconnectEvent event) {

        try {
            API.proxyPlayerQuit(event.getPlayer().getUniqueId());
        } catch (RuntimeException exception) {
            if (!exception.getMessage().equals("This player is already disconnected"))
                throw exception;
        }
    }
}
