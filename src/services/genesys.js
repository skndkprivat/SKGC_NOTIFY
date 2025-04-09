const logger = require('../utils/logger');
const { loadConnectionsConfig } = require('./token');
const platformClient = require('purecloud-platform-client-v2');

// Store for client connections and status data
const clientConnections = {};
const notifications = {};

// Polling interval referencer
const pollingIntervals = {};

async function connectToGenesys(connectionId, topics) {
    logger.info('Setting up Genesys API polling', { 
        connectionId, 
        topics 
    });

    // Hent forbindelseskonfiguration
    const configs = loadConnectionsConfig();
    const connection = configs.connections.find(c => c.id === connectionId);
    
    if (!connection) {
        throw new Error('Connection not found');
    }

    // Sørg for at emner altid er et array
    const topicsArray = Array.isArray(topics) ? topics : [topics];
    
    // Tjek om forbindelsen allerede eksisterer
    if (clientConnections[connectionId]) {
        // Tilføj nye emner til eksisterende forbindelse
        const existingTopics = clientConnections[connectionId].topics || [];
        const uniqueTopics = [...new Set([...existingTopics, ...topicsArray])];
        
        clientConnections[connectionId] = {
            ...clientConnections[connectionId],
            topics: uniqueTopics,
            timestamp: new Date()
        };
    } else {
        // Opret ny forbindelse
        clientConnections[connectionId] = {
            id: connectionId,
            name: connection.name,
            topics: topicsArray,
            region: connection.region,
            timestamp: new Date()
        };
    }

    // Initialiser notifikationsarray for denne forbindelse
    if (!notifications[connectionId]) {
        notifications[connectionId] = [];
    }

    // Stop eksisterende polling hvis den findes
    if (pollingIntervals[connectionId]) {
        clearInterval(pollingIntervals[connectionId]);
        delete pollingIntervals[connectionId];
    }

    try {
        // Opsæt Genesys Cloud API klient
        const client = platformClient.ApiClient.instance;
        
        // Konverter region string til det rigtige format
        let region = 'mypurecloud.com'; // Default US East
        
        if (connection.region === 'mypurecloud.de') {
            region = platformClient.PureCloudRegionHosts.eu_central_1;
        } else if (connection.region === 'mypurecloud.ie') {
            region = platformClient.PureCloudRegionHosts.eu_west_1;
        } else if (connection.region === 'mypurecloud.com.au') {
            region = platformClient.PureCloudRegionHosts.ap_southeast_2;
        } else if (connection.region === 'mypurecloud.jp') {
            region = platformClient.PureCloudRegionHosts.ap_northeast_1;
        } else {
            region = platformClient.PureCloudRegionHosts.us_east_1;
        }
        
        client.setEnvironment(region);
        
        // Autentificering
        if (connection.accessToken) {
            client.setAccessToken(connection.accessToken);
            logger.info('Testing authentication...', { connectionId });
            
            try {
                // Test API-kaldet med UsersApi
                const usersApi = new platformClient.UsersApi();
                const me = await usersApi.getUsersMe();
                logger.info('Authentication successful', { 
                    userId: me.id,
                    userName: me.name
                });
                
                // Tilføj en test-notifikation
                //addTestNotification(connectionId);
                
                // Start polling for brugerstatus
                startStatusPolling(connectionId, connection.accessToken);
                
                return Promise.resolve();
                
            } catch (error) {
                logger.error('Authentication failed', { 
                    error: error.message,
                    statusCode: error.statusCode
                });
                
                // Tilføj en test-notifikation for at vise noget i UI
                //addTestNotification(connectionId);
                return Promise.resolve();
            }
            
        } else {
            logger.warn('No access token found for connection', { connectionId });
            //addTestNotification(connectionId);
            return Promise.resolve();
        }
        
    } catch (error) {
        logger.error('Error setting up Genesys Cloud client', { 
            error: error.message,
            connectionId
        });
        
        //addTestNotification(connectionId);
    }

    return Promise.resolve();
}

