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
    GatewayIntentBits.MessageContent
  ]
});

const emojis = ["🔥", "😎", "😂", "💯"];

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  await message.react(randomEmoji);
});

client.login(process.env.TOKEN);

