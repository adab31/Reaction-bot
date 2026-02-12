require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits
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
    GatewayIntentBits.GuildMembers
  ]
});

// ================= SETTINGS =================
const ownerId = "1414100097590890588";
const guildId = "1464580639620727030";
const notificationChannelId = "1464603388196032626";
const autoRoleId = "1464585250964242494";

let reactEnabled = true;

const userReactions = {
  "1414100097590890588": ["🔥", "😎", "❤️"],
  "1464583967385714854": ["💀", "😂", "🐷"],
  "1467125413967958018": ["❤️", "💦", "🌈"]
};

const badWords = ["suar", "gaandu", "bhadu", "kutte", "chutiya", "mc", "bc"];

// ================= REACTION SYSTEM =================
const reactCooldown = new Map();
const COOLDOWN_TIME = 20000;

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // bad word filter
  const msg = message.content.toLowerCase();
  if (badWords.some(word => msg.includes(word))) {
    await message.delete().catch(() => {});
    return message.channel.send(
      `${message.author}, bad words allowed nahi 🚫`
    );
  }

  if (!reactEnabled) return;

  const emojis = userReactions[message.author.id];
  if (!emojis) return;

  const now = Date.now();

  if (!reactCooldown.has(message.author.id)) {
    reactCooldown.set(message.author.id, new Map());
  }

  const userMap = reactCooldown.get(message.author.id);

  for (const emoji of emojis) {
    const last = userMap.get(emoji);
    if (last && now - last < COOLDOWN_TIME) continue;

    try {
      await message.react(emoji);
      userMap.set(emoji, now);
    } catch {}
  }
});

// ================= SNIPE =================
let snipedMessages = {};

client.on("messageDelete", (message) => {
  if (!message.guild || message.author?.bot) return;

  snipedMessages[message.channel.id] = {
    content: message.content,
    author: message.author.tag
  };
});

// ================= JOIN / LEAVE =================
client.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.get(notificationChannelId);
  if (channel) channel.send(`🎉 Welcome ${member.user.tag}!`);

  const role = member.guild.roles.cache.get(autoRoleId);
  if (role) await member.roles.add(role).catch(() => {});
});

client.on("guildMemberRemove", (member) => {
  const channel = member.guild.channels.cache.get(notificationChannelId);
  if (channel) channel.send(`👋 ${member.user.tag} left the server.`);
});

// ================= SLASH COMMANDS =================
const commands = [

  new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),

  new SlashCommandBuilder().setName("members").setDescription("Show member count"),

  new SlashCommandBuilder().setName("snipe").setDescription("See last deleted message"),

  new SlashCommandBuilder()
    .setName("togglereacts")
    .setDescription("Toggle reaction system"),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban by ID")
    .addStringOption(option =>
      option.setName("userid").setDescription("User ID").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear messages")
    .addIntegerOption(option =>
      option.setName("amount").setDescription("1-100").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(option =>
      option.setName("minutes").setDescription("Minutes").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true))
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set reminder")
    .addIntegerOption(option =>
      option.setName("seconds").setDescription("Seconds").setRequired(true))
    .addStringOption(option =>
      option.setName("text").setDescription("Reminder text").setRequired(true)),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Bot says something")
    .addStringOption(option =>
      option.setName("text").setDescription("Text").setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log("Slash commands registered ✅");
})();

// ================= INTERACTION HANDLER =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "shutdown") {

    // OWNER CHECK
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({
        content: "❌ Ye command sirf bot owner use kar sakta hai.",
        ephemeral: true
      });
    }

    await interaction.reply("✅ Bot shutdown ho raha hai...");
    process.exit();
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "ping")
    return interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);

  if (commandName === "members")
    return interaction.reply(`👥 Total Members: ${interaction.guild.memberCount}`);

  if (commandName === "snipe") {
    const data = snipedMessages[interaction.channel.id];
    if (!data) return interaction.reply("No deleted message ❌");
    return interaction.reply(`🗑 ${data.author}: ${data.content}`);
  }

  if (commandName === "togglereacts") {
    if (interaction.user.id !== ownerId)
      return interaction.reply("Owner only ❌");
    reactEnabled = !reactEnabled;
    return interaction.reply(
      `Reactions are now ${reactEnabled ? "ON ✅" : "OFF ❌"}`
    );
  }

  if (commandName === "kick") {
    const user = interaction.options.getMember("user");
    await user.kick();
    return interaction.reply(`✅ ${user.user.tag} kicked.`);
  }

  if (commandName === "ban") {
    const user = interaction.options.getMember("user");
    await user.ban();
    return interaction.reply(`✅ ${user.user.tag} banned.`);
  }

  if (commandName === "unban") {
    const id = interaction.options.getString("userid");
    await interaction.guild.members.unban(id);
    return interaction.reply("✅ User unbanned.");
  }

  if (commandName === "clear") {
    const amount = interaction.options.getInteger("amount");
    await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `Deleted ${amount} messages`, ephemeral: true });
  }

  if (commandName === "timeout") {
    const user = interaction.options.getMember("user");
    const minutes = interaction.options.getInteger("minutes");
    await user.timeout(minutes * 60 * 1000);
    return interaction.reply(`⏳ ${user.user.tag} timeout ${minutes} min.`);
  }

  if (commandName === "warn") {
    const user = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "No reason";
    await user.send(`⚠ You were warned: ${reason}`).catch(() => {});
    return interaction.reply(`⚠ ${user.user.tag} warned.`);
  }

  if (commandName === "remind") {
    const seconds = interaction.options.getInteger("seconds");
    const text = interaction.options.getString("text");
    interaction.reply(`⏳ Reminder set for ${seconds}s`);
    setTimeout(() => {
      interaction.followUp(`⏰ Reminder: ${text}`);
    }, seconds * 1000);
  }

  if (commandName === "say") {
    if (interaction.user.id !== ownerId)
      return interaction.reply("Owner only ❌");
    const text = interaction.options.getString("text");
    return interaction.reply(text);
  }
});

client.once("ready", () =>
  console.log(`Logged in as ${client.user.tag}`)
);

client.login(process.env.TOKEN);
