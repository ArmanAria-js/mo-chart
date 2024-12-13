// ./src/index.js

require("dotenv").config();
const { symbols, emaPeriod, ichimokuPeriod, timeFrames, checkInterval, allowedUserId } = require("./config");
const { fetchHistoricalData } = require("./data-fetcher");
const { calculateEMA, calculateKijunSen } = require("./indicator-calculator");
const { checkConditions } = require("./condition-checker");
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");

// Initialize the bot with polling
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

console.log("BOT IS RUNNING");

if (!telegramToken) {
    console.error("Telegram bot token is not set in the environment variables.");
    process.exit(1);
}

if (!allowedUserId) {
    console.error("Allowed user ID is not set correctly in the environment variables.");
    process.exit(1);
}

const bot = new TelegramBot(telegramToken, { polling: true });

// Test script
// (async () => {
//     const testSymbol = { custom: "EURUSD", yahoo: "EURUSD=X" };
//     const data = await fetchHistoricalData(testSymbol, "1d");
//     console.log(data);
// })();

// Keep track of whether the user is subscribed
let isSubscribed = false;

// Function to process a single symbol
async function processSymbol(symbolObj) {
    const results = {};

    for (const interval of timeFrames) {
        const historicalData = await fetchHistoricalData(symbolObj.yahoo, interval);

        const requiredDataPoints = Math.max(emaPeriod, ichimokuPeriod);

        if (historicalData.length < requiredDataPoints) {
            console.warn(`Not enough data for ${symbolObj.custom} on the ${interval} timeframe.`);
            continue; // Continue to the next interval instead of returning
        }

        // Extract prices
        const closePrices = historicalData.map((data) => data.close);
        const highPrices = historicalData.map((data) => data.high);
        const lowPrices = historicalData.map((data) => data.low);

        // Calculate indicators
        const emaValues = calculateEMA(closePrices, emaPeriod);
        const kijunSenValues = calculateKijunSen(highPrices, lowPrices, ichimokuPeriod);

        // Get the latest values
        const latestPrice = closePrices[closePrices.length - 1];
        const emaValue = emaValues[emaValues.length - 1];
        const kijunSenValue = kijunSenValues[kijunSenValues.length - 1];

        // Check if indicator values are available
        if (emaValue === undefined || kijunSenValue === undefined) {
            console.warn(`Indicator values not available for ${symbolObj.custom} on the ${interval} timeframe.`);
            continue;
        }

        // Check conditions
        const condition = checkConditions(latestPrice, emaValue, kijunSenValue);

        if (!condition) return null; // Conditions not met in this timeframe

        results[interval] = condition;
    }

    // Ensure the condition is the same across all timeframes
    const conditions = Object.values(results);
    if (conditions.length === timeFrames.length && conditions.every((cond) => cond === "ABOVE")) {
        return "ABOVE";
    } else if (conditions.length === timeFrames.length && conditions.every((cond) => cond === "BELOW")) {
        return "BELOW";
    } else {
        return null;
    }
}

// Function to process all symbols
async function processAllSymbols() {
    const messages = [];

    for (const symbolObj of symbols) {
        try {
            const condition = await processSymbol(symbolObj);
            if (condition) messages.push(`${symbolObj.custom} - ${condition}`);
        } catch (error) {
            console.error(`Error processing ${symbolObj.custom}:`, error.message);
            // Continue processing other symbols
        }
    }

    return messages;
}

// Function to send periodic updates
async function sendPeriodicUpdates() {
    if (isSubscribed) {
        console.log("Checking symbols...");
        const messages = await processAllSymbols();

        if (messages.length > 0) {
            const messageText = messages.join("\n");
            await bot.sendMessage(allowedUserId, `Symbols meeting the conditions:\n${messageText}`);
            console.log("Message sent to user:\n", messageText);
        } else {
            console.log("No symbols met the conditions.");
        }
    } else {
        console.log("User is not subscribed. Skipping the check.");
    }
}

// Schedule periodic checks
cron.schedule(checkInterval, sendPeriodicUpdates);

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.chat.first_name;
    const name = userName || msg.chat.username || "";
    if (chatId !== allowedUserId) return;

    const welcomeMessage =
        `Hello ${name}! Welcome...\n` +
        "Use /subscribe to start receiving updates.\n" +
        "Use /unsubscribe to stop receiving updates.\n" +
        "Use /help to see available commands.";
    bot.sendMessage(chatId, welcomeMessage);
});

// Handle /subscribe command
bot.onText(/\/subscribe/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== allowedUserId) return;

    if (isSubscribed) {
        bot.sendMessage(chatId, "You are already subscribed to updates.");
    } else {
        isSubscribed = true;
        bot.sendMessage(chatId, "You have subscribed to updates.");
        sendPeriodicUpdates();
    }
});

// Handle /unsubscribe command
bot.onText(/\/unsubscribe/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== allowedUserId) return;

    if (isSubscribed) {
        isSubscribed = false;
        bot.sendMessage(chatId, "You have unsubscribed from updates.");
    } else {
        bot.sendMessage(chatId, "You are not currently subscribed.");
    }
});

// Handle /help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== allowedUserId) return;

    const helpMessage =
        "Available commands:\n" +
        "/start - Start the bot and receive a welcome message.\n" +
        "/subscribe - Subscribe to periodic updates.\n" +
        "/unsubscribe - Unsubscribe from updates.\n" +
        bot.sendMessage(chatId, helpMessage);
});

// Handle unknown commands
bot.on("message", (msg) => {
    const chatId = msg.chat.id;

    if (chatId !== allowedUserId) {
        bot.sendMessage(chatId, "You're not allowed to use this bot.");
        return;
    }

    const messageText = msg.text;
    if (!messageText.startsWith("/")) bot.sendMessage(chatId, "Unknown command. Please use /help to see available commands.");
});
