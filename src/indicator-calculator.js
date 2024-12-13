// ./src/indicator-calculator.js
const { EMA } = require("technicalindicators");

function calculateEMA(closePrices, period) {
    return EMA.calculate({ period, values: closePrices });
}

function calculateKijunSen(highPrices, lowPrices, period) {
    const kijunSenValues = [];

    for (let i = 0; i < highPrices.length; i++) {
        if (i >= period - 1) {
            const periodHigh = Math.max(...highPrices.slice(i - period + 1, i + 1));
            const periodLow = Math.min(...lowPrices.slice(i - period + 1, i + 1));
            kijunSenValues.push((periodHigh + periodLow) / 2);
        } else {
            kijunSenValues.push(null);
        }
    }

    return kijunSenValues;
}

module.exports = {
    calculateEMA,
    calculateKijunSen,
};
