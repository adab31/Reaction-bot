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

// ====== SETTINGS ======
const notificationChannelId = "1464603388196032626";
const autoRoleId = "1464585250964242494";
const badWords = ["suar", "gaandu", "bhadu", "kutte", "chutiya", "bsdk", "mc", "bc", "dalle"];
// ======================

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


// 🔥 Auto Fire React
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  await message.react("🐷");
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
