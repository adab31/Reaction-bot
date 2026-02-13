require("dotenv").config();
const fs = require("fs");
const express = require("express");
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
const ownerIds = ["1414100097590890588", "1452326637604573376"]; // ✅ Both owners
const guildId = "1464580639620727030";
const notificationChannelId = "1464603388196032626";
const autoRoleId = "1464585250964242494";
const PREFIX = "!"; 

let reactEnabled = true;
const userReactions = {
  "1414100097590890588": ["🔥", "😎", "❤️"],
  "1464583967385714854": ["💀", "😂", "🐷"],
  "1467125413967958018": ["❤️", "💦", "🌈"]
};
const badWords = ["suar", "gaandu", "bhadu", "kutte", "chutiya", "mc", "bc"];
const reactCooldown = new Map();
const COOLDOWN_TIME = 20000;

// ================= PERMISSIONS SYSTEM =================
const PERMISSION_FILE = "./permissions.json";
let commandPermissions = {};
if (fs.existsSync(PERMISSION_FILE)) {
  try { commandPermissions = JSON.parse(fs.readFileSync(PERMISSION_FILE, "utf8")); } 
  catch { commandPermissions = {}; fs.writeFileSync(PERMISSION_FILE, JSON.stringify(commandPermissions, null, 2)); }
} else fs.writeFileSync(PERMISSION_FILE, JSON.stringify(commandPermissions, null, 2));

function savePermissions() { fs.writeFileSync(PERMISSION_FILE, JSON.stringify(commandPermissions, null, 2)); }

const allCommandsList = [
  "ping","members","snipe","snipeall","snipelist","togglereacts",
  "kick","ban","unban","clear","timeout","warn","remind",
  "move","spam","give","revoke","help","say"
];

// ================= SNIPE SYSTEM =================
let snipedMessages = {};
const MAX_SNIPES = 10;

// ================= MESSAGE CREATE =================
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const isOwner = ownerIds.includes(message.author.id);

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
    if (!isOwner) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "say") {
      const text = args.join(" ");
      if (!text) return;
      await message.delete().catch(() => {});
      message.channel.send(text);
    }
  }
});

// ================= MESSAGE DELETE =================
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

