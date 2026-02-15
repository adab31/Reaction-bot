require("dotenv").config();
const fs = require("fs");
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const express = require("express");

// ================= EXPRESS =================
const app = express();
app.get("/", (req, res) => res.send("Bot Running 🚀"));
app.listen(process.env.PORT || 3000, () => console.log("Web server started"));

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
const notificationChannelId = "1464603388196032626";
const autoRoleId = "1464585250964242494";

let reactEnabled = true;
const userReactions = {
  "1414100097590890588": ["🔥","😎","❤️"],
  "1464583967385714854": ["💀","😂","🐷"],
  "1467125413967958018": ["❤️","💦","🌈"]
};
const reactCooldown = new Map();
const COOLDOWN_TIME = 20000;

const badWords = ["suar","gaandu","bhadu","kutte","chutiya","mc","bc"];

// ================= PERMISSIONS SYSTEM =================
const PERMISSION_FILE = "./permissions.json";
let commandPermissions = fs.existsSync(PERMISSION_FILE) ? JSON.parse(fs.readFileSync(PERMISSION_FILE,"utf8")) : {};
function savePermissions(){ fs.writeFileSync(PERMISSION_FILE, JSON.stringify(commandPermissions,null,2)); }

const allCommandsList = [
  "ping","members","snipe","snipeall","snipelist","togglereacts",
  "kick","ban","unban","clear","timeout","warn","remind",
  "move","spam","give","revoke","help","say"
];

// ================= SNIPE SYSTEM =================
let snipedMessages = {};
const MAX_SNIPES = 10;

// ================= MESSAGE DELETE =================
client.on("messageDelete",(message)=>{
  if(!message.guild || message.author?.bot) return;
  const id = message.channel.id;
  if(!snipedMessages[id]) snipedMessages[id]=[];
  snipedMessages[id].unshift({
    content:message.content,
    author:message.author.tag,
    timestamp:new Date()
  });
  if(snipedMessages[id].length>MAX_SNIPES) snipedMessages[id].pop();
});

// ================= MEMBER JOIN/LEAVE =================
client.on("guildMemberAdd", async(member)=>{
  const ch = member.guild.channels.cache.get(notificationChannelId);
  if(ch){
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("🎉 New Member Joined")
      .setDescription(`${member.user.tag} joined the server!`)
      .setTimestamp();
    ch.send({embeds:[embed]});
  }
  const role = member.guild.roles.cache.get(autoRoleId);
  if(role) await member.roles.add(role).catch(()=>{});
});
client.on("guildMemberRemove",(member)=>{
  const ch = member.guild.channels.cache.get(notificationChannelId);
  if(ch){
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("👋 Member Left")
      .setDescription(`${member.user.tag} left the server.`)
      .setTimestamp();
    ch.send({embeds:[embed]});
  }
});

// ================= SLASH COMMANDS =================
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),
  new SlashCommandBuilder().setName("members").setDescription("Show member count"),
  new SlashCommandBuilder().setName("snipe").setDescription("See last deleted message"),
  new SlashCommandBuilder().setName("snipeall").setDescription("See last deleted message in server"),
  new SlashCommandBuilder()
    .setName("snipelist")
    .setDescription("See last deleted messages")
    .addIntegerOption(opt=>opt.setName("amount").setDescription("1-10").setRequired(false)),
  new SlashCommandBuilder().setName("togglereacts").setDescription("Toggle reaction system"),

  // Moderation
  new SlashCommandBuilder().setName("kick").setDescription("Kick a member")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder().setName("ban").setDescription("Ban a member")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder().setName("unban").setDescription("Unban by ID")
    .addStringOption(opt=>opt.setName("userid").setDescription("User ID").setRequired(true)),
  new SlashCommandBuilder().setName("clear").setDescription("Clear messages")
    .addIntegerOption(opt=>opt.setName("amount").setDescription("1-100").setRequired(true)),
  new SlashCommandBuilder().setName("timeout").setDescription("Timeout a member")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(opt=>opt.setName("minutes").setDescription("Minutes").setRequired(true)),
  new SlashCommandBuilder().setName("warn").setDescription("Warn a member")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt=>opt.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder().setName("remind").setDescription("Set reminder")
    .addIntegerOption(opt=>opt.setName("seconds").setDescription("Seconds").setRequired(true))
    .addStringOption(opt=>opt.setName("text").setDescription("Reminder text").setRequired(true)),
  new SlashCommandBuilder().setName("move").setDescription("Move a member to voice")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addChannelOption(opt=>opt.setName("channel").setDescription("Voice channel").setRequired(true).addChannelTypes(2)),

  // Anonymous commands
  new SlashCommandBuilder().setName("say").setDescription("Send anonymous message")
    .addStringOption(opt=>opt.setName("text").setDescription("Message").setRequired(true)),
  new SlashCommandBuilder().setName("spam").setDescription("Send anonymous spam")
    .addStringOption(opt=>opt.setName("message").setDescription("Text").setRequired(true))
    .addIntegerOption(opt=>opt.setName("count").setDescription("Times").setRequired(true))
    .addStringOption(opt=>opt.setName("delay").setDescription("3s,5m,1h").setRequired(true)),

  // Permissions
  new SlashCommandBuilder().setName("give").setDescription("Give command permission")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt=>opt.setName("command").setDescription("Command").setRequired(true)),
  new SlashCommandBuilder().setName("revoke").setDescription("Revoke command permission")
    .addUserOption(opt=>opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt=>opt.setName("command").setDescription("Command").setRequired(true)),
  new SlashCommandBuilder().setName("help").setDescription("Show available commands")
];

