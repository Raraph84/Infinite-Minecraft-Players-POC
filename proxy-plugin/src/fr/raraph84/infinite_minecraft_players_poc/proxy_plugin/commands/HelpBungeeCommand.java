package fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.commands;

import fr.raraph84.infinite_minecraft_players_poc.proxy_plugin.MinecraftInfinitePlayersPOCProxyPlugin;
import net.md_5.bungee.api.CommandSender;
import net.md_5.bungee.api.ProxyServer;
import net.md_5.bungee.api.chat.TextComponent;
import net.md_5.bungee.api.plugin.Command;

import java.util.Map;
import java.util.stream.Collectors;

public class HelpBungeeCommand extends Command {

    public HelpBungeeCommand() {
        super("helpbungee", null, "helpb");
    }

    @Override
    public void execute(CommandSender sender, String[] args) {

        ProxyServer proxy = MinecraftInfinitePlayersPOCProxyPlugin.getInstance().getProxy();
        String commands = proxy.getPluginManager().getCommands().stream().map(Map.Entry::getKey).collect(Collectors.joining(", "));

        sender.sendMessage(new TextComponent("§6Available BungeeCord commands: §f" + commands));
    }
}