// ================= MEMBER JOIN/LEAVE =================
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
  new SlashCommandBuilder().setName("snipe").setDescription("See last deleted message in this channel"),
  new SlashCommandBuilder().setName("snipeall").setDescription("See last deleted message in the server"),
  new SlashCommandBuilder()
    .setName("snipelist")
    .setDescription("See a list of last deleted messages")
    .addIntegerOption(opt => opt.setName("amount").setDescription("1-10").setRequired(false)),
  new SlashCommandBuilder().setName("togglereacts").setDescription("Toggle reaction system"),
  new SlashCommandBuilder().setName("kick").setDescription("Kick a member")
    .addUserOption(opt => opt.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder().setName("ban").setDescription("Ban a member")
    .addUserOption(opt => opt.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder().setName("unban").setDescription("Unban by ID")
    .addStringOption(opt => opt.setName("userid").setDescription("User ID").setRequired(true)),
  new SlashCommandBuilder().setName("clear").setDescription("Clear messages")
    .addIntegerOption(opt => opt.setName("amount").setDescription("1-100").setRequired(true)),
  new SlashCommandBuilder().setName("timeout").setDescription("Timeout a member")
    .addUserOption(opt => opt.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(opt => opt.setName("minutes").setDescription("Minutes").setRequired(true)),
  new SlashCommandBuilder().setName("warn").setDescription("Warn a member")
    .addUserOption(opt => opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder().setName("remind").setDescription("Set reminder")
    .addIntegerOption(opt => opt.setName("seconds").setDescription("Seconds").setRequired(true))
    .addStringOption(opt => opt.setName("text").setDescription("Reminder text").setRequired(true)),
  new SlashCommandBuilder().setName("move").setDescription("Move a member to voice")
    .addUserOption(opt => opt.setName("user").setDescription("User").setRequired(true))
    .addChannelOption(opt => opt.setName("channel").setDescription("Voice channel").setRequired(true).addChannelTypes(2)),
  new SlashCommandBuilder().setName("spam").setDescription("Spam message with delay")
    .addStringOption(opt => opt.setName("message").setDescription("Text").setRequired(true))
    .addIntegerOption(opt => opt.setName("count").setDescription("Times").setRequired(true))
    .addStringOption(opt => opt.setName("delay").setDescription("3s, 5m, 1h").setRequired(true)),
  new SlashCommandBuilder().setName("give").setDescription("Give command permission")
    .addUserOption(opt => opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt => opt.setName("command").setDescription("Command name").setRequired(true)),
  new SlashCommandBuilder().setName("revoke").setDescription("Revoke command permission")
    .addUserOption(opt => opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt => opt.setName("command").setDescription("Command name").setRequired(true)),
  new SlashCommandBuilder().setName("help").setDescription("Show available commands"),
  new SlashCommandBuilder()
  .setName("say")
  .setDescription("Send anonymous message")
  .addStringOption(opt =>
    opt.setName("text")
      .setDescription("Message to send anonymously")
      .setRequired(true)
  ),
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log("Slash commands registered ✅");
})();

// ================= INTERACTION HANDLER =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;
  const command = interaction.commandName;
  const isOwner = ownerIds.includes(userId);

  const hasPermission = isOwner || (commandPermissions[command]?.includes(userId));

  if (!hasPermission && !["help"].includes(command)) {
    return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
  }

  // ===== COMMANDS =====
  if (command === "help") {
    const allowedCommands = isOwner ? allCommandsList : allCommandsList.filter(c => commandPermissions[c]?.includes(userId));
    return interaction.reply({ content: "Available commands:\n" + allowedCommands.map(c => `/${c}`).join("\n"), ephemeral: true });
  }
  // ===== ANONYMOUS SAY =====
if (command === "say") {

  const text = interaction.options.getString("text");

  // user ko private reply
  await interaction.reply({
    content: "✅ Message sent anonymously",
    ephemeral: true
  });

  try {
    // webhook create (anonymous sender)
    const webhook = await interaction.channel.createWebhook({
      name: client.user.username,
      avatar: client.user.displayAvatarURL()
    });

    await webhook.send({
      content: text,
      username: "Server",
      avatarURL: client.user.displayAvatarURL()
    });

    // delete webhook after send
    webhook.delete().catch(()=>{});

  } catch (err) {
    console.log(err);
  }
}

  // Snipe
  if (command === "snipe") {
    const data = snipedMessages[interaction.channel.id]?.[0];
    return interaction.reply(data ? `🗑 ${data.author}: ${data.content}` : "No deleted message ❌");
  }
  if (command === "snipeall") {
    let lastMessage = null;
    for (const msgs of Object.values(snipedMessages)) {
      if (msgs.length > 0 && (!lastMessage || msgs[0].timestamp > lastMessage.timestamp)) lastMessage = msgs[0];
    }
    return interaction.reply(lastMessage ? `🗑 ${lastMessage.author}: ${lastMessage.content}` : "No deleted messages ❌");
  }
  if (command === "snipelist") {
    const amount = interaction.options.getInteger("amount") || 5;
    const msgs = snipedMessages[interaction.channel.id];
    if (!msgs || msgs.length === 0) return interaction.reply("No deleted messages ❌");
    return interaction.reply(msgs.slice(0, amount).map((m,i)=> `\`${i+1}\` 🗑 ${m.author}: ${m.content}`).join("\n"));
  }

  if (command === "ping") return interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
  if (command === "members") return interaction.reply(`👥 Total Members: ${interaction.guild.memberCount}`);
  if (command === "togglereacts") { reactEnabled = !reactEnabled; return interaction.reply(`Reactions now ${reactEnabled ? "ON ✅" : "OFF ❌"}`); }

  if (command === "kick") { const user = interaction.options.getMember("user"); await user.kick(); return interaction.reply(`✅ ${user.user.tag} kicked.`); }
  if (command === "ban") { const user = interaction.options.getMember("user"); await user.ban(); return interaction.reply(`✅ ${user.user.tag} banned.`); }
  if (command === "unban") { const id = interaction.options.getString("userid"); await interaction.guild.members.unban(id); return interaction.reply("✅ User unbanned."); }
  if (command === "clear") { const amount = interaction.options.getInteger("amount"); await interaction.channel.bulkDelete(amount, true); return interaction.reply({ content: `Deleted ${amount} messages`, ephemeral: true }); }
  if (command === "timeout") { const user = interaction.options.getMember("user"); const minutes = interaction.options.getInteger("minutes"); await user.timeout(minutes*60*1000); return interaction.reply(`⏳ ${user.user.tag} timeout ${minutes} min.`); }
  if (command === "warn") { const user = interaction.options.getMember("user"); const reason = interaction.options.getString("reason")||"No reason"; await user.send(`⚠ You were warned: ${reason}`).catch(()=>{}); return interaction.reply(`⚠ ${user.user.tag} warned.`); }
  if (command === "remind") { const seconds = interaction.options.getInteger("seconds"); const text = interaction.options.getString("text"); interaction.reply(`⏳ Reminder set for ${seconds}s`); setTimeout(()=>{ interaction.followUp(`⏰ Reminder: ${text}`); }, seconds*1000); }

  if (command === "move") {
    const member = interaction.options.getMember("user");
    const channel = interaction.options.getChannel("channel");
    if (!member.voice.channel) return interaction.reply({ content: "❌ User not in voice channel", ephemeral: true });
    try { await member.voice.setChannel(channel); return interaction.reply(`✅ Moved ${member.user.tag} to ${channel.name}`); } 
    catch { return interaction.reply({ content: "❌ Couldn't move member", ephemeral: true }); }
  }

  // ================= SPAM COMMAND UPDATED =================
  if (command === "spam") {
    const text = interaction.options.getString("message");
    const count = interaction.options.getInteger("count");
    const delayInput = interaction.options.getString("delay").toLowerCase();
    let delayMs = 0;
    if (delayInput.endsWith("s")) delayMs = parseInt(delayInput)*1000;
    else if (delayInput.endsWith("m")) delayMs = parseInt(delayInput)*60000;
    else if (delayInput.endsWith("h")) delayMs = parseInt(delayInput)*3600000;
    else return interaction.reply("❌ Invalid delay format. Use 3s, 5m, 1h");

    // Delete user's original command
    try { await interaction.delete(); } catch {}

    // Start spamming
    interaction.channel.send(`⏳ Starting spam of ${count} messages`);
    for (let i=0;i<count;i++){
      setTimeout(()=>{ interaction.channel.send(text); }, delayMs*i);
    }
  }

  if (command === "give") {
    if (!isOwner) return interaction.reply({ content: "❌ Only owner can give permissions.", ephemeral: true });
    const targetUser = interaction.options.getUser("user");
    const cmdName = interaction.options.getString("command").toLowerCase();
    if (!allCommandsList.includes(cmdName)) return interaction.reply({ content: "❌ Invalid command.", ephemeral: true });
    if (!commandPermissions[cmdName]) commandPermissions[cmdName] = [];
    if (!commandPermissions[cmdName].includes(targetUser.id)) { commandPermissions[cmdName].push(targetUser.id); savePermissions(); }
    return interaction.reply({ content: `✅ ${targetUser.tag} can now use /${cmdName}`, ephemeral: true });
  }

  if (command === "revoke") {
    if (!isOwner) return interaction.reply({ content: "❌ Only owner can revoke permissions.", ephemeral: true });
    const targetUser = interaction.options.getUser("user");
    const cmdName = interaction.options.getString("command").toLowerCase();
    if (!allCommandsList.includes(cmdName)) return interaction.reply({ content: "❌ Invalid command.", ephemeral: true });
    if (commandPermissions[cmdName]) { commandPermissions[cmdName] = commandPermissions[cmdName].filter(id => id!==targetUser.id); savePermissions(); }
    return interaction.reply({ content: `✅ ${targetUser.tag} can no longer use /${cmdName}`, ephemeral: true });
  }

});

// ================= BOT READY =================
client.once("ready", () => console.log(`Logged in as ${client.user.tag}`));
client.login(process.env.TOKEN);
