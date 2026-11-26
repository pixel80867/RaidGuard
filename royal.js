const {
    Events,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const config = require("./config");
const { securityLog } = require("./logger");

const {
    loadLockdown,
    saveLockdown
} = require("./storage");

const lockedChannels = new Map(
    Object.entries(loadLockdown()).map(
        ([guildId, channels]) => [
            guildId,
            new Map(Object.entries(channels))
        ]
    )
);

function persistPermissions() {
    const data = Object.fromEntries(
        Array.from(lockedChannels, ([id, channels]) => [
            id,
            Object.fromEntries(channels)
        ])
    );

    saveLockdown(data);
}
const busy = new Set();

function registerRoyal(client) {

    client.on(Events.MessageCreate, async message => {

        if (!message.guild || message.author.bot) return;
        if (message.guild.id !== config.guildId) return;

        const guild = message.guild;
        const content = message.content.trim().toLowerCase();

        // SECRET EMERGENCY COMMANDS
        if (content === "!protect" || content === "!safe") {

            if (message.author.id !== guild.ownerId) {
                return;
            }

            if (busy.has(guild.id)) {
                return message.reply(
                    "A security operation is already running."
                );
            }

            const bot = guild.members.me;

            if (!bot.permissions.has(
                PermissionFlagsBits.ManageRoles
            )) {
                return message.reply(
                    "Missing Manage Roles permission."
                );
            }

            busy.add(guild.id);

            try {
                if (!lockedChannels.has(guild.id)) {
                    lockedChannels.set(guild.id, new Map());
                }

                const saved = lockedChannels.get(guild.id);
                let completed = 0;
                let failed = 0;

                if (content === "!protect") {

                    const channels = await guild.channels.fetch();

                    for (const channel of channels.values()) {

                        if (!channel) continue;

                        if (![
                            ChannelType.GuildText,
                            ChannelType.GuildAnnouncement
                        ].includes(channel.type)) continue;

                        if (channel.id === config.logChannelId) {
                            continue;
                        }

                        if (saved.has(channel.id)) continue;

                        const overwrite =
                            channel.permissionOverwrites.cache.get(
                                guild.id
                            );

                        const previous =
                            overwrite?.allow.has(
                                PermissionFlagsBits.SendMessages
                            ) ? true :
                            overwrite?.deny.has(
                                PermissionFlagsBits.SendMessages
                            ) ? false : null;

                        try {
    saved.set(channel.id, previous);
    persistPermissions();

    await channel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: false },
        { reason: "Royal emergency protection" }
    );

    completed++;

                        } catch (error) {
                            failed++;
                            console.error(error.message);
                        }
                    }

                    await securityLog(
                        guild,
                        "ROYAL PROTECTION ACTIVATED",
                        `Channels updated: ${completed}\nFailed: ${failed}`,
                        "danger"
                    );

                } else {

                    for (const [id, previous] of saved) {

                        try {
                            const channel =
                                await guild.channels.fetch(id);

                            if (!channel) {
                                saved.delete(id);
                                continue;
                            }

                            await channel.permissionOverwrites.edit(
                                guild.roles.everyone,
                                { SendMessages: previous },
                                { reason: "Royal protection ended" }
                            );

                            saved.delete(id);
                            completed++;

                        } catch (error) {
                            failed++;
                            console.error(error.message);
                        }
                    }

                    await securityLog(
                        guild,
                        "ROYAL PROTECTION ENDED",
                        `Channels restored: ${completed}\nFailed: ${failed}`,
                        "success"
                    );
                }

                const lockedEmoji = "<:locked:1575609857858609192>";
const unlockedEmoji = "<:unlocked:575609944303079434>";

const locking = content === "!protect";

const embed = new EmbedBuilder()
    .setDescription(
        locking
            ? `${lockedEmoji} **Royal Protection Activated**`
            : `${unlockedEmoji} **Royal Protection Deactivated**`
    )
    .addFields(
        {
            name: "Successful",
            value: `${completed}`,
            inline: true
        },
        {
            name: "Failed",
            value: `${failed}`,
            inline: true
        }
    )
    .setColor(locking ? 0xFF0000 : 0x00FF00)
    .setFooter({ text: "Royal Protection System" })
    .setTimestamp();

await message.reply({
    embeds: [embed],
    allowedMentions: { parse: [] }
}).catch(console.error);


            } catch (error) {
                console.error("Royal protection:", error.message);
            } finally {
                busy.delete(guild.id);
            }

            return;
        }

        // BOT MENTION RESPONSE
        if (message.mentions.users.has(client.user.id)) {

            const embed = new EmbedBuilder()
                .setTitle("👑 Royal Protecter at your service")
                .setDescription(
                    "I am here to protect and secure this server."
                )
                .addFields(
                    {
                        name: "🛡️ Protection Commands",
                        value:
                            "`/antiraid`\n" +
                            "`/antinuke`\n" +
                            "`/raidmode`\n" +
                            "`/security`\n" +
                            "`/raidstatus`"
                    },
                    {
                        name: "🚨 Emergency Commands",
                        value:
                            "`/emergency`\n" +
                            "`/panic`\n" +
                            "`/securitycheck`\n" +
                            "`/raidalert`\n" +
                            "`/custom`"
                    }
                )
                .setColor(0xD4AF37)
                .setFooter({
                    text: "Royal Protection System • Staff commands"
                })
                .setTimestamp();

            await message.reply({
                embeds: [embed],
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            }).catch(console.error);
        }
    });

    console.log("Royal protection system loaded.");
}

module.exports = { registerRoyal };
