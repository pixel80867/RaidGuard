require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Events,
    ActivityType
} = require("discord.js");

const config = require("./config");
const { registerProtection } = require("./protection");
const { registerEcho } = require("./echo");
const { securityLog } = require("./logger");

const required = [
    "TOKEN",
    "GUILD_ID",
    "LOG_CHANNEL_ID"
];

const missing = required.filter(
    key => !process.env[key]
);

if (missing.length) {
    console.error(
        "Missing environment variables:",
        missing.join(", ")
    );
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent
    ]
});

registerProtection(client);
registerEcho(client);

client.once(Events.ClientReady, async bot => {
    console.log("============================");
    console.log(`RaidGuard online: ${bot.user.tag}`);
    console.log("Protection system activated.");
    console.log("Slash commands disabled.");
    console.log("============================");

    bot.user.setPresence({
        activities: [{
            name: "Server Security",
            type: ActivityType.Watching
        }],
        status: "online"
    });

    const guild = bot.guilds.cache.get(config.guildId);

    if (!guild) {
        console.error("Configured server not found.");
        return;
    }
const staffRole = guild.roles.cache.get(
    config.staffRoleId
);

if (!staffRole || staffRole.id === guild.id) {
    console.error("Invalid STAFF_ROLE_ID.");
} else {
    console.log(`Minimum staff role: ${staffRole.name}`);
    console.log("Staff and higher roles recognized.");
}

    await securityLog(
        guild,
        "RaidGuard Online",
        "Automatic security monitoring is active.",
        "success"
    );
});

client.on(Events.Error, error => {
    console.error("Discord client error:", error.message);
});

client.login(process.env.TOKEN).catch(error => {
    console.error("Login failed:", error.message);
    process.exit(1);
});
