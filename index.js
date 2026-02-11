const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Web server started"));

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// 🔥 Multiple reaction emojis
const emojis = ["🔥", "😎", "😂", "💯"];

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  await message.react(randomEmoji);
});

// 📢 YAHAN APNA CHANNEL ID DAALO
const notificationChannelId = "1464603388196032626";

// 👋 JOIN MESSAGE
client.on("guildMemberAdd", (member) => {
  const channel = member.guild.channels.cache.get(notificationChannelId);
  if (channel) {
    channel.send(`🎉 Welcome ${member.user} to the server!`);
  }
});

// 👋 LEAVE MESSAGE
client.on("guildMemberRemove", (member) => {
  const channel = member.guild.channels.cache.get(notificationChannelId);
  if (channel) {
    channel.send(`😢 ${member.user.tag} left the server.`);
  }
});

client.login(process.env.TOKEN);
