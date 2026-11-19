
const express = require("express");
const app = express();

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@veterincam";
const CHANNEL_LINK = process.env.CHANNEL_LINK || "https://t.me/veterincam";
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = (process.env.WEBHOOK_SECRET || "").trim();
const PORT = process.env.PORT || 3000;

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN || !WEBHOOK_SECRET) {
  throw new Error("BOT_TOKEN and WEBHOOK_SECRET are required");
}

async function telegram(method, data = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.description || "Telegram API error");
  }

  return result.result;
}

async function sendMessage(chatId, text, replyMarkup) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup
  });
}

async function checkMembership(userId) {
  const member = await telegram("getChatMember", {
    chat_id: CHANNEL_USERNAME,
    user_id: userId
  });

  return (
    ["creator", "administrator", "member"].includes(member.status) ||
    (member.status === "restricted" && member.is_member === true)
  );
}

app.get("/", (req, res) => {
  res.send("SIYAM Telegram Bot is running");
});

app.post("/telegram-webhook", async (req, res) => {
  if (
    req.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET
  ) {
    return res.sendStatus(401);
  }

  // Acknowledge the update quickly.
  res.sendStatus(200);

  try {
    const update = req.body;

    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;

      await sendMessage(
        chatId,
        "Welcome to SIYAM SM! To use this bot, please join our channel first. Then tap Verify Membership.",
        {
          inline_keyboard: [
            [{ text: "📢 Join Channel", url: CHANNEL_LINK }],
            [{ text: "✅ Verify Membership", callback_data: "verify_membership" }]
          ]
        }
      );
    }

    if (update.callback_query) {
      const query = update.callback_query;

      if (query.data === "verify_membership") {
        await telegram("answerCallbackQuery", {
          callback_query_id: query.id,
          text: "Checking your channel membership..."
        });

        const isMember = await checkMembership(query.from.id);

        if (isMember) {
          await sendMessage(
            query.message.chat.id,
            "✅ Success! You have joined our channel. Welcome to SIYAM SM!"
          );
        } else {
          await sendMessage(
            query.message.chat.id,
            "❌ You are not a member of our channel yet. Please join the channel and tap Verify Again.",
            {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: CHANNEL_LINK }],
                [{ text: "🔄 Verify Again", callback_data: "verify_membership" }]
              ]
            }
          );
        }
      }
    }
  } catch (error) {
    console.error("Bot update error:", error.message);
  }
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Bot server running on port ${PORT}`);

  if (WEBHOOK_URL) {
    try {
      await telegram("setWebhook", {
        url: `${WEBHOOK_URL}/telegram-webhook`,
        secret_token: WEBHOOK_SECRET
      });

      console.log("Telegram webhook configured");
    } catch (error) {
      console.error("Webhook setup failed:", error.message);
    }
  } else {
    console.log("WEBHOOK_URL is not set yet");
  }
});
