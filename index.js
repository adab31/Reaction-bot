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
const ownerIds = ["1414100097590890588", "1452326637604573376"];
const guildId = "1464580639620727030";
const notificationChannelId = "1464603388196032626";
const autoRoleId = "1464585250964242494";
const PREFIX = "!";

let reactEnabled = true;
const userReactions = {
  "1414100097590890588": ["🔥","😎","❤️"],
  "1464583967385714854": ["💀","😂","🐷"],
  "1467125413967958018": ["❤️","💦","🌈"]
};

const badWords = ["suar","gaandu","bhadu","kutte","chutiya","mc","bc"];
const reactCooldown = new Map();
const COOLDOWN_TIME = 20000;

// ================= PERMISSION SYSTEM =================
const PERMISSION_FILE = "./permissions.json";
let commandPermissions = {};
if (fs.existsSync(PERMISSION_FILE)) {
  try { commandPermissions = JSON.parse(fs.readFileSync(PERMISSION_FILE,"utf8")); }
  catch { commandPermissions = {}; }
} else fs.writeFileSync(PERMISSION_FILE, JSON.stringify({},null,2));

function savePermissions(){
  fs.writeFileSync(PERMISSION_FILE, JSON.stringify(commandPermissions,null,2));
}

const allCommandsList = [
"ping","members","snipe","snipeall","snipelist","togglereacts",
"kick","ban","unban","clear","timeout","warn","remind",
"move","spam","give","revoke","help","say"
];

// ================= SNIPE =================
let snipedMessages = {};
const MAX_SNIPES = 10;

// ================= MESSAGE CREATE =================
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const msgLower = message.content.toLowerCase();

  // BAD WORD FILTER
  if (badWords.some(word => msgLower.includes(word))) {
    await message.delete().catch(()=>{});
    return message.channel.send(`${message.author}, bad words allowed nahi 🚫`);
  }

  // AUTO REACTIONS
  if (reactEnabled) {
    const emojis = userReactions[message.author.id];
    if (emojis) {
      const now = Date.now();
      if (!reactCooldown.has(message.author.id))
        reactCooldown.set(message.author.id,new Map());

      const userMap = reactCooldown.get(message.author.id);
      for (const emoji of emojis) {
        const last = userMap.get(emoji);
        if (!last || now-last>=COOLDOWN_TIME) {
          try { await message.react(emoji); userMap.set(emoji,now); } catch {}
        }
      }
    }
  }
});

// ================= MESSAGE DELETE =================
client.on("messageDelete",(message)=>{
  if (!message.guild || message.author?.bot) return;

  const channelId = message.channel.id;
  if (!snipedMessages[channelId]) snipedMessages[channelId]=[];

  snipedMessages[channelId].unshift({
    content: message.content,
    author: message.author.tag,
    timestamp: new Date()
  });

  if (snipedMessages[channelId].length>MAX_SNIPES)
    snipedMessages[channelId].pop();
});

// ================= MEMBER EVENTS =================
client.on("guildMemberAdd", async(member)=>{
  const channel = member.guild.channels.cache.get(notificationChannelId);
  if(channel) channel.send(`🎉 Welcome ${member.user.tag}!`);

  const role = member.guild.roles.cache.get(autoRoleId);
  if(role) await member.roles.add(role).catch(()=>{});
});

client.on("guildMemberRemove",(member)=>{
  const channel = member.guild.channels.cache.get(notificationChannelId);
  if(channel) channel.send(`👋 ${member.user.tag} left the server.`);
});

// ================= SLASH COMMANDS =================
const commands = [

new SlashCommandBuilder()
.setName("say")
.setDescription("Send anonymous message")
.addStringOption(opt =>
  opt.setName("text")
  .setDescription("Message")
  .setRequired(true)
),

new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),
new SlashCommandBuilder().setName("members").setDescription("Show member count"),
new SlashCommandBuilder().setName("snipe").setDescription("See last deleted message"),
// ⚠️ BAQI SAB COMMANDS SAME RAHENGE (tumhare original wale)
];

const rest = new REST({version:"10"}).setToken(process.env.TOKEN);

(async()=>{
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    {body:commands}
  );
  console.log("Slash commands registered ✅");
})();

// ================= INTERACTION =================
client.on("interactionCreate", async(interaction)=>{
  if(!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const command = interaction.commandName;
  const isOwner = ownerIds.includes(userId);

  const hasPermission =
    isOwner || (commandPermissions[command]?.includes(userId));

  if (!hasPermission && !["help"].includes(command)) {
    return interaction.reply({
      content:"❌ You don't have permission.",
      ephemeral:true
    });
  }

  // ===== ANONYMOUS SAY =====
  if(command==="say"){
    const text = interaction.options.getString("text");

    await interaction.reply({
      content:"✅ Message sent anonymously",
      ephemeral:true
    });

    const webhook = await interaction.channel.createWebhook({
      name: client.user.username,
      avatar: client.user.displayAvatarURL()
    });

    await webhook.send({
      content:text,
      username:"Server",
      avatarURL:client.user.displayAvatarURL()
    });

    webhook.delete().catch(()=>{});
  }

  if(command==="ping")
    return interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);

  if(command==="members")
    return interaction.reply(`👥 Total Members: ${interaction.guild.memberCount}`);

  if(command==="snipe"){
    const data = snipedMessages[interaction.channel.id]?.[0];
    return interaction.reply(
      data ? `🗑 ${data.author}: ${data.content}` : "No deleted message ❌"
    );
  }

});

// ================= READY =================
client.once("ready",()=>{
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
