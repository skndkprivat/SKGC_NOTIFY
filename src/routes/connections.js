const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { translations } = require('../utils/translations');
const { saveConnectionsConfig, loadConnectionsConfig } = require('../services/token');

// Add connection route
router.post('/add', (req, res) => {
    const { name, clientId, clientSecret, region } = req.body;
    
    // Validate input
    if (!name || !clientId || !clientSecret || !region) {
        return res.status(400).json({ 
            error: translations['da'].allFieldsRequired
        });
    }
    
    try {
        // Load existing connections
        const configs = loadConnectionsConfig();
        
        // Create new connection
        const newConnection = {
            id: uuidv4(),
            name,
            clientId,
            clientSecret,
            region,
            authorized: false,
            created: new Date().toISOString()
        };
        
        // Add to connections array
        configs.connections.push(newConnection);
        
        // Save updated config
        const saved = saveConnectionsConfig(configs);
        
        if (saved) {
            logger.info('Connection added successfully', { 
                id: newConnection.id,
                name: newConnection.name
            });
            
            res.redirect('/');
        } else {
            throw new Error('Failed to save connection');
        }
    } catch (error) {
        logger.error('Error adding connection', { 
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({ 
            error: 'Error adding connection: ' + error.message
        });
    }
});

// Remove connection route
router.post('/remove/:connectionId', (req, res) => {
    const { connectionId } = req.params;
    
    try {
        // Load existing connections
        const configs = loadConnectionsConfig();
        
        // Filter out the connection to remove
        configs.connections = configs.connections.filter(conn => conn.id !== connectionId);
        
        // Save updated config
        const saved = saveConnectionsConfig(configs);
        
        if (saved) {
            logger.info('Connection removed successfully', { connectionId });
            res.redirect('/');
        } else {
            throw new Error('Failed to save updated connections');
        }
    } catch (error) {
        logger.error('Error removing connection', { 
            error: error.message,
            connectionId
        });
        
        res.status(500).json({ 
            error: 'Error removing connection: ' + error.message
        });
    }
});

module.exports = router;