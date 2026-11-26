const { Events, PermissionFlagsBits } = require("discord.js");
const config = require("./config");
const { securityLog } = require("./logger");

const cooldowns = new Map();

function registerEcho(client) {
    client.on(Events.MessageCreate, async message => {
        if (!message.guild || message.author.bot) return;
        if (message.guild.id !== config.guildId) return;
        if (!message.content.startsWith("!echo ")) return;
        console.log("[ECHO] Command detected");
console.log("[ECHO] Staff role configured:", config.staffRoleId);
console.log("[ECHO] Highest role:", message.member?.roles.highest.name);
console.log("[ECHO] Mention permission:",
    message.member?.permissionsIn(message.channel)
        .has(PermissionFlagsBits.MentionEveryone)
);


        const staffRole = message.guild.roles.cache.get(
            config.staffRoleId
        );

        if (!staffRole || staffRole.id === message.guild.id) return;

        const isStaff =
            message.author.id === message.guild.ownerId ||
            message.member.roles.highest.comparePositionTo(
                staffRole
            ) >= 0;

        if (!isStaff) return;

        if (!message.member.permissionsIn(message.channel)
            .has(PermissionFlagsBits.MentionEveryone)) return;

        const text = message.content.slice(6).trim();

        if (!text || text.length > 1800) return;

        const last = cooldowns.get(message.guild.id) || 0;

        if (Date.now() - last < 60000) {
            return message.reply({
                content: "Please wait before sending another announcement.",
                allowedMentions: { parse: [], repliedUser: false }
            }).catch(console.error);
        }

        cooldowns.set(message.guild.id, Date.now());

        try {
            await message.channel.send({
                content: `@everyone\n${text}`,
                allowedMentions: {
                    parse: ["everyone"]
                }
            });

            await securityLog(
                message.guild,
                "Echo Announcement",
                `Staff ID: ${message.author.id}\nChannel ID: ${message.channel.id}`,
                "info"
            );

        } catch (error) {
            console.error("Echo failed:", error.message);
        }
    });
}

module.exports = { registerEcho };
