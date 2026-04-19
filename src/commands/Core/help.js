import {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                allCommandsText += `/${command} `;
            }
            allCommandsText += "\n";
        }
    }

    return allCommandsText || "No commands found.";
}

async function createHelpMenu(client) {
    const botName = client?.user?.username || "Bot";
    const commandsText = await getAllCommands();

    const container = new ContainerBuilder().addComponents(
        new TextDisplayBuilder().setContent(`**${botName} Help Center**`),
        new TextDisplayBuilder().setContent(`All available commands:`),
        new TextDisplayBuilder().setContent(commandsText)
    );

    return {
        components: [container],
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays all commands"),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);

        const { components } = await createHelpMenu(client);

        await InteractionHelper.safeEditReply(interaction, {
            components,
        });

        setTimeout(async () => {
            try {
                const container = new ContainerBuilder().addComponents(
                    new TextDisplayBuilder().setContent("Help menu closed"),
                    new TextDisplayBuilder().setContent("Use /help again.")
                );

                await InteractionHelper.safeEditReply(interaction, {
                    components: [container],
                });
            } catch (error) {}
        }, HELP_MENU_TIMEOUT_MS);
    },
};
