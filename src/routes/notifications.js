const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const genesysService = require('../services/genesys');
const { translations } = require('../utils/translations');
const { connectToGenesys, disconnectFromGenesys, getNotifications } = require('../services/genesys');

// Listen to notifications
router.post('/listen', async (req, res) => {
    const { connectionId, topics, method, pollingInterval } = req.body;
    
    if (!connectionId || !topics || topics.length === 0) {
        return res.status(400).send('Manglende forbindelses-ID eller emner');
    }
    
    try {
        // Konvertér pollingInterval til et tal hvis det er angivet
        const parsedInterval = pollingInterval ? parseInt(pollingInterval, 10) : 30000;
        
        // Opret options objekt med method og interval
        const options = {
            method: method || 'websocket', // default til websocket hvis ikke angivet
            pollingInterval: parsedInterval
        };
        
        // Kald connectToGenesys med de angivne indstillinger
        await genesysService.connectToGenesys(connectionId, topics, options);
        
        res.redirect('/');
    } catch (error) {
        logger.error('Error starting notification listener', { 
            error: error.message, 
            connectionId 
        });
        
        res.status(500).send(`Fejl ved start af notifikationslytter: ${error.message}`);
    }
});

// Stop listening to notifications
router.post('/stop/:connectionId', (req, res) => {
    const { connectionId } = req.params;
    
    logger.info('Stopping notifications', { connectionId });
    
    try {
        disconnectFromGenesys(connectionId);
        res.redirect('/');
    } catch (error) {
        logger.error('Error stopping notifications', { 
            error: error.message 
        });
        res.redirect('/');
    }
});

module.exports = router;