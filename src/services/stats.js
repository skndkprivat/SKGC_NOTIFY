// services/stats.js
// Opret en global statistikobjekt
const appStats = {
    apiCalls: 0,
    startTime: new Date(),
    apiCallsByEndpoint: {}
};

// Funktion til at inkrementere API-tælling
function incrementApiCounter(endpoint) {
    appStats.apiCalls++;
    
    // Opdater også endpoint-specifik tæller
    if (!appStats.apiCallsByEndpoint[endpoint]) {
        appStats.apiCallsByEndpoint[endpoint] = 0;
    }
    appStats.apiCallsByEndpoint[endpoint]++;
}

// Funktion til at hente statistikker
function getAppStats() {
    return {
        ...appStats,
        uptime: Math.floor((new Date() - appStats.startTime) / 1000) // uptime i sekunder
    };
}

// Funktion til at nulstille tællere
function resetAppStats() {
    appStats.apiCalls = 0;
    appStats.apiCallsByEndpoint = {};
    appStats.startTime = new Date();
}

module.exports = {
    incrementApiCounter,
    getAppStats,
    resetAppStats
};