const express = require("express");
const app = express();

// ---- Web server (Render ke liye) ----
app.get("/", (req, res) => {
  res.send("Bot is running 🔥");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Web server started");
});

// ---- Discord Bot ----
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// 🔥 REACT ON EVERY MESSAGE
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    await message.react("🔥");
  } catch (err) {
    console.log("Reaction failed:", err.message);
  }
});

client.login(process.env.TOKEN);

