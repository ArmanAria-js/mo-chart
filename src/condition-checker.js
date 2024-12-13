// ./src/condition-checker.js
function checkConditions(latestPrice, emaValue, kijunSenValue) {
    if (latestPrice > emaValue && latestPrice > kijunSenValue) return "ABOVE";
    else if (latestPrice < emaValue && latestPrice < kijunSenValue) return "BELOW";
    else return null;
}

module.exports = { checkConditions };
