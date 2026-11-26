const { SlashCommandBuilder } = require("discord.js");

function toggle(name, description) {
    return new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .addBooleanOption(option =>
            option.setName("enabled")
                .setDescription("Enable or disable protection")
                .setRequired(true)
        );
}

function simple(name, description) {
    return new SlashCommandBuilder()
        .setName(name)
        .setDescription(description);
}

function announcement(name, description) {
    return simple(name, description)
        .addStringOption(option =>
            option.setName("message")
                .setDescription("Security announcement")
                .setMaxLength(1500)
                .setRequired(true)
        );
}

const commands = [
    toggle("antiraid", "Configure automatic raid detection"),
    toggle("antinuke", "Configure anti-nuke monitoring"),
    toggle("raidmode", "Configure emergency raid monitoring"),

    simple("security", "View security settings"),
    simple("raidstatus", "View current raid status"),
    simple("emergency", "Activate emergency monitoring"),
    simple("panic", "Activate heightened security monitoring"),
    simple("securitycheck", "Check bot security permissions"),

    announcement("raidalert", "Send a security alert"),
    announcement("custom", "Send a custom security announcement")
];

module.exports = commands.map(command => command.toJSON());
