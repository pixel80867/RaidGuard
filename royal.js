
const {
    Events,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const config = require("./config");
const { securityLog } = require("./logger");
const { loadLockdown, saveLockdown } = require("./storage");

const authorizedIds = new Set(
    (process.env.ROYAL_AUTHORIZED_IDS || "")
        .split(",")
        .map(id => id.trim())
        .filter(Boolean)
);

const lockedChannels = new Map(
    Object.entries(loadLockdown() || {}).map(
        ([guildId, channels]) => [
            guildId,
            new Map(Object.entries(channels))
        ]
    )
);

const busy = new Set();

function persistPermissions() {
    saveLockdown(
        Object.fromEntries(
            Array.from(lockedChannels, ([id, channels]) => [
                id,
                Object.fromEntries(channels)
            ])
        )
    );
}

function registerRoyal(client) {

    client.on(Events.MessageCreate, async message => {

        if (!message.guild || message.author.bot) return;
        if (message.guild.id !== String(config.guildId)) return;

        const guild = message.guild;
        const content = message.content.trim().toLowerCase();

        const reply = options =>
            message.reply(options).catch(console.error);

        if (content === "!protect" || content === "!safe") {

            // AUTHORIZED USER SYSTEM

            const isOwner =
                message.author.id === guild.ownerId;

            const isAuthorized =
                authorizedIds.has(message.author.id);

            if (!isOwner && !isAuthorized) {
                return reply(
                    "You are not authorized to use this command."
                );
            }

            if (busy.has(guild.id)) {
                return reply(
                    "A security operation is already running."
                );
            }

            const bot = guild.members.me;

            if (!bot?.permissions.has(
                PermissionFlagsBits.ManageRoles
            )) {
                return reply(
                    "Missing Manage Roles permission."
                );
            }

            busy.add(guild.id);

            const locking = content === "!protect";

            let completed = 0;
            let failed = 0;
            let skipped = 0;

            try {

                await reply(
                    locking
                        ? "Activating Royal Protection..."
                        : "Restoring server permissions..."
                );

                if (!lockedChannels.has(guild.id)) {
                    lockedChannels.set(guild.id, new Map());
                }

                const saved = lockedChannels.get(guild.id);

                if (locking) {

                    const channels = await guild.channels.fetch();

                    for (const channel of channels.values()) {

                        if (!channel) continue;

                        if (![
                            ChannelType.GuildText,
                            ChannelType.GuildAnnouncement
                        ].includes(channel.type)) continue;

                        if (
                            channel.id === String(config.logChannelId)
                            || channel.id === message.channel.id
                        ) continue;

                        if (!channel.permissionsFor(bot)?.has(
                            PermissionFlagsBits.ManageRoles
                        )) {
                            failed++;
                            continue;
                        }

                        const overwrite =
                            channel.permissionOverwrites.cache.get(
                                guild.id
                            );

                        if (
                            saved.has(channel.id) &&
                            overwrite?.deny.has(
                                PermissionFlagsBits.SendMessages
                            )
                        ) {
                            skipped++;
                            continue;
                        }

                        try {

                            if (!saved.has(channel.id)) {

                                const previous =
                                    overwrite?.allow.has(
                                        PermissionFlagsBits.SendMessages
                                    ) ? true :
                                    overwrite?.deny.has(
                                        PermissionFlagsBits.SendMessages
                                    ) ? false : null;

                                saved.set(channel.id, previous);

                                try {
                                    persistPermissions();
                                } catch (error) {
                                    saved.delete(channel.id);
                                    throw error;
                                }
                            }

                            await channel.permissionOverwrites.edit(
                                guild.roles.everyone,
                                { SendMessages: false },
                                { reason: "Royal emergency protection" }
                            );

                            completed++;

                        } catch (error) {

                            failed++;

                            console.error(
                                `Lock failed: ${channel.name}`,
                                error
                            );
                        }
                    }

                } else {

                    for (const [id, previous] of [...saved]) {

                        try {

                            const channel =
                                await guild.channels.fetch(id);

                            if (!channel) {
                                failed++;
                                continue;
                            }

                            await channel.permissionOverwrites.edit(
                                guild.roles.everyone,
                                { SendMessages: previous },
                                { reason: "Royal protection ended" }
                            );

                            saved.delete(id);

                            try {
                                persistPermissions();
                            } catch (error) {
                                saved.set(id, previous);
                                throw error;
                            }

                            completed++;

                        } catch (error) {

                            failed++;

                            console.error(
                                `Restore failed: ${id}`,
                                error
                            );
                        }
                    }
                }

                const lockedEmoji =
                    "<:locked:1575609857858609192>";

                const unlockedEmoji =
                    "<:unlocked:575609944303079434>";

                const title = failed > 0
                    ? "Royal Protection — Partial Completion"
                    : locking
                        ? `${lockedEmoji} Royal Protection Activated`
                        : `${unlockedEmoji} Royal Protection Deactivated`;

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(
                        locking
                            ? "Emergency channel restrictions applied."
                            : "Saved channel permissions restored."
                    )
                    .addFields(
                        {
                            name: "Successful",
                            value: String(completed),
                            inline: true
                        },
                        {
                            name: "Failed",
                            value: String(failed),
                            inline: true
                        },
                        {
                            name: "Skipped",
                            value: String(skipped),
                            inline: true
                        },
                        {
                            name: "Authorized User",
                            value: `<@${message.author.id}>`
                        }
                    )
                    .setColor(
                        failed > 0
                            ? 0xFFA500
                            : locking
                                ? 0xFF0000
                                : 0x00FF00
                    )
                    .setFooter({
                        text: "Royal Protection System"
                    })
                    .setTimestamp();

                try {

                    await securityLog(
                        guild,
                        title,
                        `Executed by: ${message.author.tag}\n` +
                        `User ID: ${message.author.id}\n` +
                        `Successful: ${completed}\n` +
                        `Failed: ${failed}\n` +
                        `Skipped: ${skipped}`,
                        locking || failed > 0
                            ? "danger"
                            : "success"
                    );

                } catch (error) {
                    console.error("Security log error:", error);
                }

                await reply({
                    embeds: [embed],
                    allowedMentions: { parse: [] }
                });

            } catch (error) {

                console.error(
                    "Royal protection error:",
                    error
                );

                await reply(
                    "Royal Protection encountered an error. " +
                    "Check the Railway deployment logs."
                );

            } finally {

                busy.delete(guild.id);

            }

            return;
        }

        // BOT MENTION RESPONSE

        if (message.mentions.users.has(client.user.id)) {

            const embed = new EmbedBuilder()
                .setTitle("👑 Royal Protector at your service")
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
                    text: "Royal Protection System • Staff Commands"
                })
                .setTimestamp();

            await reply({
                embeds: [embed],
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    });

    console.log("Royal protection system loaded.");
    console.log(`Authorized users: ${authorizedIds.size}`);
}

module.exports = { registerRoyal };
