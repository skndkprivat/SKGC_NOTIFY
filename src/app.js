const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');

// Import routes
const connectionRoutes = require('./routes/connections');
const notificationRoutes = require('./routes/notifications');
const oauthRoutes = require('./routes/oauth');

// Import utilities and services
const logger = require('./utils/logger');
const { translations } = require('./utils/translations');
const { encrypt, decrypt } = require('./services/encryption');
const { saveConnectionsConfig, loadConnectionsConfig } = require('./services/token');
const { getAppStats, resetAppStats } = require('./services/stats');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');

// Test endpoint
app.get('/api-test', (req, res) => {
    res.json({ message: 'API virker', timestamp: new Date() });
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Default language
let currentLang = "da";

// Root route
app.get('/', (req, res) => {
    const lang = req.query.lang || currentLang;
    currentLang = lang;
    
    // Load connections configuration
    const connectionsConfig = loadConnectionsConfig();
    
    res.render('index', { 
        connections: connectionsConfig.connections,
        availableTopics: require('./utils/translations').getAvailableTopics(lang),
        activeNotifications: require('./services/genesys').getActiveNotifications(),
        t: translations[lang],
        currentLang: lang
    });
});

// Change language route
app.get('/lang/:lang', (req, res) => {
    const { lang } = req.params;
    if (translations[lang]) {
        currentLang = lang;
    }
    res.redirect('/');
});

// API-rute for at hente notifikationer
app.get('/api/notifications/:connectionId', (req, res) => {
    const { connectionId } = req.params;
    logger.info('API request for notifications', { connectionId });
    
    try {
        const genesysService = require('./services/genesys');
        
        // Tjek om getNotifications findes
        if (typeof genesysService.getNotifications !== 'function') {
            logger.error('getNotifications is not a function!');
            return res.status(500).json({ error: 'getNotifications is not a function' });
        }
        
        const notificationsList = genesysService.getNotifications(connectionId);
        logger.info('API returning notifications', { 
            connectionId, 
            count: notificationsList ? notificationsList.length : 0 
        });
        
        res.json(notificationsList || []);
    } catch (error) {
        logger.error('Error fetching notifications', { 
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Error fetching notifications: ' + error.message });
    }
});

// Tilføj en API-rute for at hente statistikker
app.get('/api/stats', (req, res) => {
    res.json(getAppStats());
});

// Tilføj en rute for at nulstille statistikker
app.post('/api/stats/reset', (req, res) => {
    resetAppStats();
    res.json({ success: true, message: 'Stats reset successfully' });
});

// Use route modules
app.use('/connections', connectionRoutes);
app.use('/notifications', notificationRoutes);
app.get('/auth/:connectionId', (req, res) => {
    res.redirect(`/oauth/auth/${req.params.connectionId}`);
});
app.use('/oauth', oauthRoutes);

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Error', {
        message: err.message,
        stack: err.stack
    });
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred' 
            : err.message
    });
});

// Export app for potential testing or extended use
module.exports = app;