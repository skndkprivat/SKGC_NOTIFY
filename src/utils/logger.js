const winston = require('winston');
const path = require('path');

// Konfigurer logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // Sæt til 'debug' for at aktivere debug logs
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: 'app.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// Hjælpefunktioner til logging med mere kontekst
function info(message, meta = {}) {
    logger.info(message, meta);
}

function error(message, meta = {}) {
    logger.error(message, meta);
}

function warn(message, meta = {}) {
    logger.warn(message, meta);
}

// Tilføj debug funktion
function debug(message, meta = {}) {
    // Brug info hvis du ikke vil aktivere debug-niveau i Winston
    // eller skift til logger.debug hvis du vil bruge Winston's debug niveau
    logger.info(`[DEBUG] ${message}`, meta);
}

module.exports = {
    info,
    error,
    warn,
    debug // Eksporter den nye debug funktion
};