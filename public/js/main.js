// Genesys Cloud Notification Listener App
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { PureCloudPlatformClientV2 } = require('purecloud-platform-client-v2');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Store for client connections
const clientConnections = {};

// Configuration structure for storing connection profiles
let configFile = path.join(__dirname, 'config', 'connections.json');
let connectionsConfig = { connections: [] };

// Create config directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'config'))) {
    fs.mkdirSync(path.join(__dirname, 'config'));
}

// Load existing configuration if available
if (fs.existsSync(configFile)) {
    try {
        connectionsConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (error) {
        console.error('Error loading config file:', error);
    }
}

// Available notification topics in Genesys Cloud
const availableTopics = [
    { id: 'v2.detail.events.conversation', name: 'Samtalebegivenheder' },
    { id: 'v2.detail.events.user', name: 'Brugerbegivenheder' },
    { id: 'v2.detail.events.group', name: 'Gruppebegivenheder' },
    { id: 'v2.detail.events.routing.queue', name: 'Kø-begivenheder' },
    { id: 'v2.detail.events.routing.email', name: 'Email-begivenheder' },
    { id: 'v2.detail.events.outbound', name: 'Udgående begivenheder' },
    { id: 'v2.detail.events.workflow', name: 'Workflow-begivenheder' },
    { id: 'v2.detail.events.presence', name: 'Tilstedeværelses-begivenheder' },
    { id: 'v2.detail.events.coaching', name: 'Coaching-begivenheder' }
];

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        connections: connectionsConfig.connections,
        availableTopics: availableTopics,
        activeNotifications: getActiveNotifications()
    });
});

// Add a new connection profile
app.post('/connections/add', (req, res) => {
    const { name, clientId, clientSecret, region } = req.body;
    
    // Validate input
    if (!name || !clientId || !clientSecret || !region) {
        return res.status(400).json({ error: 'Alle felter er påkrævet' });
    }
    
    // Add to configuration
    const newConnection = {
        id: Date.now().toString(),
        name,
        clientId,
        clientSecret,
        region: region || 'mypurecloud.de' // Default to Frankfurt region
    };
    
    connectionsConfig.connections.push(newConnection);
    
    // Save configuration securely
    fs.writeFileSync(configFile, JSON.stringify(connectionsConfig, null, 2));
    
    res.redirect('/');
});

// Remove a connection profile
app.post('/connections/remove/:id', (req, res) => {
    const { id } = req.params;
    
    // Remove from active connections if needed
    if (clientConnections[id]) {
        disconnectFromGenesys(id);
    }
    
    // Remove from configuration
    connectionsConfig.connections = connectionsConfig.connections.filter(
        conn => conn.id !== id
    );
    
    // Save configuration
    fs.writeFileSync(configFile, JSON.stringify(connectionsConfig, null, 2));
    
    res.redirect('/');
});

// Start listening for notifications
app.post('/notifications/listen', async (req, res) => {
    const { connectionId, topics } = req.body;
    
    if (!connectionId || !topics || !topics.length) {
        return res.status(400).json({ error: 'Forbindelse og notifikationer er påkrævet' });
    }
    
    try {
        const connection = connectionsConfig.connections.find(
            conn => conn.id === connectionId
        );
        
        if (!connection) {
            return res.status(404).json({ error: 'Forbindelse ikke fundet' });
        }
        
        // Connect to Genesys Cloud and start listening
        await connectToGenesys(connection, topics);
        
        res.redirect('/');
    } catch (error) {
        console.error('Error connecting to Genesys Cloud:', error);
        res.status(500).json({ error: 'Fejl ved forbindelse til Genesys Cloud' });
    }
});

// Stop listening for notifications
app.post('/notifications/stop/:connectionId', (req, res) => {
    const { connectionId } = req.params;
    
    disconnectFromGenesys(connectionId);
    
    res.redirect('/');
});

// API to get notification logs
app.get('/api/notifications/:connectionId', (req, res) => {
    const { connectionId } = req.params;
    const connection = clientConnections[connectionId];
    
    if (!connection) {
        return res.status(404).json({ error: 'Ingen aktiv forbindelse' });
    }
    
    res.json(connection.notifications || []);
});

// Connect to Genesys Cloud and set up notification listeners
async function connectToGenesys(connection, topics) {
    // Initialize the Genesys Cloud client
    const client = PureCloudPlatformClientV2.ApiClient.instance;
    client.setEnvironment(connection.region);
    
    try {
        // Authenticate with client credentials
        await client.loginClientCredentialsGrant(connection.clientId, connection.clientSecret);
        
        // Create a notifications API instance
        const notificationsApi = new PureCloudPlatformClientV2.NotificationsApi();
        
        // Create a new channel
        const channel = await notificationsApi.postNotificationsChannels();
        
        // Subscribe to topics
        const topicSubscriptions = topics.map(topic => ({
            id: topic
        }));
        
        await notificationsApi.putNotificationsChannelSubscriptions(
            channel.id, 
            { entities: topicSubscriptions }
        );
        
        // Set up WebSocket for the channel
        const webSocket = new WebSocket(channel.connectUri);
        
        // Store connection information
        clientConnections[connection.id] = {
            client,
            channel,
            webSocket,
            topics,
            notifications: [],
            connection
        };
        
        // Set up WebSocket handlers
        webSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log(`Received notification on ${connection.name}:`, data);
                
                // Store notifications (limit to most recent 100)
                const notifications = clientConnections[connection.id].notifications;
                notifications.unshift({
                    timestamp: new Date().toISOString(),
                    data
                });
                
                // Keep only the most recent 100 notifications
                if (notifications.length > 100) {
                    notifications.length = 100;
                }
            } catch (error) {
                console.error('Error processing notification:', error);
            }
        };
        
        webSocket.onerror = (error) => {
            console.error(`WebSocket error for ${connection.name}:`, error);
        };
        
        webSocket.onclose = () => {
            console.log(`WebSocket closed for ${connection.name}`);
        };
        
        console.log(`Successfully connected to Genesys Cloud for ${connection.name}`);
        
    } catch (error) {
        console.error(`Error setting up Genesys Cloud connection for ${connection.name}:`, error);
        throw error;
    }
}

// Disconnect from Genesys Cloud
function disconnectFromGenesys(connectionId) {
    const connection = clientConnections[connectionId];
    
    if (!connection) {
        return;
    }
    
    try {
        // Close WebSocket
        if (connection.webSocket) {
            connection.webSocket.close();
        }
        
        // Delete notification channel
        if (connection.channel && connection.channel.id) {
            const notificationsApi = new PureCloudPlatformClientV2.NotificationsApi();
            notificationsApi.deleteNotificationsChannel(connection.channel.id);
        }
        
        // Remove from active connections
        delete clientConnections[connectionId];
        
        console.log(`Disconnected from Genesys Cloud for ${connection.connection.name}`);
    } catch (error) {
        console.error(`Error disconnecting from Genesys Cloud for ${connection.connection.name}:`, error);
    }
}

// Get active notifications
function getActiveNotifications() {
    const active = [];
    
    for (const id in clientConnections) {
        const conn = clientConnections[id];
        active.push({
            id,
            name: conn.connection.name,
            topics: conn.topics
        });
    }
    
    return active;
}

// Start the server
app.listen(port, () => {
    console.log(`Genesys Cloud Notification Listener kører på port ${port}`);
});