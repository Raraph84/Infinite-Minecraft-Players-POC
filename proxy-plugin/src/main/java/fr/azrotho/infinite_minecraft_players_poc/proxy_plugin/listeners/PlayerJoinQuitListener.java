package fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.listeners;

import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.connection.DisconnectEvent;
import com.velocitypowered.api.event.player.PlayerChooseInitialServerEvent;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.InfinityPlugin;
import fr.azrotho.infinite_minecraft_players_poc.proxy_plugin.api.API;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;

public class PlayerJoinQuitListener {
    @Subscribe
    public void onPlayerJoin(PlayerChooseInitialServerEvent event) {
        String server;
        try {
            server = API.proxyPlayerJoin(event.getPlayer().getUniqueId(), event.getPlayer().getUsername());
        } catch (RuntimeException exception) {
            // TODO Handle already connected (@azrotho pls)
            if (exception.getMessage().equals("No server available")) {
                event.getPlayer().disconnect(Component.text("There is no server available at the moment, please try again later.").color(TextColor.color(0x801818)));
                return;
            }
            event.getPlayer().disconnect(Component.text("An error occurred, please try again later.").color(TextColor.color(0x801818)));
            throw exception;
        }

        event.setInitialServer(InfinityPlugin.getInstance().getServer().getServer(server).orElse(null));
    }

    @Subscribe
    public void onPlayerDisconnect(DisconnectEvent event) {
        try {
            API.proxyPlayerQuit(event.getPlayer().getUniqueId());
        } catch (RuntimeException exception) {
            if (!exception.getMessage().equals("This player is already disconnected")) throw exception;
        }
    }
}
