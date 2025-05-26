package fr.raraph84.infinite_minecraft_players_poc.server_plugin.commands;

import fr.raraph84.infinite_minecraft_players_poc.server_plugin.Config;
import fr.raraph84.infinite_minecraft_players_poc.server_plugin.api.API;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public class PlayCommandExecutor implements CommandExecutor {

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {

        if (!(sender instanceof Player)) {
            sender.sendMessage("§cYou must be a player to execute this command.");
            return true;
        }

        if (Config.getServerName().startsWith("game")) {
            sender.sendMessage("§cYou are already in a game server.");
            return true;
        }

        Player player = (Player) sender;
        player.sendMessage("§aConnecting you to a game server...");
        try {
            API.connectPlayer(player.getUniqueId(), "game");
        } catch (RuntimeException exception) {
            if (exception.getMessage().equals("No server available"))
                player.sendMessage("§cNo game server available.");
            else
                throw exception;
        }
        return true;
    }
}
