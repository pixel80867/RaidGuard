const { REST, Routes } = require("discord.js");
const commands = require("./commands");
const config = require("./config");

async function registerCommands(client) {
    const rest = new REST({ version: "10" })
        .setToken(process.env.TOKEN);

    try {
        console.log("Registering RaidGuard commands...");

        const data = await rest.put(
            Routes.applicationGuildCommands(
                client.user.id,
                config.guildId
            ),
            { body: commands }
        );

        console.log(
            `Successfully registered ${data.length} slash commands.`
        );

    } catch (error) {
        console.error(
            "Command registration failed:",
            error.message
        );
    }
}

module.exports = { registerCommands };
