package fr.raraph84.infinite_minecraft_players_poc.server_plugin.commands;

import fr.raraph84.infinite_minecraft_players_poc.server_plugin.Config;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.api.API;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public class LobbyCommandExecutor implements CommandExecutor {

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {

        if (!(sender instanceof Player)) {
            sender.sendMessage("§cYou must be a player to execute this command.");
            return true;
        }

        if (Config.getServerName().startsWith("lobby")) {
            sender.sendMessage("§cYou are already in a lobby server.");
            return true;
        }

        Player player = (Player) sender;
        player.sendMessage("§aConnecting you to a lobby server...");
        try {
            API.connectPlayer(player.getUniqueId(), "lobby");
        } catch (RuntimeException exception) {
            if (exception.getMessage().equals("No server available"))
                player.kickPlayer("§cNo lobby server available.");
            else
                throw exception;
        }
        return true;
    }
}
