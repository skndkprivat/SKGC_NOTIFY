const logger = require('../utils/logger');
const { loadConnectionsConfig } = require('./token');
const platformClient = require('purecloud-platform-client-v2');
const WebSocket = require('ws');
const { incrementApiCounter } = require('./stats');

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
                incrementApiCounter('getUsersMe');
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

async function pollQueueStatistics(connectionId, connection) {
    try {
        logger.info('Starting simplified queue statistics polling', { connectionId });
        
        const client = platformClient.ApiClient.instance;
        client.setAccessToken(connection.accessToken);
        
        try {
            // Hent grundlæggende API-instanser
            const routingApi = new platformClient.RoutingApi();
            const presenceApi = new platformClient.PresenceApi();
            const usersApi = new platformClient.UsersApi();
            
            // 1. Hent alle køer
            incrementApiCounter('getRoutingQueues');
            const queuesResponse = await routingApi.getRoutingQueues({
                pageSize: 25,
                pageNumber: 1
            });
            
            if (!queuesResponse || !queuesResponse.entities || queuesResponse.entities.length === 0) {
                logger.info('No queues found', { connectionId });
                return;
            }
            
            logger.info(`Found ${queuesResponse.entities.length} queues`, { connectionId });
            
            // 2. Hent alle brugere
            incrementApiCounter('getUsers');
            const usersResponse = await usersApi.getUsers({
                pageSize: 100,
                pageNumber: 1
            });
            
            if (!usersResponse || !usersResponse.entities) {
                logger.info('No users found', { connectionId });
                return;
            }
            
            const allUsers = usersResponse.entities;
            logger.info(`Found ${allUsers.length} users`, { connectionId });
            
            // 3. Hent brugerstatus for hver bruger
            const userStatusMap = {};
            for (const user of allUsers) {
                try {
                    incrementApiCounter('getUserPresence');
                    const presenceResponse = await presenceApi.getUserPresence(user.id, 'PURECLOUD');
                    
                    userStatusMap[user.id] = {
                        id: user.id,
                        name: user.name,
                        status: presenceResponse.presenceDefinition.systemPresence,
                        isAvailable: presenceResponse.presenceDefinition.systemPresence === 'AVAILABLE' || 
                 presenceResponse.presenceDefinition.systemPresence === 'On Queue'
                    };
                    
                    logger.info(`User ${user.name} status: ${userStatusMap[user.id].status}`, { userId: user.id });
                } catch (error) {
                    logger.error('Error fetching user presence', { userId: user.id, error: error.message });
                }
            }
            
            // 4. For hver kø, hent medlemmer og tæl aktive brugere
            for (const queue of queuesResponse.entities) {
                try {
                    // Opret en notifikation for køen
                    const notification = {
                        timestamp: new Date(),
                        topic: 'v2.routing.queues.statistics',
                        data: {
                            id: queue.id,
                            name: queue.name,
                            description: queue.description || '',
                            statistics: {
                                usersActive: 0,
                                usersAvailable: 0,
                                usersOnQueue: 0,
                                contactsWaiting: 0,
                                longestWaitingMs: 0
                            }
                        }
                    };
                    
                    // Hent kømedlemmer
                    try {
                        incrementApiCounter('getRoutingQueueMembers');
                        
                        logger.info(`Fetching members for queue ${queue.name}`, { 
                            queueId: queue.id 
                        });
                        
                        // Prøv at hente medlemmer med joined=true
                        const queueMembersResponse = await routingApi.getRoutingQueueMembers(queue.id, {
                            joined: true,
                            pageSize: 100,
                            pageNumber: 1
                        });
                        
                        if (queueMembersResponse && queueMembersResponse.entities) {
                            const queueMembers = queueMembersResponse.entities;
                            
                            // Log detaljeret information om medlemmerne
                            logger.info(`Queue ${queue.name} has ${queueMembers.length} members with joined=true`, { 
                                queueId: queue.id,
                                memberCount: queueMembers.length,
                                memberIds: queueMembers.map(m => m.id)
                            });
                            
                            // Hvis vi har mindst ét medlem, log detaljer om det første medlem for at forstå datastrukturen
                            if (queueMembers.length > 0) {
                                try {
                                    logger.info(`Sample queue member data for ${queue.name}`, {
                                        queueId: queue.id,
                                        memberSample: JSON.stringify(queueMembers[0]).substring(0, 500)
                                    });
                                } catch (e) {
                                    logger.info(`Could not stringify queue member data: ${e.message}`);
                                }
                            }
                            
                            // Sæt total antal brugere på køen
                            notification.data.statistics.usersOnQueue = queueMembers.length;
                            
                            // Tæl aktive og tilgængelige brugere baseret på presence
                            let activeUsers = 0;
                            let availableUsers = 0;
                            
                            // Hvis vi ikke har nogen kømedlemmer, prøv en alternativ tilgang
                            if (queueMembers.length === 0) {
                                logger.info(`No queue members found with joined=true, trying without joined filter`, {
                                    queueId: queue.id
                                });
                                
                                // Hent alle kømedlemmer uanset joined status
                                const allQueueMembersResponse = await routingApi.getRoutingQueueMembers(queue.id, {
                                    pageSize: 100,
                                    pageNumber: 1
                                });
                                
                                if (allQueueMembersResponse && allQueueMembersResponse.entities) {
                                    const allMembers = allQueueMembersResponse.entities;
                                    
                                    // Log information om alle medlemmer
                                    logger.info(`Queue ${queue.name} has ${allMembers.length} total members (including not joined)`, {
                                        queueId: queue.id,
                                        totalMemberCount: allMembers.length
                                    });
                                    
                                    // Hvis vi har medlemmer, men ingen var joined=true, brug alle medlemmer i stedet
                                    if (allMembers.length > 0) {
                                        // Log det første medlem for at forstå datastrukturen
                                        try {
                                            logger.info(`Sample queue member data (all members) for ${queue.name}`, {
                                                queueId: queue.id,
                                                memberSample: JSON.stringify(allMembers[0]).substring(0, 500)
                                            });
                                        } catch (e) {
                                            logger.info(`Could not stringify queue member data: ${e.message}`);
                                        }
                                        
                                        // Brug alle medlemmer og opdater statistikken
                                        queueMembers.push(...allMembers);
                                        notification.data.statistics.usersOnQueue = queueMembers.length;
                                    }
                                }
                            }
                            
                            // Gå gennem hver bruger for at tjekke deres status
                            for (const member of queueMembers) {
                                // Brug den brugerstatus vi hentede tidligere
                                const userStatus = userStatusMap[member.id];
                                
                                if (userStatus) {
                                    logger.info(`Queue member ${userStatus.name} status for ${queue.name}: ${userStatus.status}`, {
                                        queueId: queue.id,
                                        userId: member.id,
                                        status: userStatus.status,
                                        // Log eventuel joined status for at forstå datastrukturen
                                        joined: member.joined
                                    });
                                    
                                    // En bruger på køen tælles som aktiv hvis ikke OFFLINE
                                    if (userStatus.status !== 'OFFLINE') {
                                        activeUsers++;
                                    }
                                    
                                    // En bruger tælles som tilgængelig hvis de er AVAILABLE
                                    if (userStatus.isAvailable) {
                                        availableUsers++;
                                    }
                                } else {
                                    logger.info(`No status found for queue member in ${queue.name}, fetching now`, {
                                        memberId: member.id
                                    });
                                    
                                    // Hvis vi ikke har status for denne bruger, forsøg at hente den nu
                                    try {
                                        incrementApiCounter('getUserPresence');
                                        const presence = await presenceApi.getUserPresence(member.id, 'PURECLOUD');
                                        
                                        // Log den hentede status
                                        logger.info(`Fetched presence for queue member: ${presence.presenceDefinition.systemPresence}`, {
                                            memberId: member.id,
                                            queueId: queue.id
                                        });
                                        
                                        // Behandl status
                                        if (presence.presenceDefinition.systemPresence !== 'OFFLINE') {
                                            activeUsers++;
                                        }
                                        
                                        if (presence.presenceDefinition.systemPresence === 'AVAILABLE' || 
											presence.presenceDefinition.systemPresence === 'On Queue') {
                                            availableUsers++;
                                        }
                                    } catch (presenceError) {
                                        logger.error('Error fetching presence for queue member', {
                                            error: presenceError.message,
                                            memberId: member.id
                                        });
                                    }
                                }
                            }
                            
                            // Opdater statistikken med brugertælling
                            notification.data.statistics.usersActive = activeUsers;
                            notification.data.statistics.usersAvailable = availableUsers;
                            
                            // Log detaljerede statistikker
                            logger.info(`Final queue stats for ${queue.name}`, {
                                queueId: queue.id,
                                usersOnQueue: notification.data.statistics.usersOnQueue,
                                usersActive: notification.data.statistics.usersActive,
                                usersAvailable: notification.data.statistics.usersAvailable
                            });
                        } else {
                            logger.info(`No entities in queueMembersResponse for ${queue.name}`, { queueId: queue.id });
                        }
                    } catch (memberError) {
                        logger.error('Error fetching queue members', {
                            queueId: queue.id,
                            queueName: queue.name,
                            error: memberError.message
                        });
                        
                        // Hvis den første metode fejler, prøv uden joined parameter
                        try {
                            logger.info(`Trying to fetch queue members without joined parameter for ${queue.name}`, { queueId: queue.id });
                            
                            const fallbackResponse = await routingApi.getRoutingQueueMembers(queue.id, {
                                pageSize: 100,
                                pageNumber: 1
                            });
                            
                            if (fallbackResponse && fallbackResponse.entities) {
                                const allMembers = fallbackResponse.entities;
                                
                                logger.info(`Fallback method returned ${allMembers.length} members for ${queue.name}`, {
                                    queueId: queue.id
                                });
                                
                                // Behandl dem på samme måde som ovenfor
                                notification.data.statistics.usersOnQueue = allMembers.length;
                                
                                let activeUsers = 0;
                                let availableUsers = 0;
                                
                                // Tæl aktive og tilgængelige brugere
                                for (const member of allMembers) {
                                    const userStatus = userStatusMap[member.id];
                                    
                                    if (userStatus) {
                                        if (userStatus.status !== 'OFFLINE') {
                                            activeUsers++;
                                        }
                                        
                                        if (userStatus.isAvailable) {
                                            availableUsers++;
                                        }
                                    }
                                }
                                
                                notification.data.statistics.usersActive = activeUsers;
                                notification.data.statistics.usersAvailable = availableUsers;
                                
                                logger.info(`Fallback queue stats for ${queue.name}`, {
                                    queueId: queue.id,
                                    usersOnQueue: notification.data.statistics.usersOnQueue,
                                    usersActive: notification.data.statistics.usersActive,
                                    usersAvailable: notification.data.statistics.usersAvailable
                                });
                            }
                        } catch (fallbackError) {
                            logger.error('Error in fallback method for queue members', {
                                queueId: queue.id,
                                error: fallbackError.message
                            });
                        }
                    }
                    
                    // Hent ventende samtaler
                    try {
                        const conversationsApi = new platformClient.ConversationsApi();
                        
                        if (typeof conversationsApi.getConversations === 'function') {
                            incrementApiCounter('getConversations');
                            const conversationsResponse = await conversationsApi.getConversations();
                            
                            if (conversationsResponse && conversationsResponse.entities) {
                                let waitingContacts = 0;
                                let longestWaitingMs = 0;
                                const now = new Date();
                                
                                // Tæl ventende samtaler for denne kø
                                conversationsResponse.entities.forEach(conv => {
                                    if (conv.participants) {
                                        conv.participants.forEach(p => {
                                            if (p.purpose === 'customer' && 
                                                p.queueId === queue.id && 
                                                (p.state === 'alerting' || p.state === 'waiting')) {
                                                
                                                waitingContacts++;
                                                
                                                if (p.startTime) {
                                                    const startTime = new Date(p.startTime);
                                                    const waitTime = now - startTime;
                                                    
                                                    if (waitTime > longestWaitingMs) {
                                                        longestWaitingMs = waitTime;
                                                    }
                                                }
                                            }
                                        });
                                    }
                                });
                                
                                notification.data.statistics.contactsWaiting = waitingContacts;
                                notification.data.statistics.longestWaitingMs = longestWaitingMs;
                                
                                logger.info(`Queue ${queue.name} has ${waitingContacts} waiting contacts`, {
                                    queueId: queue.id,
                                    waitingContacts,
                                    longestWaitingMs
                                });
                            }
                        }
                    } catch (convError) {
                        logger.error('Error fetching conversations', {
                            queueId: queue.id,
                            error: convError.message
                        });
                    }
                    
                    // Tilføj eller opdater notifikationen
                    updateOrAddNotification(connectionId, notification);
                    
                } catch (queueError) {
                    logger.error('Error processing queue', {
                        queueId: queue.id,
                        error: queueError.message
                    });
                }
            }
            
        } catch (apiError) {
            logger.error('Error in queue statistics polling', {
                error: apiError.message
            });
        }
        
    } catch (error) {
        logger.error('Top-level error in queue statistics polling', {
            error: error.message
        });
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
			
			// Hvis vi lytter til kø-statistik, hent dem
			if (clientConnections[connectionId].topics.some(topic => topic.includes('queues'))) {
				await pollQueueStatistics(connectionId, connection);
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
                incrementApiCounter('getUsers');
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
                            incrementApiCounter('getUserPresence');
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
        
        incrementApiCounter('getQualityEvaluations');
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
    } 
    // Håndtér kø-statistikker specifikt for at undgå duplikater
    else if (notification.topic.includes('routing.queues.statistics')) {
        // Tjek om vi allerede har en notifikation for denne kø
        const existingIndex = notifications[connectionId].findIndex(
            n => n.topic === notification.topic && n.data.id === notification.data.id
        );
        
        if (existingIndex === -1) {
            // Ny kø - tilføj til starten
            notifications[connectionId].unshift(notification);
            logger.info(`Added queue stats for ${notification.data.name}`, {
                usersOnQueue: notification.data.statistics.usersOnQueue,
                usersActive: notification.data.statistics.usersActive,
                usersAvailable: notification.data.statistics.usersAvailable,
                waitingContacts: notification.data.statistics.contactsWaiting || 0
            });
        } else {
            // Opdater eksisterende kø-statistik
            notifications[connectionId][existingIndex] = notification;
            logger.info(`Updated queue stats for ${notification.data.name}`, {
                usersOnQueue: notification.data.statistics.usersOnQueue,
                usersActive: notification.data.statistics.usersActive,
                usersAvailable: notification.data.statistics.usersAvailable,
                waitingContacts: notification.data.statistics.contactsWaiting || 0
            });
        }
    }
    else {
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
        incrementApiCounter('postNotificationsChannels');
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
            incrementApiCounter('postNotificationsChannelSubscriptions');
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
                    logger.info('Received WebSocket message', { 
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
                    reason: reason ? reason.toString() : '',
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
    incrementApiCounter('getNotifications');
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