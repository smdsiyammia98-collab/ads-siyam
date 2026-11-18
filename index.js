
const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_USERNAME = "@veterincam";
const CHANNEL_LINK = "https://t.me/veterincam";

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN environment variable is missing.");
}

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true
});

function sendJoinPrompt(chatId) {
  return bot.sendMessage(
    chatId,
    "স্বাগতম! ❤️ SIYAM SM-এ প্রবেশ করতে আগে আমাদের Telegram Channel-এ যোগ দিন।",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📢 Join Channel",
              url: CHANNEL_LINK
            }
          ],
          [
            {
              text: "✅ Verify",
              callback_data: "verify_channel"
            }
          ]
        ]
      }
    }
  );
}

bot.onText(/^\/start(?:@\w+)?(?:\s|$)/, async (msg) => {
  try {
    await sendJoinPrompt(msg.chat.id);
  } catch (error) {
    console.error(error.message);
  }
});

bot.on("callback_query", async (query) => {
  if (query.data !== "verify_channel") return;

  const chatId = query.message?.chat?.id;
  const userId = query.from.id;

  try {
    const member = await bot.getChatMember(
      CHANNEL_USERNAME,
      userId
    );

    const isMember = [
      "member",
      "administrator",
      "creator"
    ].includes(member.status);

    if (isMember) {
      await bot.answerCallbackQuery(query.id, {
        text: "সদস্যতা যাচাই সফল!"
      });

      await bot.sendMessage(
        chatId,
        "🎉 তোমার চ্যানেল সদস্যতা যাচাই হয়েছে। SIYAM SM-এ স্বাগতম!"
      );
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: "আগে চ্যানেলে Join করো।",
        show_alert: true
      });

      await sendJoinPrompt(chatId);
    }
  } catch (error) {
    console.error(error.message);

    await bot.answerCallbackQuery(query.id, {
      text: "যাচাই করা যাচ্ছে না। বটটি চ্যানেলের Admin কি না দেখো।",
      show_alert: true
    });
  }
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

console.log("SIYAM SM Telegram Bot is running!");
