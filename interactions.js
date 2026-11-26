const {
    Events,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const config = require("./config");
const { securityLog } = require("./logger");
const {
    setRaidMode,
    getRaidStatus
} = require("./protection");

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

            const member = await interaction.guild.members.fetch({
                user: interaction.user.id,
                force: true
            });

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

                    // Only the server owner can disable protection.
                    if (!enabled &&
                        member.id !== interaction.guild.ownerId) {
                        return interaction.editReply(
                            "Only the server owner can disable protection."
                        );
                    }

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

                case "raidmode": {
                    const enabled =
                        interaction.options.getBoolean("enabled");

                    if (!enabled &&
                        member.id !== interaction.guild.ownerId) {
                        return interaction.editReply(
                            "Only the server owner can deactivate raid mode."
                        );
                    }

                    setRaidMode(interaction.guildId, enabled);

                    response = enabled
                        ? "🚨 Emergency monitoring activated."
                        : "✅ Emergency monitoring deactivated.";

                    break;
                }

                case "emergency":
                case "panic": {
                    config.antiRaid.enabled = true;
                    setRaidMode(interaction.guildId, true);

                    await securityLog(
                        interaction.guild,
                        "EMERGENCY RAID ALERT",
                        `Activated by staff ID: ${interaction.user.id}`,
                        "danger"
                    );

                    response = "🚨 Emergency monitoring activated.";
                    break;
                }

                case "raidstatus": {
                    const status = getRaidStatus(
                        interaction.guildId
                    );

                    response = status.active
                        ? `🚨 Raid Mode: ACTIVE\nRemaining: ${
                            Math.ceil(status.remaining / 1000)
                        } seconds`
                        : "🟢 Raid Mode: INACTIVE";

                    break;
                }

                case "security":
                    response =
                        `Anti-Raid: ${config.antiRaid.enabled ? "ON" : "OFF"}\n` +
                        `Anti-Nuke: ${config.antiNuke.enabled ? "ON" : "OFF"}\n` +
                        `Anti-Spam: ${config.antiSpam.enabled ? "ON" : "OFF"}\n` +
                        `Anti-Mention: ${config.antiMention.enabled ? "ON" : "OFF"}\n` +
                        `Raid Mode: ${getRaidStatus(interaction.guildId).active ? "ACTIVE" : "INACTIVE"}`;

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
                    return interaction.editReply(
                        "Unknown command."
                    );
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
                    "An error occurred. Check Railway logs."
                ).catch(console.error);
            }
        }
    });

    console.log("Slash command handler loaded.");
}

module.exports = { registerInteractions };
