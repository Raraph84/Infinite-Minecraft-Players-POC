package fr.raraph84.infinite_minecraft_players_poc.server_plugin.listeners;

import fr.raraph84.infinite_minecraft_players_poc.server_plugin.api.API;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerLoginEvent;
import org.bukkit.event.player.PlayerQuitEvent;

public class PlayerJoinQuitListener implements Listener {

    @EventHandler
    public void onPlayerLogin(PlayerLoginEvent event) {

        if (event.getResult() == PlayerLoginEvent.Result.KICK_FULL) event.allow();
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {

        API.serverPlayerJoin(event.getPlayer().getUniqueId(), event.getPlayer().getName());
    }

    @EventHandler
    public void onPlayerQuit(PlayerQuitEvent event) {

        API.serverPlayerQuit(event.getPlayer().getUniqueId());
    }
}
