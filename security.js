const https = require("https");
const crypto = require("crypto");
const TelegramBot = require("node-telegram-bot-api");

// ================= ENV CONFIG =================
const ENV = {
  // BOT BUYER (yang lu jual)
  BUYER_BOT_TOKEN: "8215168281:AAEK_xqn_hpKGmKLnj78J5IQ9D4U78LyspE",
  BUYER_TELEGRAM_ID: 8248734943,
  LICENSE_KEY: "LIC-AAA-111",

  // BOT SELLER (ADMIN)
  ADMIN_BOT_TOKEN: "8576202582:AAE9-kwUUURhka5upa7G1yx3TOcwvdhDwqc",
  ADMIN_ID: 7807425271,

  // GITHUB
  SECURITY_URL: "https://raw.githubusercontent.com/VexxuzzZ/memeq/refs/heads/main/security.json",

  AUTO_BLACKLIST_DELAY: 5 * 60 * 1000
};
// ==============================================

const adminBot = new TelegramBot(ENV.ADMIN_BOT_TOKEN, { polling: true });
const buyerBot = new TelegramBot(ENV.BUYER_BOT_TOKEN, { polling: false });

// ================= UTIL =================
const hash = (v) =>
  crypto.createHash("sha256").update(v).digest("hex");

function fetchSecurity() {
  return new Promise((resolve) => {
    https.get(ENV.SECURITY_URL, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch {
          resolve({ error: true });
        }
      });
    }).on("error", () => resolve({ error: true }));
  });
}

// ================= SECURITY CORE =================
async function securityCheck() {
  const sec = await fetchSecurity();
  const botInfo = await buyerBot.getMe();
  const tokenHash = hash(ENV.BUYER_BOT_TOKEN);

  if (sec.error) {
    console.log("❌ SYSTEM DISABLED BY OWNER");
    process.exit(1);
  }

  // 🔴 BLACKLIST CHECK
  if (
    sec.blacklist.find(
      (b) =>
        b.telegram_id === ENV.BUYER_TELEGRAM_ID ||
        b.token_hash === tokenHash
    )
  ) {
    console.log("❌ YOU ARE BLACKLISTED");
    process.exit(1);
  }

  // 🔑 LICENSE CHECK
  const lic = sec.licenses[ENV.LICENSE_KEY];
  if (!lic || lic.status !== "active") {
    console.log("❌ LICENSE INVALID / REVOKED");
    process.exit(1);
  }

  // ✅ APPROVED CHECK
  const approved = sec.approved.find(
    (a) =>
      a.telegram_id === ENV.BUYER_TELEGRAM_ID &&
      a.bot_id === botInfo.id &&
      a.token_hash === tokenHash
  );

  if (!approved) {
    await sendApprovalRequest(botInfo.id, tokenHash);
    autoBlacklistTrigger();
    console.log("⏳ WAITING APPROVAL...");
    process.exit(1);
  }

  console.log("✅ SECURITY PASSED");
}

// ================= APPROVAL MESSAGE =================
async function sendApprovalRequest(botId, tokenHash) {
  await adminBot.sendMessage(
    ENV.ADMIN_ID,
`🚨 *ADA YANG MAU APPROVE NIH*

👤 Telegram ID: \`${ENV.BUYER_TELEGRAM_ID}\`
🤖 Bot ID: \`${botId}\`
🔑 License: \`${ENV.LICENSE_KEY}\`
🔐 Token Hash: \`${tokenHash.slice(0, 12)}...\`

Approve sekarang?`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "✅ APPROVE", callback_data: `approve|${botId}` },
        { text: "❌ NO APPROVE", callback_data: `reject|${botId}` }
      ]
    ]
  }
});
}

// ================= AUTO BLACKLIST =================
function autoBlacklistTrigger() {
  setTimeout(() => {
    console.log("⛔ AUTO BLACKLIST TRIGGERED (SERVER SIDE)");
  }, ENV.AUTO_BLACKLIST_DELAY);
}

// ================= BUTTON HANDLER =================
adminBot.on("callback_query", async (q) => {
  if (q.from.id !== ENV.ADMIN_ID) return;

  const [action, botId] = q.data.split("|");

  await adminBot.answerCallbackQuery(q.id);

  await adminBot.sendMessage(
    ENV.ADMIN_ID,
    action === "approve"
      ? `✅ BOT ${botId} APPROVED\n(UPDATE DI GITHUB MANUAL)`
      : `❌ BOT ${botId} REJECTED\n(UPDATE DI GITHUB MANUAL)`
  );
});

module.exports = securityCheck;
