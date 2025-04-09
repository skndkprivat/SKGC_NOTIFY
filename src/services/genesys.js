const logger = require('../utils/logger');
const { loadConnectionsConfig } = require('./token');
const platformClient = require('purecloud-platform-client-v2');
const WebSocket = require('ws');

// Store for client connections and status data
const clientConnections = {};
const notifications = {};
const websockets = {}; // Gem aktive websocket-forbindelser

// Polling interval referencer
const pollingIntervals = {};

async function connectToGenesys(connectionId, topics, options = {}) {
    logger.info('Setting up Genesys Cloud connection', { 
        connectionId, 
        topics,
        options
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
            timestamp: new Date(),
            options: { ...clientConnections[connectionId].options, ...options }
        };
    } else {
        // Opret ny forbindelse
        clientConnections[connectionId] = {
            id: connectionId,
            name: connection.name,
            topics: topicsArray,
            region: connection.region,
            timestamp: new Date(),
            options: options
        };
    }

    // Initialiser notifikationsarray for denne forbindelse
    if (!notifications[connectionId]) {
        notifications[connectionId] = [];
    }

    // Stop eksisterende polling eller websockets hvis de findes
    if (pollingIntervals[connectionId]) {
        clearInterval(pollingIntervals[connectionId]);
        delete pollingIntervals[connectionId];
    }
    
    if (websockets[connectionId]) {
        try {
            websockets[connectionId].close();
        } catch (e) {
            // Ignorér eventuelle fejl ved lukning af websocket
        }
        delete websockets[connectionId];
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
                
                // Start notifikationer baseret på valgt metode
                const method = clientConnections[connectionId].options.method || 'websocket';
                
                try {
                    if (method === 'websocket') {
                        // Start websocket-baserede notifikationer
                        await setupWebsocketNotifications(connectionId, connection);
                    } else {
                        // Start polling-baserede notifikationer
                        startStatusPolling(connectionId, connection);
                    }
                    
                    return Promise.resolve();
                } catch (notificationError) {
                    logger.error('Error setting up notifications', {
                        error: notificationError.message || JSON.stringify(notificationError),
                        connectionId
                    });
                    
                    // Fald altid tilbage til polling ved fejl
                    logger.info('Falling back to polling method due to setup error', { connectionId });
                    clientConnections[connectionId].options.method = 'polling';
                    startStatusPolling(connectionId, connection);
                    
                    return Promise.resolve();
                }
                
            } catch (error) {
                logger.error('Authentication failed', { 
                    error: error.message,
                    statusCode: error.statusCode
                });
                return Promise.reject(error);
            }
            
        } else {
            logger.warn('No access token found for connection', { connectionId });
            return Promise.reject(new Error('No access token found'));
        }
        
    } catch (error) {
        logger.error('Error setting up Genesys Cloud client', { 
            error: error.message,
            connectionId
        });
        return Promise.reject(error);
    }
}
// Funktion til at starte regelmæssig polling af brugerstatus
function startStatusPolling(connectionId, connection) {
    const interval = clientConnections[connectionId].options.pollingInterval || 30000;
    logger.info(`Starting status polling with interval ${interval}ms`, { connectionId });
    
    // Hent primær topic-type
    const hasPresenceTopic = clientConnections[connectionId].topics.some(topic => 
        topic.includes('presence'));
    
    const hasQualityTopic = clientConnections[connectionId].topics.some(topic => 
        topic.includes('quality'));
    
    // Poll status for alle brugere eller evalueringer
    const pollData = async () => {
        try {
            // Hvis vi lytter til presence, hent for alle brugere
            if (hasPresenceTopic) {
                await pollAllUsersPresence(connectionId, connection);
            }
            
            // Hvis vi lytter til kvalitetsevalueringer, hent dem
            if (hasQualityTopic) {
                await pollQualityEvaluations(connectionId, connection);
            }
            
        } catch (error) {
            logger.error('Error in poll data', { error: error.message });
        }
    };
    
    // Kald funktionen med det samme for at få startdata
    pollData();
    
    // Sæt derefter intervallet op
    pollingIntervals[connectionId] = setInterval(pollData, interval);
}

