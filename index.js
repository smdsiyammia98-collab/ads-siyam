const express = require("express");
const app = express();

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_USERNAME =
  process.env.CHANNEL_USERNAME || "@veterincam";
const CHANNEL_LINK =
  process.env.CHANNEL_LINK || "https://t.me/veterincam";
const MINI_APP_URL = process.env.MINI_APP_URL;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET =
  (process.env.WEBHOOK_SECRET || "").trim();
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !WEBHOOK_SECRET || !MINI_APP_URL) {
  throw new Error(
    "BOT_TOKEN, WEBHOOK_SECRET and MINI_APP_URL are required"
  );
}

if (!MINI_APP_URL.startsWith("https://")) {
  throw new Error("MINI_APP_URL must use HTTPS");
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function telegram(method, data = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      result.description || "Telegram API error"
    );
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
    ["creator", "administrator", "member"].includes(
      member.status
    ) ||
    (member.status === "restricted" &&
      member.is_member === true)
  );
}

function miniAppKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "🚀 Open ADS SIYAM Mini App",
          web_app: {
            url: MINI_APP_URL
          }
        }
      ]
    ]
  };
}

app.get("/", (req, res) => {
  res.send("ADS SIYAM Telegram Bot is running");
});

app.post("/telegram-webhook", async (req, res) => {
  if (
    req.get("X-Telegram-Bot-Api-Secret-Token") !==
    WEBHOOK_SECRET
  ) {
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  try {
    const update = req.body;

    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;

      await sendMessage(
        chatId,
        "Welcome to ADS SIYAM! Please join our channel and verify your membership to continue.",
        {
          inline_keyboard: [
            [
              {
                text: "📢 Join Channel",
                url: CHANNEL_LINK
              }
            ],
            [
              {
                text: "✅ Verify Membership",
                callback_data: "verify_membership"
              }
            ]
          ]
        }
      );
    }

    if (update.callback_query) {
      const query = update.callback_query;

      if (query.data === "verify_membership") {
        await telegram("answerCallbackQuery", {
          callback_query_id: query.id,
          text: "Checking your membership..."
        });

        const isMember = await checkMembership(
          query.from.id
        );

        if (isMember) {
          await sendMessage(
            query.message.chat.id,
            "✅ Membership verified successfully! Welcome to ADS SIYAM. You can now open our Mini App.",
            miniAppKeyboard()
          );
        } else {
          await sendMessage(
            query.message.chat.id,
            "❌ You are not a member yet. Please join our channel and verify again.",
            {
              inline_keyboard: [
                [
                  {
                    text: "📢 Join Channel",
                    url: CHANNEL_LINK
                  }
                ],
                [
                  {
                    text: "🔄 Verify Again",
                    callback_data: "verify_membership"
                  }
                ]
              ]
            }
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "Bot update error:",
      error.message
    );
  }
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(
    `ADS SIYAM Bot running on port ${PORT}`
  );

  if (WEBHOOK_URL) {
    try {
      await telegram("setWebhook", {
        url: `${WEBHOOK_URL}/telegram-webhook`,
        secret_token: WEBHOOK_SECRET
      });

      console.log("Telegram webhook configured");
    } catch (error) {
      console.error(
        "Webhook setup failed:",
        error.message
      );
    }
  } else {
    console.log("WEBHOOK_URL is not set");
  }
});
