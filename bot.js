const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// Express setup to prevent Glitch from sleeping
const app = express();
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(4251, () => console.log("Server is running on port 3000."));

// Replace with your actual bot token
const BOT_TOKEN = "7908570741:AAEa4xRIBfJAwFUhjdi44VSEKZxTGV5x-Gc";

// Ensure polling is enabled correctly
const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    interval: 300, // Poll every 300ms
    autoStart: true,
    params: { timeout: 10 }, // Prevents overlap
  },
});

// Track timers for users
let wc_timers = {};
let cy_timers = {};

// Start command handler
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Hello! I'm your group bot. I'll monitor messages for 'wc' and 'cy' and stop timers if you send '1' or include '1' in your message."
  );
});

// Message handler to monitor 'wc' and 'cy'
bot.on("message", (msg) => {
  if (!msg.text) return; // Ignore non-text messages

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  const messageText = msg.text.trim();

  // Stop timers if user sends "1"
  if (messageText.includes("1")) {
    if (wc_timers[userId]) delete wc_timers[userId];
    if (cy_timers[userId]) delete cy_timers[userId];
    return;
  }

  // Check for 'wc' (case-insensitive)
  if (/wc/i.test(messageText)) {
    if (!wc_timers[userId]) {
      wc_timers[userId] = { username, messageId: msg.message_id };
      setTimeout(
        () => warnAfterTime(userId, "wc", chatId, msg.message_id),
        900000
      );
    }
  }

  // Check for 'cy' (case-insensitive)
  if (/cy/i.test(messageText)) {
    if (!cy_timers[userId]) {
      cy_timers[userId] = { username, messageId: msg.message_id };
      setTimeout(
        () => warnAfterTime(userId, "cy", chatId, msg.message_id),
        600000
      );
    }
  }
});

// Function to send a warning after a certain delay
function warnAfterTime(userId, keyword, chatId, messageId) {
  let username;
  if (keyword === "wc" && wc_timers[userId]) {
    username = wc_timers[userId].username;
    delete wc_timers[userId];
    bot.sendMessage(chatId, `@${username}, 'wc' 超过了指定时间。`, {
      reply_to_message_id: messageId,
    });
  } else if (keyword === "cy" && cy_timers[userId]) {
    username = cy_timers[userId].username;
    delete cy_timers[userId];
    bot.sendMessage(chatId, `@${username}, 'cy' 超过了指定时间。`, {
      reply_to_message_id: messageId,
    });
  }
}

// Handle errors to prevent crashes
bot.on("polling_error", (error) => console.error("Polling error:", error));
bot.on("error", (error) => console.error("Bot error:", error));