// Funktion til at starte regelmæssig polling af brugerstatus
function startStatusPolling(connectionId, accessToken) {
    logger.info('Starting status polling', { connectionId });
    
    // Hent kun den aktuelle brugers status
    const pollStatus = async () => {
        try {
            const presenceApi = new platformClient.PresenceApi();
            const usersApi = new platformClient.UsersApi();
            
            // Hent information om den aktuelle bruger
            const me = await usersApi.getUsersMe();
            logger.info('Got current user info', { id: me.id, name: me.name });
            
            // Prøv at hente presence for den aktuelle bruger
            try {
                const presence = await presenceApi.getUserPresence(me.id, 'PURECLOUD');
                
                // Skab en notifikation-lignende struktur
                const notification = {
                    timestamp: new Date(),
                    topic: `v2.users.${me.id}.presence`,
                    data: {
                        id: me.id,
                        name: me.name,
                        presenceDefinition: presence.presenceDefinition,
                        modifiedDate: presence.modifiedDate
                    }
                };
                
                // Tilføj eller opdater notifikationen
                const existingIndex = notifications[connectionId].findIndex(
                    n => n.topic === notification.topic
                );
                
                if (existingIndex === -1) {
                    notifications[connectionId].unshift(notification);
                    logger.info('Added my presence', { 
                        systemPresence: presence.presenceDefinition.systemPresence 
                    });
                } else {
                    const existingDate = new Date(notifications[connectionId][existingIndex].data.modifiedDate);
                    const newDate = new Date(presence.modifiedDate);
                    
                    if (newDate > existingDate) {
                        notifications[connectionId][existingIndex] = notification;
                        logger.info('Updated my presence', { 
                            systemPresence: presence.presenceDefinition.systemPresence 
                        });
                    }
                }
                
            } catch (presenceError) {
                logger.error('Failed to get my presence', { 
                    error: presenceError.message,
                    userId: me.id
                });
            }
            
        } catch (error) {
            logger.error('Error polling user status', { error: error.message });
        }
    };
    
    // Kald funktionen med det samme for at få startdata
    pollStatus();
    
    // Sæt derefter intervallet op (hver 10 sekunder)
    pollingIntervals[connectionId] = setInterval(pollStatus, 10000);
}
function addTestNotification(connectionId) {
    const testNotification = {
        timestamp: new Date(),
        topic: 'v2.notifications.user.presence',
        data: {
            id: 'test-user',
            name: 'Test User',
            presenceDefinition: {
                systemPresence: 'AVAILABLE',
                presenceMessage: 'Available'
            },
            modifiedDate: new Date().toISOString()
        }
    };
    
    notifications[connectionId].unshift(testNotification);
    logger.info('Added test notification', { connectionId });
}

function disconnectFromGenesys(connectionId) {
    logger.info('Disconnecting from Genesys Cloud', { connectionId });

    // Stop polling interval
    if (pollingIntervals[connectionId]) {
        clearInterval(pollingIntervals[connectionId]);
        delete pollingIntervals[connectionId];
    }

    // Fjern forbindelse og notifikationer
    if (clientConnections[connectionId]) {
        delete clientConnections[connectionId];
        delete notifications[connectionId];
    }
}

function getActiveNotifications() {
    return Object.keys(clientConnections).map(id => ({
        id,
        name: clientConnections[id].name,
        topics: clientConnections[id].topics
    }));
}

function getNotifications(connectionId) {
    logger.info('Getting notifications for connection', { 
        connectionId,
        count: notifications[connectionId] ? notifications[connectionId].length : 0
    });
    
    // Returner notifikationer eller tom array
    return notifications[connectionId] || [];
}

module.exports = {
    connectToGenesys,
    disconnectFromGenesys,
    getActiveNotifications,
    getNotifications
};