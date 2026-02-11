const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
require("dotenv").config();

// ===== EXPRESS SERVER FOR RENDER =====
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});
// =====================================


// ===== DISCORD BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});


let snipedMessages = {};
client.on("messageDelete", (message) => {
  if (!message.guild) return;
  if (!message.author || message.author.bot) return;

  snipedMessages[message.channel.id] = {
    content: message.content,
    author: message.author.tag,
    avatar: message.author.displayAvatarURL({ dynamic: true }),
    createdAt: message.createdAt
  };
});
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args[0].toLowerCase();

  // ===== SNIPE COMMAND YAHAN HOGA =====

  if (command === "?snipe") {

    const data = snipedMessages[message.channel.id];

    if (!data) {
      return message.reply("❌ Is channel me koi recent deleted message nahi mila.");
    }

    const embed = {
      color: 0xff0000,
      author: {
        name: data.author,
        icon_url: data.avatar
      },
      description: data.content || "No text",
      footer: {
        text: "Deleted message"
      },
      timestamp: new Date()
    };

    message.channel.send({ embeds: [embed] });
  }

});


// ====== SETTINGS ======
const notificationChannelId = "1464603388196032626";
const autoRoleId = "1464585250964242494";
const badWords = ["suar", "gaandu", "bhadu", "kutte", "chutiya", "bsdk", "mc", "bc", "dalle"];
// ======================

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


// ================= CUSTOM USER REACT SYSTEM =================

const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ======================= TOGGLE FEATURE =======================
let reactEnabled = true; // initially ON

// ======================= USER REACTIONS =======================
const userReactions = {
    "1414100097590890588": ["🔥", "😎", "❤️"],   // User 1
    "1464583967385714854": ["💀", "😂", "🐷"],   // User 2
    "1467125413967958018": ["❤️", "💦", "🌈"]    // User 3
};

// ======================= CUSTOM COOLDOWN =======================
const reactCooldown = new Map();
const COOLDOWN_TIME = 20000; // 20 seconds per emoji

// ======================= MESSAGE LISTENER =======================
client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;

    // ----------------- TOGGLE COMMAND -----------------
    if (message.content.toLowerCase() === "!togglereacts") {
        reactEnabled = !reactEnabled;
        message.channel.send(`Reacts are now ${reactEnabled ? "ON ✅" : "OFF ❌"}`);
        return;
    }

    // ----------------- CHECK IF REACTS ENABLED -----------------
    if (!reactEnabled) return;

    // ----------------- CHECK USER REACTIONS -----------------
    const emojis = userReactions[message.author.id];
    if (!emojis) return;

    const now = Date.now();

    // ----------------- GET USER MAP FOR COOLDOWN -----------------
    if (!reactCooldown.has(message.author.id)) {
        reactCooldown.set(message.author.id, new Map());
    }
    const userMap = reactCooldown.get(message.author.id);

    // ----------------- LOOP THROUGH EMOJIS -----------------
    for (const emoji of emojis) {
        const lastReact = userMap.get(emoji);

        // Skip if in cooldown
        if (lastReact && now - lastReact < COOLDOWN_TIME) continue;

        try {
            await message.react(emoji);
            userMap.set(emoji, now); // update cooldown
        } catch (err) {
            console.error(`Couldn't react with ${emoji}:`, err);
        }
    }
});


// ⏰ PRO Reminder System
client.on("messageCreate", (message) => {
  if (!message.content.startsWith("?remind")) return;
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const timeInput = args[1];
  const text = args.slice(2).join(" ");

  if (!timeInput || !text) {
    return message.reply("Format: ?remind 10s hello");
  }

  const timeValue = parseInt(timeInput);
  const timeUnit = timeInput.slice(-1);

  let milliseconds;

  if (timeUnit === "s") {
    milliseconds = timeValue * 1000;
  } else if (timeUnit === "m") {
    milliseconds = timeValue * 60000;
  } else if (timeUnit === "h") {
    milliseconds = timeValue * 3600000;
  } else {
    return message.reply("Use s (seconds), m (minutes), h (hours)\nExample: ?remind 5m hello");
  }

  message.reply(`⏳ Reminder set for ${timeInput}`);

  setTimeout(() => {
    message.reply(`⏰ Reminder: ${text}`);
  }, milliseconds);
});


