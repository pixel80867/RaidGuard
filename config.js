module.exports = {
    // Server settings
    guildId: process.env.GUILD_ID,
    staffRoleId: process.env.STAFF_ROLE_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    quarantineRoleId: process.env.QUARANTINE_ROLE_ID,

    // Trusted user IDs
    whitelist: [],

    // Automatic raid protection
    antiRaid: {
        enabled: true,
        joinLimit: 8,
        timeWindow: 10000,
        raidDuration: 600000
    },

    // Anti-nuke protection
    antiNuke: {
        enabled: true,
        actionLimit: 3,
        timeWindow: 10000
    },

    // Spam protection
    antiSpam: {
        enabled: true,
        messageLimit: 6,
        timeWindow: 5000,
        timeoutDuration: 300000
    },

    // Mass mention protection
    antiMention: {
        enabled: true,
        mentionLimit: 5
    },

    // Additional protection
    antiBot: true,
    antiWebhook: true,
    antiChannelDelete: true,
    antiChannelCreate: true,
    antiRoleDelete: true,
    antiRoleCreate: true,
    antiPermissionChanges: true,

    // New account monitoring
    accountProtection: {
        enabled: true,
        minimumAgeDays: 3,
        alertOnly: true
    },

    // Security settings
    securityLogs: true,
    automaticRecovery: true,
    slashCommands: false
};
