const winston = require('winston');
const path = require('path');

// Konfigurer logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        
        // File transport for errors
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/error.log'), 
            level: 'error' 
        }),
        
        // File transport for all logs
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/combined.log') 
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

module.exports = {
    info,
    error,
    warn
};