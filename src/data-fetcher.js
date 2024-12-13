// ./src/data-fetcher.js
const yahooFinance = require("yahoo-finance2").default;
const { emaPeriod, ichimokuPeriod } = require("./config"); // Ensure you import these

async function fetchHistoricalData(symbolObj, interval) {
    // Determine the required number of data points
    const requiredDataPoints = Math.max(emaPeriod, ichimokuPeriod) + 50; // Adding buffer

    // Determine the milliseconds per interval
    let millisecondsPerUnit;
    switch (interval) {
        case "1h":
            millisecondsPerUnit = 60 * 60 * 1000; // 1 hour in milliseconds
            break;
        case "1d":
            millisecondsPerUnit = 24 * 60 * 60 * 1000; // 1 day
            break;
        case "5d":
            millisecondsPerUnit = 5 * 24 * 60 * 60 * 1000; // 5 days
            break;
        default:
            millisecondsPerUnit = 24 * 60 * 60 * 1000; // Default to 1 day
    }

    // Calculate period1 and period2
    const now = new Date();
    const period2 = now;
    const period1 = new Date(now.getTime() - requiredDataPoints * millisecondsPerUnit);

    try {
        const result = await yahooFinance.historical(symbolObj.yahoo, { period1, period2, interval });
        return result;
    } catch (error) {
        console.error(`Error fetching data for ${symbolObj.custom}:`, error);
        return [];
    }
}

module.exports = { fetchHistoricalData };
