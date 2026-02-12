require("dotenv").config();
const express = require("express");
const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

// ================= EXPRESS =================
const app = express();
app.get("/", (req, res) => res.send("Bot Running 🚀"));
app.listen(process.env.PORT || 3000, () =>
  console.log("Web server started")
);

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ================= SETTINGS =================
const ownerId = "1414100097590890588"; // Bot owner
const guildId = "1464580639620727030";
const notificationChannelId = "1464603388196032626";
const autoRoleId = "1464585250964242494";

// File to store command permissions
const PERMISSION_FILE = "./permissions.json";
let commandPermissions = {};
if (fs.existsSync(PERMISSION_FILE)) {
  commandPermissions = JSON.parse(fs.readFileSync(PERMISSION_FILE, "utf8"));
} else {
  fs.writeFileSync(PERMISSION_FILE, JSON.stringify({}));
}

// Save permissions
function savePermissions() {
  fs.writeFileSync(PERMISSION_FILE, JSON.stringify(commandPermissions, null, 2));
}

// ================= REACTIONS & BADWORDS =================
let reactEnabled = true;
const userReactions = {
  "1414100097590890588": ["🔥", "😎", "❤️"],
  "1464583967385714854": ["💀", "😂", "🐷"],
  "1467125413967958018": ["❤️", "💦", "🌈"]
};
const reactCooldown = new Map();
const COOLDOWN_TIME = 20000;
const badWords = ["suar", "gaandu", "bhadu", "kutte", "chutiya", "mc", "bc"];
const PREFIX = "!";

// ================= SNIPE SYSTEM =================
let snipedMessages = {};
const MAX_SNIPES = 10;

// ================= COMMAND LIST =================
const allCommandsList = [
  { name: "ping", desc: "Check bot latency" },
  { name: "members", desc: "Show member count" },
  { name: "snipe", desc: "See last deleted message in this channel" },
  { name: "snipeall", desc: "See last deleted message in the server" },
  { name: "snipelist", desc: "See a list of last deleted messages" },
  { name: "togglereacts", desc: "Toggle reaction system" },
  { name: "kick", desc: "Kick a member" },
  { name: "ban", desc: "Ban a member" },
  { name: "unban", desc: "Unban by ID" },
  { name: "clear", desc: "Clear messages" },
  { name: "timeout", desc: "Timeout a member" },
  { name: "warn", desc: "Warn a member" },
  { name: "remind", desc: "Set a reminder" },
  { name: "move", desc: "Move a member to a voice channel" },
  { name: "spam", desc: "Spam a message" },
  { name: "give", desc: "Give permission to a user for a command" },
  { name: "revoke", desc: "Revoke permission from a user for a command" },
  { name: "help", desc: "Show all bot commands" }
];

// ================= SLASH COMMANDS =================
const commands = allCommandsList.map(c => new SlashCommandBuilder().setName(c.name).setDescription(c.desc));

// Add options for commands that need them
commands.find(c => c.name === "snipelist")?.addIntegerOption(o => o.setName("amount").setDescription("Number of messages to show (1-10)").setRequired(false));
commands.find(c => c.name === "kick")?.addUserOption(o => o.setName("user").setDescription("User").setRequired(true));
commands.find(c => c.name === "ban")?.addUserOption(o => o.setName("user").setDescription("User").setRequired(true));
commands.find(c => c.name === "unban")?.addStringOption(o => o.setName("userid").setDescription("User ID").setRequired(true));
commands.find(c => c.name === "clear")?.addIntegerOption(o => o.setName("amount").setDescription("1-100").setRequired(true));
commands.find(c => c.name === "timeout")
  ?.addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addIntegerOption(o => o.setName("minutes").setDescription("Minutes").setRequired(true));
commands.find(c => c.name === "warn")
  ?.addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false));
commands.find(c => c.name === "remind")
  ?.addIntegerOption(o => o.setName("seconds").setDescription("Seconds").setRequired(true))
  .addStringOption(o => o.setName("text").setDescription("Reminder text").setRequired(true));
commands.find(c => c.name === "move")
  ?.addUserOption(o => o.setName("user").setDescription("User to move").setRequired(true))
  .addChannelOption(o => o.setName("channel").setDescription("Voice channel to move to").setRequired(true).addChannelTypes(2));
commands.find(c => c.name === "spam")
  ?.addIntegerOption(o => o.setName("count").setDescription("Number of messages").setRequired(true))
  .addStringOption(o => o.setName("delay").setDescription("Delay (e.g., 3s, 5m, 1h)").setRequired(true))
  .addStringOption(o => o.setName("message").setDescription("Message to spam").setRequired(true));
commands.find(c => c.name === "give")
  ?.addUserOption(o => o.setName("user").setDescription("User to give permission").setRequired(true))
  .addStringOption(o => o.setName("command").setDescription("Command name").setRequired(true));
commands.find(c => c.name === "revoke")
  ?.addUserOption(o => o.setName("user").setDescription("User to revoke permission").setRequired(true))
  .addStringOption(o => o.setName("command").setDescription("Command name").setRequired(true));

// Register commands
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log("Slash commands registered ✅");
})();

// ================= INTERACTION HANDLER =================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const command = interaction.commandName;

  // Check permissions (owner OR allowed users)
  if (userId !== ownerId) {
    const allowedUsers = commandPermissions[command] || [];
    if (!allowedUsers.includes(userId)) {
      return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
    }
  }

  // ================= COMMAND LOGIC =================
  if (command === "help") {
    let availableCommands;
    if (userId === ownerId) availableCommands = allCommandsList;
    else {
      availableCommands = allCommandsList.filter(c => commandPermissions[c.name]?.includes(userId));
    }
    if (availableCommands.length === 0) return interaction.reply({ content: "No commands available for you ❌", ephemeral: true });
    const helpText = availableCommands.map(c => `/${c.name} — ${c.desc}`).join("\n");
    return interaction.reply({ content: helpText, ephemeral: true });
  }

  // Other commands (ping, members, snipe, kick, ban, spam...) go here exactly as before
  // For brevity, you can copy the handlers from previous full code
  // Remember to keep owner-only checks and use ephemeral responses for private info
});

// ================= LOGIN =================
client.once("ready", () => console.log(`Logged in as ${client.user.tag}`));
client.login(process.env.TOKEN);
