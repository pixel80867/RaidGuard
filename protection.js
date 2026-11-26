const { AuditLogEvent, Events } = require("discord.js");
const config = require("./config");
const { securityLog } = require("./logger");

const joins = new Map();
const messages = new Map();
const actions = new Map();
const raids = new Map();

function track(map, key, window) {
    const now = Date.now();
    const entries = (map.get(key) || [])
        .filter(time => now - time < window);

    entries.push(now);
    map.set(key, entries);
    return entries.length;
}

function trusted(guild, id) {
    return id === guild.ownerId ||
        id === guild.client.user.id ||
        config.whitelist.includes(id);
}

function registerProtection(client) {

    // AUTOMATIC RAID DETECTION
    client.on(Events.GuildMemberAdd, async member => {
        const guild = member.guild;
        if (guild.id !== config.guildId) return;

        try {
            if (trusted(guild, member.id)) return;

            if (config.antiBot && member.user.bot) {
                await securityLog(
                    guild,
                    "Unauthorized Bot Detected",
                    `Review bot ID: ${member.id}`,
                    "danger"
                );
            }

            if (config.accountProtection.enabled) {
                const age = Date.now() -
                    member.user.createdTimestamp;

                if (age < config.accountProtection.minimumAgeDays
                    * 86400000) {
                    await securityLog(
                        guild,
                        "New Account Detected",
                        `Account ID: ${member.id}`
                    );
                }
            }

            if (!config.antiRaid.enabled) return;

            const count = track(
                joins,
                guild.id,
                config.antiRaid.timeWindow
            );

            const active = (raids.get(guild.id) || 0) >
                Date.now();

            if (count >= config.antiRaid.joinLimit && !active) {
                raids.set(
                    guild.id,
                    Date.now() + config.antiRaid.raidDuration
                );

                await securityLog(
                    guild,
                    "RAID DETECTED",
                    `${count} rapid joins detected. Raid monitoring activated.`,
                    "danger"
                );
            }

            if ((raids.get(guild.id) || 0) > Date.now()) {
                await securityLog(
                    guild,
                    "Raid Join Flagged",
                    `Review member ID: ${member.id}`,
                    "warning"
                );
            }

        } catch (error) {
            console.error("Join protection:", error.message);
        }
    });

    // ANTI-SPAM AND MASS MENTIONS
    client.on(Events.MessageCreate, async message => {
        if (!message.guild ||
            message.guild.id !== config.guildId ||
            message.author.bot) return;

        if (trusted(message.guild, message.author.id)) return;

        try {
            const count = track(
                messages,
                `${message.guild.id}:${message.author.id}`,
                config.antiSpam.timeWindow
            );

            const spam = config.antiSpam.enabled &&
                count >= config.antiSpam.messageLimit;

            const mentions = config.antiMention.enabled &&
                message.mentions.users.size >=
                config.antiMention.mentionLimit;

            if (!spam && !mentions) return;

            if (message.deletable) {
                await message.delete();
            }

            if (message.member?.moderatable) {
                await message.member.timeout(
                    config.antiSpam.timeoutDuration,
                    "RaidGuard automatic spam protection"
                );
            }

            await securityLog(
                message.guild,
                spam ? "Spam Detected" : "Mass Mentions Detected",
                `Member ID: ${message.author.id}. Automatic moderation attempted.`,
                "danger"
            );

        } catch (error) {
            console.error("Spam protection:", error.message);
        }
    });

    // ANTI-NUKE MONITORING
    const monitored = new Map([
        [AuditLogEvent.ChannelCreate, "Channel Created"],
        [AuditLogEvent.ChannelDelete, "Channel Deleted"],
        [AuditLogEvent.RoleCreate, "Role Created"],
        [AuditLogEvent.RoleDelete, "Role Deleted"],
        [AuditLogEvent.RoleUpdate, "Role Updated"],
        [AuditLogEvent.MemberRoleUpdate, "Member Roles Updated"],
        [AuditLogEvent.WebhookCreate, "Webhook Created"],
        [AuditLogEvent.WebhookDelete, "Webhook Deleted"],
        [AuditLogEvent.WebhookUpdate, "Webhook Updated"],
        [AuditLogEvent.MemberBanAdd, "Member Banned"],
        [AuditLogEvent.MemberKick, "Member Kicked"],
        [AuditLogEvent.BotAdd, "Bot Added"],
        [AuditLogEvent.ChannelUpdate, "Channel Updated"],
        [AuditLogEvent.GuildUpdate, "Server Updated"]
    ]);

    client.on(
        Events.GuildAuditLogEntryCreate,
        async (entry, guild) => {

        if (guild.id !== config.guildId) return;
        if (!config.antiNuke.enabled) return;
        if (!monitored.has(entry.action)) return;

        const executor = entry.executorId;

        if (!executor || trusted(guild, executor)) return;

        try {
            const count = track(
                actions,
                `${guild.id}:${executor}`,
                config.antiNuke.timeWindow
            );

            if (count === config.antiNuke.actionLimit) {
                await securityLog(
                    guild,
                    "POTENTIAL NUKE DETECTED",
                    `Executor ID: ${executor}\n` +
                    `Rapid administrative actions: ${count}\n` +
                    `Latest action: ${monitored.get(entry.action)}\n` +
                    `Immediate staff review recommended.`,
                    "danger"
                );
            }

        } catch (error) {
            console.error("Anti-nuke:", error.message);
        }
    });

    // AUTOMATIC CLEANUP
    const timer = setInterval(() => {
        const now = Date.now();

        for (const [id, expiry] of raids) {
            if (expiry <= now) {
                raids.delete(id);

                const guild = client.guilds.cache.get(id);

                if (guild) {
                    securityLog(
                        guild,
                        "Raid Monitoring Ended",
                        "Emergency monitoring period expired.",
                        "info"
                    );
                }
            }
        }

        for (const [map, window] of [
            [joins, config.antiRaid.timeWindow],
            [messages, config.antiSpam.timeWindow],
            [actions, config.antiNuke.timeWindow]
        ]) {
            for (const [key, times] of map) {
                const recent = times.filter(
                    time => now - time < window
                );

                if (recent.length) map.set(key, recent);
                else map.delete(key);
            }
        }
    }, 15000);

    timer.unref();

    console.log("RaidGuard protection loaded.");
}

module.exports = { registerProtection };
