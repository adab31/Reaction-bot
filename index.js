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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates // Needed for moving members
  ]
});

// ================= SETTINGS =================
const ownerId = "1414100097590890588"; // ✅ Only this user can run commands
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
const PREFIX = "!"; // Prefix for custom commands

// ================= REACTION SYSTEM =================
const reactCooldown = new Map();
const COOLDOWN_TIME = 20000;

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const isOwner = message.author.id === ownerId;

  // ===== BAD WORD FILTER =====
  const msgLower = message.content.toLowerCase();
  if (badWords.some(word => msgLower.includes(word))) {
    await message.delete().catch(() => {});
    return message.channel.send(`${message.author}, bad words allowed nahi 🚫`);
  }

  // ===== REACTION SYSTEM =====
  if (reactEnabled) {
    const emojis = userReactions[message.author.id];
    if (emojis) {
      const now = Date.now();
      if (!reactCooldown.has(message.author.id)) reactCooldown.set(message.author.id, new Map());
      const userMap = reactCooldown.get(message.author.id);
      for (const emoji of emojis) {
        const last = userMap.get(emoji);
        if (!last || now - last >= COOLDOWN_TIME) {
          try { await message.react(emoji); userMap.set(emoji, now); } catch {}
        }
      }
    }
  }

  // ===== PREFIX COMMANDS =====
  if (message.content.startsWith(PREFIX)) {
    if (!isOwner) return; // Only owner can run prefix commands
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==== SAY COMMAND ====
    if (command === "say") {
      const text = args.join(" ");
      if (!text) return;
      await message.delete().catch(() => {});
      message.channel.send(text);
    }

    // ==== SPAM COMMAND ====
    if (command === "spam") {
      // Usage: !spam <count> <delay(ms)> <message>
      const count = parseInt(args[0]);
      const delay = parseInt(args[1]);
      const spamMessage = args.slice(2).join(" ");

      if (!count || count <= 0 || !delay || delay < 0 || !spamMessage) {
        return message.channel.send("Usage: `!spam <count> <delay(ms)> <message>`");
      }

      await message.delete().catch(() => {});
      for (let i = 0; i < count; i++) {
        message.channel.send(spamMessage);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
});

// ================= SNIPE SYSTEM =================
let snipedMessages = {}; // channelId => array of { content, author, timestamp }
const MAX_SNIPES = 10;

client.on("messageDelete", (message) => {
  if (!message.guild || message.author?.bot) return;
  const channelId = message.channel.id;
  if (!snipedMessages[channelId]) snipedMessages[channelId] = [];

  snipedMessages[channelId].unshift({
    content: message.content,
    author: message.author.tag,
    timestamp: new Date()
  });

  if (snipedMessages[channelId].length > MAX_SNIPES) snipedMessages[channelId].pop();
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

  // Snipe commands
  new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("See last deleted message in this channel"),

  new SlashCommandBuilder()
    .setName("snipeall")
    .setDescription("See last deleted message in the server"),

  new SlashCommandBuilder()
    .setName("snipelist")
    .setDescription("See a list of last deleted messages in this channel")
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("Number of messages to show (1-10)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("togglereacts")
    .setDescription("Toggle reaction system"),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true)),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true)),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban by ID")
    .addStringOption(option =>
      option.setName("userid").setDescription("User ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear messages")
    .addIntegerOption(option =>
      option.setName("amount").setDescription("1-100").setRequired(true)),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(option =>
      option.setName("minutes").setDescription("Minutes").setRequired(true)),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true))
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason").setRequired(false)),

  new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set reminder")
    .addIntegerOption(option =>
      option.setName("seconds").setDescription("Seconds").setRequired(true))
    .addStringOption(option =>
      option.setName("text").setDescription("Reminder text").setRequired(true)),

  // ✅ MOVE COMMAND
  new SlashCommandBuilder()
    .setName("move")
    .setDescription("Move a member to a voice channel")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to move")
        .setRequired(true))
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Voice channel to move to")
        .setRequired(true)
        .addChannelTypes(2)) // 2 = Voice Channel
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

  if (interaction.user.id !== ownerId)
    return interaction.reply({ content: "❌ Only bot owner can use commands.", ephemeral: true });

  const { commandName } = interaction;

  // ================= SNIPE COMMANDS =================
  if (commandName === "snipe") {
    const data = snipedMessages[interaction.channel.id]?.[0];
    if (!data) return interaction.reply("No deleted message ❌");
    return interaction.reply(`🗑 ${data.author}: ${data.content}`);
  }

  if (commandName === "snipeall") {
    let lastMessage = null;
    for (const msgs of Object.values(snipedMessages)) {
      if (msgs.length > 0) {
        if (!lastMessage || msgs[0].timestamp > lastMessage.timestamp) {
          lastMessage = msgs[0];
        }
      }
    }
    if (!lastMessage) return interaction.reply("No deleted messages ❌");
    return interaction.reply(`🗑 ${lastMessage.author}: ${lastMessage.content}`);
  }

  if (commandName === "snipelist") {
    const amount = interaction.options.getInteger("amount") || 5;
    const msgs = snipedMessages[interaction.channel.id];
    if (!msgs || msgs.length === 0) return interaction.reply("No deleted messages ❌");
    const list = msgs.slice(0, amount).map((m, i) => `\`${i+1}\` 🗑 ${m.author}: ${m.content}`).join("\n");
    return interaction.reply(list);
  }

  // ================= OTHER COMMANDS =================
  if (commandName === "shutdown") {
    await interaction.reply("✅ Bot shutdown ho raha hai...");
    process.exit();
  }

  if (commandName === "ping")
    return interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);

  if (commandName === "members")
    return interaction.reply(`👥 Total Members: ${interaction.guild.memberCount}`);

  if (commandName === "togglereacts") {
    reactEnabled = !reactEnabled;
    return interaction.reply(`Reactions are now ${reactEnabled ? "ON ✅" : "OFF ❌"}`);
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

  // ================= MOVE COMMAND =================
  if (commandName === "move") {
    const member = interaction.options.getMember("user");
    const channel = interaction.options.getChannel("channel");
    if (!member.voice.channel)
      return interaction.reply({ content: "❌ This user is not in a voice channel.", ephemeral: true });

    try {
      await member.voice.setChannel(channel);
      return interaction.reply(`✅ Moved ${member.user.tag} to ${channel.name}`);
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "❌ I couldn't move this member. Make sure I have permissions.", ephemeral: true });
    }
  }
});

client.once("ready", () =>
  console.log(`Logged in as ${client.user.tag}`)
);

client.login(process.env.TOKEN);