// Hent presence for alle brugere
async function pollAllUsersPresence(connectionId, connection) {
    try {
        const client = platformClient.ApiClient.instance;
        client.setAccessToken(connection.accessToken);
        
        const presenceApi = new platformClient.PresenceApi();
        const usersApi = new platformClient.UsersApi();
        
        // Hent en liste over alle brugere (med pagination)
        let pageNumber = 1;
        let pageSize = 50; // Hent 50 brugere ad gangen
        let hasMore = true;
        
        while (hasMore) {
            logger.info(`Fetching users page ${pageNumber}`, { connectionId });
            
            try {
                // Hent en side af brugere
                const usersResponse = await usersApi.getUsers({
                    pageSize: pageSize,
                    pageNumber: pageNumber
                });
                
                // Hvis der er brugere i denne side
                if (usersResponse.entities && usersResponse.entities.length > 0) {
                    logger.info(`Found ${usersResponse.entities.length} users on page ${pageNumber}`, { connectionId });
                    
                    // For hver bruger på denne side
                    for (const user of usersResponse.entities) {
                        try {
                            // Hent presence for denne bruger
                            const presence = await presenceApi.getUserPresence(user.id, 'PURECLOUD');
                            
                            // Skab en notifikation-lignende struktur
                            const notification = {
                                timestamp: new Date(),
                                topic: `v2.users.${user.id}.presence`,
                                data: {
                                    id: user.id,
                                    name: user.name,
                                    presenceDefinition: presence.presenceDefinition,
                                    modifiedDate: presence.modifiedDate
                                }
                            };
                            
                            // Tilføj eller opdater notifikationen
                            updateOrAddNotification(connectionId, notification);
                            
                        } catch (presenceError) {
                            // Spring over denne bruger hvis der er fejl
                            logger.error('Failed to get presence for user', { 
                                error: presenceError.message,
                                userId: user.id
                            });
                        }
                    }
                    
                    // Gå til næste side
                    pageNumber++;
                    
                    // Hvis vi har modtaget færre brugere end pageSize, er der ikke flere sider
                    if (usersResponse.entities.length < pageSize) {
                        hasMore = false;
                    }
                } else {
                    // Ingen flere brugere at hente
                    hasMore = false;
                }
            } catch (pageError) {
                logger.error('Error fetching users page', {
                    error: pageError.message,
                    pageNumber
                });
                hasMore = false;
            }
        }
        
    } catch (error) {
        logger.error('Error polling users presence', { error: error.message });
    }
}

// Hent kvalitetsevalueringer
async function pollQualityEvaluations(connectionId, connection) {
    try {
        const client = platformClient.ApiClient.instance;
        client.setAccessToken(connection.accessToken);
        
        const qualityApi = new platformClient.QualityApi();
        
        // Hent evalueringer fra de sidste 24 timer
        const now = new Date();
        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        
        const response = await qualityApi.getQualityEvaluations({
            pageSize: 25,
            pageNumber: 1, 
            sortOrder: 'desc',
            sortBy: 'dateModified',
            startTime: yesterday.toISOString(),
            endTime: now.toISOString()
        });
        
        if (response.entities && response.entities.length > 0) {
            logger.info(`Found ${response.entities.length} evaluations`, { connectionId });
            
            for (const evaluation of response.entities) {
                const notification = {
                    timestamp: new Date(),
                    topic: 'v2.quality.evaluations',
                    data: evaluation
                };
                
                updateOrAddNotification(connectionId, notification);
            }
        }
        
    } catch (error) {
        logger.error('Error polling quality evaluations', { error: error.message });
    }
}

// Hjælpefunktion til at opdatere eller tilføje notifikationer
function updateOrAddNotification(connectionId, notification) {
    // Hvis der ikke er et notification array for denne forbindelse, opret det
    if (!notifications[connectionId]) {
        notifications[connectionId] = [];
    }
    
    // For presence-notifikationer, opdater eksisterende hvis vi har en med samme bruger-ID
    if (notification.topic.includes('presence')) {
        const existingIndex = notifications[connectionId].findIndex(
            n => n.topic === notification.topic
        );
        
        if (existingIndex === -1) {
            // Ny notifikation - tilføj den til starten af arrayet
            notifications[connectionId].unshift(notification);
            logger.info(`Added presence for ${notification.data.name}`, { 
                systemPresence: notification.data.presenceDefinition.systemPresence 
            });
        } else {
            // Eksisterende notifikation - opdater kun hvis den er nyere
            const existingDate = new Date(notifications[connectionId][existingIndex].data.modifiedDate);
            const newDate = new Date(notification.data.modifiedDate);
            
            if (newDate > existingDate) {
                notifications[connectionId][existingIndex] = notification;
                logger.info(`Updated presence for ${notification.data.name}`, { 
                    systemPresence: notification.data.presenceDefinition.systemPresence 
                });
            }
        }
    } else {
        // For andre notifikationstyper, tilføj dem altid til starten
        notifications[connectionId].unshift(notification);
        
        // Begræns antallet af notifikationer til 200 for at undgå hukommelsesproblemer
        if (notifications[connectionId].length > 200) {
            notifications[connectionId] = notifications[connectionId].slice(0, 200);
        }
    }
}

