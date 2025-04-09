const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { translations } = require('../utils/translations');
const { connectToGenesys, disconnectFromGenesys, getNotifications } = require('../services/genesys');

// Listen to notifications
router.post('/listen', async (req, res) => {
    const { connectionId, topics } = req.body;
    
    logger.info('Listening to notifications', { 
        connectionId, 
        topics 
    });
    
    if (!connectionId) {
        return res.status(400).json({ 
            error: translations['da'].allFieldsRequired 
        });
    }
    
    if (!topics || (Array.isArray(topics) && topics.length === 0)) {
        return res.status(400).json({
            error: translations['da'].selectAtLeastOneTopic
        });
    }
    
    try {
        await connectToGenesys(connectionId, topics);
        res.redirect('/');
    } catch (error) {
        logger.error('Error listening to notifications', { 
            error: error.message 
        });
        res.redirect('/');
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