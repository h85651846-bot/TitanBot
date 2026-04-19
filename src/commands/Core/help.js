import {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

async function getCategories() {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (
        await fs.readdir(commandsPath, { withFileTypes: true })
    ).filter((dirent) => dirent.isDirectory());
    return categoryDirs.map(dir => dir.name);
}

async function getCommandsByCategory(category) {
    const categoryPath = path.join(__dirname, "../../commands", category);
    const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith(".js"));
    return files.map(file => `\`${file.replace(".js", "")}\``).join(", ");
}

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View the advanced help menu system"),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);

        const categories = await getCategories();
        const botName = client?.user?.username || "System";

        const mainEmbed = createEmbed({
            title: botName.toUpperCase(),
            description: "Select a module from the menu below to view the available documentation and command list.",
            color: 'primary'
        });

        mainEmbed.addFields({
            name: "Information",
            value: "Modules: " + categories.length + "\nStatus: Operational",
            inline: true
        });

        mainEmbed.setFooter({ text: "Owned by Azuki" });
        mainEmbed.setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_v2_select')
            .setPlaceholder('Navigation Menu')
            .addOptions(
                categories.map(cat => ({
                    label: cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase(),
                    value: cat,
                    description: `View ${cat} commands`
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await InteractionHelper.safeEditReply(interaction, {
            embeds: [mainEmbed],
            components: [row],
        });

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: HELP_MENU_TIMEOUT_MS
        });

        collector.on('collect', async i => {
            const selectedCategory = i.values[0];
            const commandsText = await getCommandsByCategory(selectedCategory);
            
            const updatedEmbed = createEmbed({
                title: selectedCategory.toUpperCase(),
                description: "List of commands for this category:",
                color: 'primary'
            });
            
            updatedEmbed.addFields({
                name: "Commands",
                value: commandsText || "No data available."
            });

            updatedEmbed.setFooter({ text: "Owned by Azuki" });

            await i.update({ embeds: [updatedEmbed] });
        });

        collector.on('end', async () => {
            try {
                await InteractionHelper.safeEditReply(interaction, {
                    components: []
                });
            } catch (e) {}
        });
    },
};
