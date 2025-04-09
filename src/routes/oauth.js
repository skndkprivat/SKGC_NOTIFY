const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { translations } = require('../utils/translations');
const { saveConnectionsConfig, loadConnectionsConfig } = require('../services/token');
const axios = require('axios');

// Autoriseringsrute
router.get('/auth/:connectionId', (req, res) => {
    const { connectionId } = req.params;
    
    try {
        const configs = loadConnectionsConfig();
        const connection = configs.connections.find(c => c.id === connectionId);
        
        if (!connection) {
            return res.status(404).send('Connection not found');
        }
        
        // Gem forbindelses-ID i session
        req.session.connectionId = connectionId;
        
        // Bestem autoriseringsendepunktet baseret på region
        let authUrl;
        if (connection.region === 'mypurecloud.de') {
            authUrl = 'https://login.mypurecloud.de/oauth/authorize';
        } else if (connection.region === 'mypurecloud.ie') {
            authUrl = 'https://login.mypurecloud.ie/oauth/authorize';
        } else if (connection.region === 'mypurecloud.com.au') {
            authUrl = 'https://login.mypurecloud.com.au/oauth/authorize';
        } else if (connection.region === 'mypurecloud.jp') {
            authUrl = 'https://login.mypurecloud.jp/oauth/authorize';
        } else {
            authUrl = 'https://login.mypurecloud.com/oauth/authorize';
        }
        
        // Byg redirect URI
        const redirectUri = `${req.protocol}://${req.get('host')}/oauth/callback`;
        
        // Byg autoriseringsURL
        const url = `${authUrl}?client_id=${connection.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
        
        // Redirect til Genesys Cloud login
        res.redirect(url);
    } catch (error) {
        logger.error('OAuth Authorization Error', { error: error.message });
        res.status(500).send('OAuth Authorization Error');
    }
});

// OAuth callback route
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    const connectionId = req.session.connectionId;
    
    logger.info('OAuth Callback Received', { 
        hasCode: !!code,
        connectionId
    });
    
    if (!code || !connectionId) {
        return res.status(400).send('Missing authorization code or connection ID');
    }
    
    try {
        // Hent forbindelseskonfiguration
        const configs = loadConnectionsConfig();
        const connection = configs.connections.find(c => c.id === connectionId);
        
        if (!connection) {
            return res.status(404).send('Connection not found');
        }
        
        // Bestem token endpoint baseret på region
        let tokenUrl;
        if (connection.region === 'mypurecloud.de') {
            tokenUrl = 'https://login.mypurecloud.de/oauth/token';
        } else if (connection.region === 'mypurecloud.ie') {
            tokenUrl = 'https://login.mypurecloud.ie/oauth/token';
        } else if (connection.region === 'mypurecloud.com.au') {
            tokenUrl = 'https://login.mypurecloud.com.au/oauth/token';
        } else if (connection.region === 'mypurecloud.jp') {
            tokenUrl = 'https://login.mypurecloud.jp/oauth/token';
        } else {
            tokenUrl = 'https://login.mypurecloud.com/oauth/token';
        }
        
        // Byg redirect URI
        const redirectUri = `${req.protocol}://${req.get('host')}/oauth/callback`;
        
        // Opret Basic Auth token
        const authHeader = `Basic ${Buffer.from(`${connection.clientId}:${connection.clientSecret}`).toString('base64')}`;
        
        // Exchange authorization code for token
        const response = await axios.post(
            tokenUrl, 
            `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                }
            }
        );
        
        // Gem token i forbindelseskonfiguration
        const { access_token, expires_in } = response.data;
        
        // Find og opdater forbindelsen
        const connectionIndex = configs.connections.findIndex(c => c.id === connectionId);
        
        if (connectionIndex !== -1) {
            configs.connections[connectionIndex] = {
                ...configs.connections[connectionIndex],
                accessToken: access_token,
                tokenExpiry: new Date(Date.now() + (expires_in * 1000)).toISOString(),
                authorized: true
            };
            
            // Gem opdateret konfiguration
            saveConnectionsConfig(configs);
            
            logger.info('OAuth token exchange successful', { connectionId });
        } else {
            logger.error('Connection not found after token exchange', { connectionId });
        }
        
        // Redirect tilbage til hovedsiden
        res.redirect('/');
    } catch (error) {
        logger.error('OAuth Token Exchange Error', { 
            error: error.message,
            stack: error.stack
        });
        res.status(500).send(`OAuth Error: ${error.message}`);
    }
});

module.exports = router;