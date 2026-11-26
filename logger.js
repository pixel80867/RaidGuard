const { EmbedBuilder } = require("discord.js");
const config = require("./config");

async function securityLog(guild, title, description, severity = "warning") {
    if (!config.securityLogs) return;

    const colors = {
        info: 0x3498DB,
        warning: 0xF1C40F,
        danger: 0xE74C3C,
        success: 0x2ECC71
    };

    console.log(`[RaidGuard] ${title}: ${description}`);

    try {
        const channel = await guild.channels.fetch(
            config.logChannelId
        );

        if (!channel || !channel.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ ${title}`.slice(0, 256))
            .setDescription(String(description).slice(0, 4096))
            .setColor(colors[severity] || colors.warning)
            .setFooter({ text: "RaidGuard Security System" })
            .setTimestamp();

        await channel.send({
            embeds: [embed],
            allowedMentions: { parse: [] }
        });

    } catch (error) {
        console.error("Security log failed:", error.message);
    }
}

module.exports = { securityLog };
