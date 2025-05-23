package fr.azrotho.infinitypoc.listeners;

import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.connection.LoginEvent;
import com.velocitypowered.api.event.connection.PostLoginEvent;
import com.velocitypowered.api.event.connection.PreLoginEvent;
import com.velocitypowered.api.event.player.PlayerChooseInitialServerEvent;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.proxy.server.RegisteredServer;
import fr.azrotho.infinitypoc.InfinityPlugin;
import fr.azrotho.infinitypoc.api.API;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.format.TextColor;

import java.util.Optional;

public class PlayerJoinQuitListener {
    @Subscribe
    public void onPlayerJoin(PlayerChooseInitialServerEvent event) {
        String server;
        try {
            server = API.proxyPlayerJoin(event.getPlayer().getUniqueId(), event.getPlayer().getUsername());
        } catch (RuntimeException exception) {
            if (exception.getMessage().equals("No server available")) {
                event.getPlayer().disconnect(Component.text("There is no server available at the moment, please try again later.")
                    .color(TextColor.color(0x801818))
                );
                return;
            }
            event.getPlayer().disconnect(Component.text("An error occurred, please try again later.")
            .color(TextColor.color(0x801818)));
            throw exception;
        }

        Optional<RegisteredServer> proxyServer = InfinityPlugin.getInstance().getServer().getServer(server);
        if (proxyServer.isEmpty()) {
            event.getPlayer().disconnect(Component.text("The server you are trying to connect to does not exist.")
                .color(TextColor.color(0x801818)));
            return;
        }

        event.setInitialServer(proxyServer.get());
    }
}
