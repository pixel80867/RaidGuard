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
const { registerCommands } = require("./register");
const { registerInteractions } = require("./interactions");
const { securityLog } = require("./logger");

// CHECK REQUIRED VARIABLES
const requiredVariables = [
    "TOKEN",
    "GUILD_ID",
    "LOG_CHANNEL_ID",
    "STAFF_ROLE_ID"
];

for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        console.error(`Missing variable: ${variable}`);
        process.exit(1);
    }
}

// CREATE DISCORD CLIENT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent
    ]
});

// ENABLE BOT SYSTEMS
config.slashCommands = true;

registerProtection(client);
registerEcho(client);
registerInteractions(client);

// BOT STARTUP
client.once(Events.ClientReady, async bot => {
    console.log("==============================");
    console.log(`RaidGuard online as ${bot.user.tag}`);
    console.log("==============================");

    bot.user.setPresence({
        activities: [
            {
                name: "Server Security",
                type: ActivityType.Watching
            }
        ],
        status: "online"
    });

    const guild = bot.guilds.cache.get(config.guildId);

    if (!guild) {
        console.error("Configured server not found.");
        return;
    }

    console.log(`Connected to: ${guild.name}`);

    const staffRole = guild.roles.cache.get(
        config.staffRoleId
    );

    if (!staffRole || staffRole.id === guild.id) {
        console.error("Invalid STAFF_ROLE_ID.");
    } else {
        console.log(`Minimum staff role: ${staffRole.name}`);
        console.log("Staff and higher roles recognized.");
    }

    // REGISTER SLASH COMMANDS
    await registerCommands(bot);

    // SEND STARTUP LOG
    await securityLog(
        guild,
        "RaidGuard Online",
        "Automatic security monitoring and staff commands are active.",
        "success"
    );
});

// ERROR HANDLING
client.on(Events.Error, error => {
    console.error("Discord client error:", error);
});

process.on("unhandledRejection", error => {
    console.error("Unhandled rejection:", error);
});

// LOGIN
client.login(process.env.TOKEN).catch(error => {
    console.error("Login failed:", error.message);
    process.exit(1);
});
