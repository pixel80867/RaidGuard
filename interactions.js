const {
    Events,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const config = require("./config");
const { securityLog } = require("./logger");

function isStaff(member) {
    if (!member) return false;

    if (member.id === member.guild.ownerId) return true;

    const role = member.guild.roles.cache.get(
        config.staffRoleId
    );

    if (!role || role.id === member.guild.id) return false;

    return member.roles.highest.comparePositionTo(role) >= 0;
}

function registerInteractions(client) {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.guildId !== config.guildId) return;

        try {
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const member = await interaction.guild.members.fetch(
                interaction.user.id
            );

            if (!isStaff(member)) {
                return interaction.editReply(
                    "⛔ Staff or higher role required."
                );
            }

            const command = interaction.commandName;
            let response;

            switch (command) {

                case "antiraid":
                case "antinuke": {
                    const enabled =
                        interaction.options.getBoolean("enabled");

                    if (command === "antiraid") {
                        config.antiRaid.enabled = enabled;
                    } else {
                        config.antiNuke.enabled = enabled;
                    }

                    response = `${command}: ${
                        enabled ? "Enabled" : "Disabled"
                    }`;
                    break;
                }

                case "raidmode":
                case "emergency":
                case "panic":
                case "raidstatus":
                    return interaction.editReply(
                        "This command requires the upcoming raid state integration."
                    );

                case "security":
                    response =
                        `Anti-Raid: ${config.antiRaid.enabled ? "ON" : "OFF"}\n` +
                        `Anti-Nuke: ${config.antiNuke.enabled ? "ON" : "OFF"}\n` +
                        `Anti-Spam: ${config.antiSpam.enabled ? "ON" : "OFF"}\n` +
                        `Anti-Mention: ${config.antiMention.enabled ? "ON" : "OFF"}`;
                    break;

                case "securitycheck": {
                    const bot = interaction.guild.members.me;

                    const permissions = [
                        ["View Audit Log", PermissionFlagsBits.ViewAuditLog],
                        ["Manage Messages", PermissionFlagsBits.ManageMessages],
                        ["Moderate Members", PermissionFlagsBits.ModerateMembers],
                        ["Send Messages", PermissionFlagsBits.SendMessages],
                        ["Embed Links", PermissionFlagsBits.EmbedLinks]
                    ];

                    response = permissions.map(([name, flag]) =>
                        `${bot.permissions.has(flag) ? "✅" : "❌"} ${name}`
                    ).join("\n");

                    break;
                }

                case "raidalert":
                case "custom": {
                    const message =
                        interaction.options.getString("message");

                    await securityLog(
                        interaction.guild,
                        command === "raidalert"
                            ? "Raid Alert"
                            : "Custom Security Announcement",
                        message,
                        "warning"
                    );

                    response = "Security announcement submitted.";
                    break;
                }

                default:
                    return interaction.editReply("Unknown command.");
            }

            const embed = new EmbedBuilder()
                .setTitle("🛡️ RaidGuard Security")
                .setDescription(response)
                .setColor(0x5865F2)
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                allowedMentions: { parse: [] }
            });

            await securityLog(
                interaction.guild,
                "Staff Command Used",
                `Command: /${command}\nStaff ID: ${interaction.user.id}`,
                "info"
            );

        } catch (error) {
            console.error("Command error:", error.message);

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(
                    "An error occurred."
                ).catch(console.error);
            }
        }
    });

    console.log("Slash command handler loaded.");
}

module.exports = { registerInteractions };