const rest = new REST({version:"10"}).setToken(process.env.TOKEN);
(async()=>{
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID),{body:commands});
  console.log("Slash commands registered ✅");
})();

// ================= INTERACTION HANDLER =================
client.on("interactionCreate", async(interaction)=>{
  if(!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // ========== BUTTON HANDLER ==========
  if(interaction.isButton()){
    const [action,type,targetId] = interaction.customId.split("_");
    if(!ownerIds.includes(interaction.user.id)) return interaction.reply({content:"❌ You can't click this button.",ephemeral:true});
    const member = await interaction.guild.members.fetch(targetId).catch(()=>null);
    if(!member) return interaction.update({content:"❌ User not found.",embeds:[],components:[]});

    if(action==="kick" && type==="confirm"){ await member.kick().catch(()=>{}); return interaction.update({embeds:[new EmbedBuilder().setColor("Red").setTitle("✅ User Kicked").setDescription(member.user.tag).setTimestamp()],components:[]}); }
    if(action==="kick" && type==="cancel"){ return interaction.update({embeds:[new EmbedBuilder().setColor("Green").setTitle("❌ Kick Cancelled").setDescription(member.user.tag).setTimestamp()],components:[]}); }

    if(action==="ban" && type==="confirm"){ await member.ban().catch(()=>{}); return interaction.update({embeds:[new EmbedBuilder().setColor("Red").setTitle("✅ User Banned").setDescription(member.user.tag).setTimestamp()],components:[]}); }
    if(action==="ban" && type==="cancel"){ return interaction.update({embeds:[new EmbedBuilder().setColor("Green").setTitle("❌ Ban Cancelled").setDescription(member.user.tag).setTimestamp()],components:[]}); }

    if(action==="warn" && type==="confirm"){ await member.send("⚠ You were warned.").catch(()=>{}); return interaction.update({embeds:[new EmbedBuilder().setColor("Yellow").setTitle("⚠ User Warned").setDescription(member.user.tag).setTimestamp()],components:[]}); }
    if(action==="warn" && type==="cancel"){ return interaction.update({embeds:[new EmbedBuilder().setColor("Green").setTitle("❌ Warn Cancelled").setDescription(member.user.tag).setTimestamp()],components:[]}); }

    if(action==="timeout" && type==="confirm"){ await member.timeout(5*60*1000).catch(()=>{}); return interaction.update({embeds:[new EmbedBuilder().setColor("Red").setTitle("⏳ User Timed Out").setDescription(member.user.tag).setTimestamp()],components:[]}); }
    if(action==="timeout" && type==="cancel"){ return interaction.update({embeds:[new EmbedBuilder().setColor("Green").setTitle("❌ Timeout Cancelled").setDescription(member.user.tag).setTimestamp()],components:[]}); }
    return;
  }

  // ========== SLASH COMMAND HANDLER ==========
  const command = interaction.commandName;
  const userId = interaction.user.id;
  const isOwner = ownerIds.includes(userId);
  const hasPermission = isOwner || (commandPermissions[command]?.includes(userId));
  if(!hasPermission && !["help"].includes(command)) return interaction.reply({content:"❌ You don't have permission.",ephemeral:true});

  // ========== HELP ==========
  if(command==="help"){
    const allowed = isOwner ? allCommandsList : allCommandsList.filter(c=>commandPermissions[c]?.includes(userId));
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("📜 Available Commands")
      .setDescription(allowed.map(c=>`/${c}`).join("\n"))
      .setTimestamp();
    return interaction.reply({embeds:[embed],ephemeral:true});
  }

  // ========== PING ==========
  if(command==="ping"){
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setTitle("🏓 Pong!")
      .setDescription(`Latency: ${client.ws.ping}ms`)
      .setTimestamp();
    return interaction.reply({embeds:[embed]});
  }

  // ========== MEMBERS ==========
  if(command==="members"){
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("👥 Member Count")
      .setDescription(`Total Members: ${interaction.guild.memberCount}`)
      .setTimestamp();
    return interaction.reply({embeds:[embed]});
  }

  // ... Rest of commands like snipe, say, spam handled with embeds (same as previous full code) ...
});

// ================= READY =================
client.once("ready",()=>console.log(`Logged in as ${client.user.tag}`));
client.login(process.env.TOKEN);
