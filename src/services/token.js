// Eksempel på token.js indhold
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Sti til konfigurationsfilen
const configPath = path.join(__dirname, '../../config/connections.json');

// Indlæs forbindelseskonfiguration
function loadConnectionsConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
        
        // Returnér en tom konfiguration hvis filen ikke findes
        return { connections: [] };
    } catch (error) {
        logger.error('Error loading connections config', { error: error.message });
        return { connections: [] };
    }
}

// Gem forbindelseskonfiguration
function saveConnectionsConfig(config) {
    try {
        // Sørg for at config-mappen eksisterer
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Gem konfigurationen som JSON
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        logger.info('Connections config saved successfully');
        
        return true;
    } catch (error) {
        logger.error('Error saving connections config', { error: error.message });
        return false;
    }
}

module.exports = {
    loadConnectionsConfig,
    saveConnectionsConfig
};