const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

// Express setup to prevent Glitch from sleeping
const app = express();
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(4251, () => console.log("Server is running on port 4251."));

// Replace with your actual bot token
const BOT_TOKEN = "7908570741:AAEZ_TxYzTzNPEKv0Vyia5zkBK5GfuoXWRc";

// Initialize SQLite database
const db = new sqlite3.Database("./timers.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(`
      CREATE TABLE IF NOT EXISTS timers (
        userId INTEGER PRIMARY KEY,
        username TEXT,
        keyword TEXT,
        messageId INTEGER,
        startTime INTEGER,
        timeoutId TEXT
      )
    `);
  }
});

// Ensure polling is enabled correctly
const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

// Define keyboard with buttons for 'wc' and 'cy'
const keyboard = {
  reply_markup: {
    keyboard: [["/wc"], ["/cy"]],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

// Start command handler
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Hello! I'm your group bot. Use the buttons below to start 'wc' or 'cy'. Send '1' to stop all active timers.",
    keyboard
  );
});

// Handle /wc command
bot.onText(/\/wc/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;

  await handleKeyword(userId, username, "wc", chatId, msg.message_id);
});

// Handle /cy command
bot.onText(/\/cy/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;

  await handleKeyword(userId, username, "cy", chatId, msg.message_id);
});

// Message handler to monitor '1' and stop timers
bot.on("message", async (msg) => {
  if (!msg.text) return; // Ignore non-text messages

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const messageText = msg.text.trim();

  // Stop timers if user sends "1"
  if (messageText.includes("1")) {
    await clearTimer(userId, "wc", chatId);
    await clearTimer(userId, "cy", chatId);
  }
});

// Function to handle keywords ('wc' or 'cy')
async function handleKeyword(userId, username, keyword, chatId, messageId) {
  const existingTimer = await getTimer(userId, keyword);
  if (!existingTimer) {
    const startTime = Date.now();
    const delay = keyword === "wc" ? 900000 : 600000; // 15 mins for wc, 10 mins for cy
    const timeoutId = setTimeout(() => warnAfterTime(userId, keyword, chatId, messageId), delay);

    await saveTimer(userId, username, keyword, messageId, startTime, timeoutId);
  }
}

// Function to warn after a certain delay
async function warnAfterTime(userId, keyword, chatId, messageId) {
  const timer = await getTimer(userId, keyword);
  if (timer) {
    await deleteTimer(userId, keyword);
    bot.sendMessage(chatId, `@${timer.username}, '${keyword}' 超过了指定时间。`, {
      reply_to_message_id: messageId,
    });
  }
}

// Function to clear a timer
async function clearTimer(userId, keyword, chatId) {
  const timer = await getTimer(userId, keyword);
  if (timer) {
    clearTimeout(timer.timeoutId); // Clear the scheduled timeout
    await deleteTimer(userId, keyword);
    bot.sendMessage(chatId, `@${timer.username}, '${keyword}' 计时已停止。`);
  }
}

// Database functions
function getTimer(userId, keyword) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM timers WHERE userId = ? AND keyword = ?",
      [userId, keyword],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

function saveTimer(userId, username, keyword, messageId, startTime, timeoutId) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR REPLACE INTO timers (userId, username, keyword, messageId, startTime, timeoutId) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, username, keyword, messageId, startTime, timeoutId],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

function deleteTimer(userId, keyword) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM timers WHERE userId = ? AND keyword = ?",
      [userId, keyword],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

// Handle errors to prevent crashes
bot.on("polling_error", (error) => console.error("Polling error:", error));
bot.on("error", (error) => console.error("Bot error:", error));