// 👥 Member Count
client.on("messageCreate", (message) => {
  if (message.content === "!members") {
    message.channel.send(`👥 Total Members: ${message.guild.memberCount}`);
  }
});


// 🚫 Bad Word Filter
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();
  if (badWords.some(word => msg.includes(word))) {
    message.delete();
    message.channel.send(`${message.author}, bad words allowed nahi 🚫`);
  }
});


// ================= MODERATION COMMANDS =================

client.on("messageCreate", async (message) => {

  if (!message.guild) return;
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args[0].toLowerCase();

  // ===== KICK =====
  if (command === "?kick") {
    if (!message.member.permissions.has("KickMembers"))
      return message.reply("❌ Tumhe KickMembers permission nahi hai.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("User mention karo.");

    await member.kick();
    message.channel.send(`✅ ${member.user.tag} ko kick kar diya.`);
  }

  // ===== BAN =====
  if (command === "?ban") {
    if (!message.member.permissions.has("BanMembers"))
      return message.reply("❌ Tumhe BanMembers permission nahi hai.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("User mention karo.");

    await member.ban();
    message.channel.send(`✅ ${member.user.tag} ko ban kar diya.`);
  }

  // ===== UNBAN =====
  if (command === "?unban") {
    if (!message.member.permissions.has("BanMembers"))
      return message.reply("❌ Tumhe BanMembers permission nahi hai.");

    const userId = args[1];
    if (!userId) return message.reply("User ID do.");

    await message.guild.members.unban(userId);
    message.channel.send("✅ User unban ho gaya.");
  }

  // ===== CLEAR =====
  if (command === "?clear") {
    if (!message.member.permissions.has("ManageMessages"))
      return message.reply("❌ Tumhe ManageMessages permission nahi hai.");

    const amount = parseInt(args[1]);
    if (!amount || amount > 100)
      return message.reply("1-100 ke beech number likho.");

    await message.channel.bulkDelete(amount, true);
    message.channel.send(`✅ ${amount} messages delete kar diye.`);
  }

  // ===== TIMEOUT =====
  if (command === "?timeout") {
    if (!message.member.permissions.has("ModerateMembers"))
      return message.reply("❌ Tumhe ModerateMembers permission nahi hai.");

    const member = message.mentions.members.first();
    const minutes = parseInt(args[2]);

    if (!member) return message.reply("User mention karo.");
    if (!minutes) return message.reply("Minutes likho.");

    await member.timeout(minutes * 60 * 1000);
    message.channel.send(`⏳ ${member.user.tag} ko ${minutes} minute timeout diya.`);
  }

  // ===== WARN =====
  if (command === "?warn") {
    if (!message.member.permissions.has("ManageMessages"))
      return message.reply("❌ Tumhe permission nahi hai.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("User mention karo.");

    const reason = args.slice(2).join(" ") || "No reason";

    member.send(`⚠ Tumhe warn diya gaya hai.\nReason: ${reason}`).catch(() => {});
    message.channel.send(`⚠ ${member.user.tag} ko warn diya.`);
  }

});


// 🎉 Join
client.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.get(notificationChannelId);

  if (channel) {
    channel.send(`🎉 Welcome ${member.user.tag}!`);
  }

  const role = member.guild.roles.cache.get(autoRoleId);
  if (role) {
    await member.roles.add(role);
  }

  member.send(`Welcome to ${member.guild.name} 🎉`);
});


// 👋 Leave
client.on("guildMemberRemove", (member) => {
  const channel = member.guild.channels.cache.get(notificationChannelId);

  if (channel) {
    channel.send(`👋 ${member.user.tag} left the server.`);
  }
});


const ownerId = "1414100097590890588";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith("?say")) return;

  if (message.author.id !== ownerId) {
    return message.reply("❌ Tum is command ko use nahi kar sakte.");
  }

  const text = message.content.slice(5).trim();

  if (!text) {
    return message.reply("Message likho bhi.");
  }

  message.delete(); // tumhara original message delete karega
  message.channel.send(text); // bot message bhejega
});


client.login(process.env.TOKEN);
