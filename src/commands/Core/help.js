import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUG_REPORT_BUTTON_ID = "help-bug-report";
const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

async function getAllCommands() {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (
        await fs.readdir(commandsPath, { withFileTypes: true })
    ).filter((dirent) => dirent.isDirectory());

    let allCommandsText = "";

    for (const dir of categoryDirs) {
        const category = dir.name;
        const categoryPath = path.join(commandsPath, category);
        const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith(".js"));

        const categoryName =
            category.charAt(0).toUpperCase() +
            category.slice(1).toLowerCase();

        if (files.length > 0) {
            allCommandsText += `\n**${categoryName}**\n`;
            for (const file of files) {
                const command = file.replace(".js", "");
                allCommandsText += `\`/${command}\` `;
            }
            allCommandsText += "\n";
        }
    }

    return allCommandsText || "No commands found.";
}

async function createHelpMenu(client) {
    const botName = client?.user?.username || "Bot";
    const commandsText = await getAllCommands();

    const embed = createEmbed({ 
        title: `${botName} Help Center`,
        description: "All available commands are listed below:",
        color: 'primary'
    });

    embed.addFields({
        name: "Commands",
        value: commandsText.substring(0, 1024),
    });

    embed.setFooter({ text: "Made with love" });
    embed.setTimestamp();

    const bugReportButton = new ButtonBuilder()
        .setCustomId(BUG_REPORT_BUTTON_ID)
        .setLabel("Report Bug")
        .setStyle(ButtonStyle.Danger);

    const supportButton = new ButtonBuilder()
        .setLabel("Support Server")
        .setURL("https://discord.gg/QnWNz2dKCE")
        .setStyle(ButtonStyle.Link);

    const touchpointButton = new ButtonBuilder()
        .setLabel("Learn from Touchpoint")
        .setURL("https://www.youtube.com/@TouchDisc")
        .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents([
        bugReportButton,
        supportButton,
        touchpointButton,
    ]);

    return {
        embeds: [embed],
        components: [buttonRow],
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays all commands"),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);

        const { embeds, components } = await createHelpMenu(client);

        await InteractionHelper.safeEditReply(interaction, {
            embeds,
            components,
        });

        setTimeout(async () => {
            try {
                const closedEmbed = createEmbed({
                    title: "Help menu closed",
                    description: "Help menu has been closed, use /help again.",
                    color: "secondary",
                });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [closedEmbed],
                    components: [],
                });
            } catch (error) {}
        }, HELP_MENU_TIMEOUT_MS);
    },
};