// Opsæt websocket-baserede notifikationer
async function setupWebsocketNotifications(connectionId, connection) {
    try {
        logger.info('Setting up websocket notifications', { connectionId });
        
        const client = platformClient.ApiClient.instance;
        client.setAccessToken(connection.accessToken);
        
        const notificationsApi = new platformClient.NotificationsApi();
        
        // Generér et unikt kanal-ID for denne forbindelse
        const channelId = `streaming-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        
        // Opret en notifications channel
        const channel = await notificationsApi.postNotificationsChannels({
            id: channelId,
            connectUri: `wss://streaming.${connection.region}/channels/streaming/subscriptions`,
            type: 'streaming'
        });
        
        logger.info('Created notifications channel', { 
            channelId: channel.id,
            connectionId 
        });
        
        // Konvertér vores topics til det format, som Notifications API forventer
        const subscriptionTopics = [];
        const topics = Array.isArray(clientConnections[connectionId].topics) 
            ? clientConnections[connectionId].topics 
            : [clientConnections[connectionId].topics];
            
        topics.forEach(topic => {
            // Hvis topic er 'v2.users.*.presence', skal vi bruge 'v2.users.{id}.presence'
            if (topic === 'v2.users.*.presence') {
                subscriptionTopics.push({
                    id: 'v2.users.{id}.presence',
                    type: 'wildcard'
                });
            } else {
                subscriptionTopics.push({
                    id: topic,
                    type: 'normal'
                });
            }
        });
        
        logger.info('Subscribing to topics', { 
            topics: subscriptionTopics,
            connectionId
        });
        
        try {
            // Abonnér på de ønskede topics
            await notificationsApi.postNotificationsChannelSubscriptions(
                channel.id, 
                subscriptionTopics
            );
            
            logger.info('Successfully subscribed to topics', { connectionId });
            
            // Opret WebSocket-forbindelse til streaming URI'en
            const socket = new WebSocket(channel.connectUri);
            
            // Gem socket-reference så vi kan lukke den senere
            websockets[connectionId] = socket;
            
            // Håndtér WebSocket events
            socket.on('open', () => {
                logger.info('WebSocket connection established', { connectionId });
            });
            
            socket.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    logger.debug('Received WebSocket message', { 
                        type: message.eventBody ? message.eventBody.type : 'unknown',
                        connectionId
                    });
                    
                    // Behandl kun meddelelser med topicName og eventBody
                    if (message.topicName && message.eventBody) {
                        // Opret en notifikation fra websocket-data
                        const notification = {
                            timestamp: new Date(),
                            topic: message.topicName,
                            data: message.eventBody
                        };
                        
                        // For presence-events, skal vi omforme data til samme format som vores polling-funktion
                        if (message.topicName.includes('presence')) {
                            // Omform data for at matche formatet fra polling
                            notification.data = {
                                id: message.eventBody.userId || message.eventBody.id,
                                name: message.eventBody.name || 'Unknown User',
                                presenceDefinition: message.eventBody.presenceDefinition,
                                modifiedDate: message.eventBody.modifiedDate || new Date().toISOString()
                            };
                        }
                        
                        // Tilføj eller opdater notifikationen i vores lager
                        updateOrAddNotification(connectionId, notification);
                    }
                } catch (error) {
                    logger.error('Error processing WebSocket message', { 
                        error: error.message,
                        connectionId
                    });
                }
            });
            
            socket.on('error', (error) => {
                logger.error('WebSocket error', { 
                    error: error.message || 'Unknown WebSocket error',
                    connectionId
                });
            });
            
            socket.on('close', (code, reason) => {
                logger.info('WebSocket connection closed', { 
                    code, 
                    reason: reason.toString(),
                    connectionId
                });
                
                // Prøv at genoprette forbindelsen efter en lille forsinkelse
                // men kun hvis forbindelsen stadig eksisterer i clientConnections
                if (clientConnections[connectionId]) {
                    setTimeout(() => {
                        logger.info('Attempting to reconnect WebSocket', { connectionId });
                        setupWebsocketNotifications(connectionId, connection)
                            .catch(error => {
                                logger.error('Failed to reconnect WebSocket', { 
                                    error: error.message,
                                    connectionId
                                });
                            });
                    }, 5000);
                }
            });
            
            // Returner channel- og socket-objekter til caller
            return { channel, socket };
            
        } catch (subscriptionError) {
            logger.error('Error subscribing to topics', { 
                error: subscriptionError.message,
                connectionId
            });
            
            // Hvis der er en fejl ved abonnement, prøv at falde tilbage til polling-metode
            logger.info('Falling back to polling method', { connectionId });
            clientConnections[connectionId].options.method = 'polling';
            startStatusPolling(connectionId, connection);
            return null;
        }
    } catch (error) {
        logger.error('Error setting up WebSocket notifications', { 
            error: error.message || JSON.stringify(error),
            connectionId
        });
        
        // Fald tilbage til polling-metode ved fejl
        logger.info('Falling back to polling method due to error', { connectionId });
        clientConnections[connectionId].options.method = 'polling';
        startStatusPolling(connectionId, connection);
        return null;
    }
}

	function disconnectFromGenesys(connectionId) {
		logger.info('Disconnecting from Genesys Cloud', { connectionId });

    // Stop polling interval
    if (pollingIntervals[connectionId]) {
        clearInterval(pollingIntervals[connectionId]);
        delete pollingIntervals[connectionId];
    }

    // Luk websocket hvis den findes
    if (websockets[connectionId]) {
        try {
            websockets[connectionId].close();
        } catch (e) {
            // Ignorér eventuelle fejl ved lukning af websocket
        }
        delete websockets[connectionId];
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
        topics: clientConnections[id].topics,
        method: clientConnections[id].options?.method || 'websocket',
        pollingInterval: clientConnections[id].options?.pollingInterval || 30000
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