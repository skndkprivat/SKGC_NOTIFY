// Internationalization support
const translations = {
    "da": {
        appTitle: "Genesys Cloud Notifikations Lytter",
        connections: "Forbindelser",
        region: "Region",
        clientId: "Client ID",
        removeBtn: "Fjern",
        addNewConnection: "Tilføj ny forbindelse",
        customerName: "Kundenavn",
        clientSecret: "Client Secret",
        addBtn: "Tilføj",
        listenToNotifications: "Lyt til notifikationer",
        activeConnections: "Aktive forbindelser",
        noActiveListeners: "Ingen aktive notifikationslyttere.",
        listeningTo: "Lytter til:",
        stopListeningBtn: "Stop lytning",
        startNewListening: "Start ny lytning",
        addConnectionFirst: "Tilføj først en forbindelse for at starte en lytning.",
        selectConnection: "Vælg forbindelse",
        selectCustomer: "Vælg en kunde...",
        selectNotifications: "Vælg notifikationer at lytte til",
        startListeningBtn: "Start lytning",
        notificationDashboard: "Notifikations-dashboard",
        startListeningToSee: "Start en lytning for at se notifikationer her.",
        selectConnectionToView: "Vælg en forbindelse for at se notifikationer",
        latestNotifications: "Seneste notifikationer",
        noNotificationsYet: "Ingen notifikationer modtaget endnu",
        allFieldsRequired: "Alle felter er påkrævet",
        selectAtLeastOneTopic: "Vælg mindst én notifikation",
        connectionNotFound: "Forbindelse ikke fundet",
        connectionError: "Fejl ved forbindelse til Genesys Cloud",
        noActiveConnection: "Ingen aktiv forbindelse",
        conversationEvents: "Samtalebegivenheder",
        userEvents: "Brugerbegivenheder",
        groupEvents: "Gruppebegivenheder",
        queueEvents: "Kø-begivenheder",
        emailEvents: "Email-begivenheder",
        outboundEvents: "Udgående begivenheder",
        workflowEvents: "Workflow-begivenheder",
        presenceEvents: "Tilstedeværelses-begivenheder",
        coachingEvents: "Coaching-begivenheder",
        authorizeFirst: "Autoriser først denne forbindelse",
        authorizeBtn: "Autoriser",
        qualityEvents: "Kvalitetsvurderinger",
        unauthorizedConnection: "Uautoriseret forbindelse",
        websocketMethod: 'WebSocket (realtid, anbefalet)',
        pollingMethod: 'Polling (manuel opdatering)',
        methodLabel: 'Metode',
        pollingIntervalLabel: 'Opdateringsinterval (sekunder)',
        seconds10: '10 sekunder',
        seconds30: '30 sekunder',
        minute1: '1 minut',
        minutes5: '5 minutter',
        // Brugerstatusser
        statusAvailable: "Tilgængelig",
        statusBusy: "Optaget",
        statusAway: "Væk",
        statusBreak: "Pause",
        statusMeal: "Frokost",
        statusMeeting: "Møde",
        statusTraining: "Træning",
        statusOffline: "Offline",
        
        // Kø-relaterede oversættelser
        queues: "Køer",
        queueStatistics: "Kø-statistik",
        usersActive: "Aktive agenter",
        usersAvailable: "Tilgængelige agenter",
        usersOnQueue: "Agenter på kø",
        contactsWaiting: "Kontakter i kø",
        longestWaiting: "Længste ventetid",
        queueFilter: "Filtrer køer",
        selectQueues: "Vælg køer",
        searchQueues: "Søg efter køer",
        showAllQueues: "Vis alle køer",
        minWaitingContacts: "Min. antal ventende",
		apiStatistics: "API Statistik",
		refresh: "Opdater",
		apiCallsTotal: "API Kald i alt",
		apiCallsPerMinute: "API Kald pr. minut",
		uptime: "Oppetid",
		topApiEndpoints: "Top API Endpoints",
		loadingStats: "Indlæser statistik..."

    },
    "en": {
        appTitle: "Genesys Cloud Notification Listener",
        connections: "Connections",
        region: "Region",
        clientId: "Client ID",
        removeBtn: "Remove",
        addNewConnection: "Add New Connection",
        customerName: "Customer Name",
        clientSecret: "Client Secret",
        addBtn: "Add",
        listenToNotifications: "Listen to Notifications",
        activeConnections: "Active Connections",
        noActiveListeners: "No active notification listeners.",
        listeningTo: "Listening to:",
        stopListeningBtn: "Stop Listening",
        startNewListening: "Start New Listening",
        addConnectionFirst: "Add a connection first to start listening.",
        selectConnection: "Select Connection",
        selectCustomer: "Select a customer...",
        selectNotifications: "Select notifications to listen to",
        startListeningBtn: "Start Listening",
        notificationDashboard: "Notification Dashboard",
        startListeningToSee: "Start listening to see notifications here.",
        selectConnectionToView: "Select a connection to view notifications",
        latestNotifications: "Latest Notifications",
        noNotificationsYet: "No notifications received yet",
        allFieldsRequired: "All fields are required",
        selectAtLeastOneTopic: "Select at least one notification",
        connectionNotFound: "Connection not found",
        connectionError: "Error connecting to Genesys Cloud",
        noActiveConnection: "No active connection",
        conversationEvents: "Conversation Events",
        userEvents: "User Events",
        groupEvents: "Group Events",
        queueEvents: "Queue Events",
        emailEvents: "Email Events",
        outboundEvents: "Outbound Events",
        workflowEvents: "Workflow Events",
        presenceEvents: "Presence Events",
        coachingEvents: "Coaching Events",
        authorizeFirst: "Authorize this connection first",
        authorizeBtn: "Authorize",
        qualityEvents: "Quality Evaluations",
        unauthorizedConnection: "Unauthorized connection",
        websocketMethod: 'WebSocket (real-time, recommended)',
        pollingMethod: 'Polling (manual updates)',
        methodLabel: 'Method',
        pollingIntervalLabel: 'Update interval (seconds)',
        seconds10: '10 seconds',
        seconds30: '30 seconds',
        minute1: '1 minute',
        minutes5: '5 minutes',
		apiStatistics: "API Statistics",
		refresh: "Refresh",
		apiCallsTotal: "Total API Calls",
		apiCallsPerMinute: "API Calls per Minute",
		uptime: "Uptime",
		topApiEndpoints: "Top API Endpoints",
		loadingStats: "Loading statistics...",
        // User statuses
        statusAvailable: "Available",
        statusBusy: "Busy",
        statusAway: "Away",
        statusBreak: "Break",
        statusMeal: "Meal",
        statusMeeting: "Meeting",
        statusTraining: "Training",
        statusOffline: "Offline",
        
        // Queue related translations
        queues: "Queues",
        queueStatistics: "Queue Statistics",
        usersActive: "Active Agents",
        usersAvailable: "Available Agents",
        usersOnQueue: "Agents On Queue",
        contactsWaiting: "Contacts Waiting",
        longestWaiting: "Longest Wait Time",
        queueFilter: "Filter Queues",
        selectQueues: "Select Queues",
        searchQueues: "Search Queues",
        showAllQueues: "Show All Queues",
        minWaitingContacts: "Min Waiting Contacts"
    },
    "de": {
        appTitle: "Genesys Cloud Benachrichtigungsempfänger",
        connections: "Verbindungen",
        region: "Region",
        clientId: "Client ID",
        removeBtn: "Entfernen",
        addNewConnection: "Neue Verbindung hinzufügen",
        customerName: "Kundenname",
        clientSecret: "Client Secret",
        addBtn: "Hinzufügen",
        listenToNotifications: "Benachrichtigungen abhören",
        activeConnections: "Aktive Verbindungen",
        noActiveListeners: "Keine aktiven Benachrichtigungsempfänger.",
        listeningTo: "Hört auf:",
        stopListeningBtn: "Abhören beenden",
        startNewListening: "Neues Abhören starten",
        addConnectionFirst: "Fügen Sie zuerst eine Verbindung hinzu, um mit dem Abhören zu beginnen.",
        selectConnection: "Verbindung auswählen",
        selectCustomer: "Wählen Sie einen Kunden...",
        selectNotifications: "Wählen Sie Benachrichtigungen zum Abhören",
        startListeningBtn: "Abhören starten",
        notificationDashboard: "Benachrichtigungsübersicht",
        startListeningToSee: "Starten Sie das Abhören, um Benachrichtigungen hier zu sehen.",
        selectConnectionToView: "Wählen Sie eine Verbindung, um Benachrichtigungen anzuzeigen",
        latestNotifications: "Neueste Benachrichtigungen",
        noNotificationsYet: "Noch keine Benachrichtigungen empfangen",
        allFieldsRequired: "Alle Felder sind erforderlich",
        selectAtLeastOneTopic: "Wählen Sie mindestens eine Benachrichtigung",
        connectionNotFound: "Verbindung nicht gefunden",
        connectionError: "Fehler beim Verbinden mit Genesys Cloud",
        noActiveConnection: "Keine aktive Verbindung",
        conversationEvents: "Konversationsereignisse",
        userEvents: "Benutzerereignisse",
        groupEvents: "Gruppenereignisse",
        queueEvents: "Warteschlangenereignisse",
        emailEvents: "E-Mail-Ereignisse",
        outboundEvents: "Ausgehende Ereignisse",
        workflowEvents: "Workflow-Ereignisse",
        presenceEvents: "Präsenzereignisse",
        coachingEvents: "Coaching-Ereignisse",
        authorizeFirst: "Autorisieren Sie zuerst diese Verbindung",
        authorizeBtn: "Autorisieren",
        qualityEvents: "Qualitätsbewertungen",
        unauthorizedConnection: "Nicht autorisierte Verbindung",
        websocketMethod: 'WebSocket (real-time, recommended)',
        pollingMethod: 'Polling (manual updates)',
        methodLabel: 'Method',
        pollingIntervalLabel: 'Update interval (seconds)',
        seconds10: '10 seconds',
        seconds30: '30 seconds',
        minute1: '1 minute',
        minutes5: '5 minutes',
		apiStatistics: "API-Statistik",
		refresh: "Aktualisieren",
		apiCallsTotal: "API-Aufrufe insgesamt",
		apiCallsPerMinute: "API-Aufrufe pro Minute",
		uptime: "Betriebszeit",
		topApiEndpoints: "Top API-Endpunkte",
		loadingStats: "Statistik wird geladen...",
        // Benutzerstatus
        statusAvailable: "Verfügbar",
        statusBusy: "Beschäftigt",
        statusAway: "Abwesend",
        statusBreak: "Pause",
        statusMeal: "Mahlzeit",
        statusMeeting: "Besprechung",
        statusTraining: "Training",
        statusOffline: "Offline",
        
        // Warteschlangen-bezogene Übersetzungen
        queues: "Warteschlangen",
        queueStatistics: "Warteschlangenstatistiken",
        usersActive: "Aktive Agenten",
        usersAvailable: "Verfügbare Agenten",
        usersOnQueue: "Agenten in Warteschlange",
        contactsWaiting: "Wartende Kontakte",
        longestWaiting: "Längste Wartezeit",
        queueFilter: "Warteschlangen filtern",
        selectQueues: "Warteschlangen auswählen",
        searchQueues: "Warteschlangen suchen",
        showAllQueues: "Alle Warteschlangen anzeigen",
        minWaitingContacts: "Min. wartende Kontakte"
    },
    "fr": {
        appTitle: "Écouteur de Notifications Genesys Cloud",
        connections: "Connexions",
        region: "Région",
        clientId: "ID Client",
        removeBtn: "Supprimer",
        addNewConnection: "Ajouter une nouvelle connexion",
        customerName: "Nom du client",
        clientSecret: "Secret du client",
        addBtn: "Ajouter",
        listenToNotifications: "Écouter les notifications",
        activeConnections: "Connexions actives",
        noActiveListeners: "Aucun écouteur de notifications actif.",
        listeningTo: "À l'écoute de :",
        stopListeningBtn: "Arrêter l'écoute",
        startNewListening: "Démarrer une nouvelle écoute",
        addConnectionFirst: "Ajoutez d'abord une connexion pour commencer l'écoute.",
        selectConnection: "Sélectionner une connexion",
        selectCustomer: "Sélectionnez un client...",
        selectNotifications: "Sélectionnez les notifications à écouter",
        startListeningBtn: "Démarrer l'écoute",
        notificationDashboard: "Tableau de bord des notifications",
        startListeningToSee: "Commencez l'écoute pour voir les notifications ici.",
        selectConnectionToView: "Sélectionnez une connexion pour voir les notifications",
        latestNotifications: "Dernières notifications",
        noNotificationsYet: "Aucune notification reçue pour l'instant",
        allFieldsRequired: "Tous les champs sont requis",
        selectAtLeastOneTopic: "Sélectionnez au moins une notification",
        connectionNotFound: "Connexion non trouvée",
        connectionError: "Erreur de connexion à Genesys Cloud",
        noActiveConnection: "Aucune connexion active",
        conversationEvents: "Événements de conversation",
        userEvents: "Événements utilisateur",
        groupEvents: "Événements de groupe",
        queueEvents: "Événements de file d'attente",
        emailEvents: "Événements d'e-mail",
        outboundEvents: "Événements sortants",
        workflowEvents: "Événements de workflow",
        presenceEvents: "Événements de présence",
        coachingEvents: "Événements de coaching",
        authorizeFirst: "Autorisez d'abord cette connexion",
        authorizeBtn: "Autoriser",
        qualityEvents: "Évaluations de qualité",
        unauthorizedConnection: "Connexion non autorisée",
        websocketMethod: 'WebSocket (real-time, recommended)',
        pollingMethod: 'Polling (manual updates)',
        methodLabel: 'Method',
        pollingIntervalLabel: 'Update interval (seconds)',
        seconds10: '10 seconds',
        seconds30: '30 seconds',
        minute1: '1 minute',
        minutes5: '5 minutes',
        statusAvailable: "Disponible",
        statusBusy: "Occupé",
        statusAway: "Absent",
        statusBreak: "Pause",
        statusMeal: "Repas",
        statusMeeting: "Réunion",
        statusTraining: "Formation",
        statusOffline: "Hors ligne",
        
        // Traductions liées aux files d'attente
        queues: "Files d'attente",
        queueStatistics: "Statistiques des files d'attente",
        usersActive: "Agents actifs",
        usersAvailable: "Agents disponibles",
        usersOnQueue: "Agents sur file d'attente",
        contactsWaiting: "Contacts en attente",
        longestWaiting: "Temps d'attente le plus long",
        queueFilter: "Filtrer les files d'attente",
        selectQueues: "Sélectionner les files d'attente",
        searchQueues: "Rechercher des files d'attente",
        showAllQueues: "Afficher toutes les files d'attente",
        minWaitingContacts: "Min. contacts en attente",
		apiStatistics: "Statistiques API",
		refresh: "Actualiser",
		apiCallsTotal: "Total des appels API",
		apiCallsPerMinute: "Appels API par minute",
		uptime: "Temps de fonctionnement",
		topApiEndpoints: "Principaux points de terminaison API",
		loadingStats: "Chargement des statistiques..."
    }
};

// Tilføj denne funktion
const getAvailableTopics = (lang) => {
    // Use the translations variable from the outer scope
    const t = translations[lang] || translations["en"]; // Fallback to English if language not found
    
    return [
        // Conversations (alle samtaler)
        { id: 'v2.conversations.{id}.customer.end', name: t.conversationEvents, category: 'conversation' },
        { id: 'v2.conversations.{id}.agent.end', name: t.conversationEvents, category: 'conversation' },
        
        // Users (alle brugere)
        { id: 'v2.users.*.presence', name: t.presenceEvents, category: 'presence' },
        { id: 'v2.users.*.routingStatus', name: t.userEvents, category: 'user' },
        
        // Queues (alle køer)
        //{ id: 'v2.routing.queues.*.conversations', name: t.queueEvents, category: 'queue' },
        { id: 'v2.routing.queues.statistics', name: t.queueStatistics || 'Queue Statistics' },
        
        // Groups (alle grupper)
        { id: 'v2.groups.*.members', name: t.groupEvents, category: 'group' },
        
        // Email (alle emails)
        { id: 'v2.routing.email.outbound', name: t.emailEvents, category: 'email' },
        
        // Outbound (alle udgående kampagner)
        { id: 'v2.outbound.campaigns.*', name: t.outboundEvents, category: 'outbound' },
        
        // Workflow (alle workflows)
        { id: 'v2.detail.events.workflow', name: t.workflowEvents, category: 'workflow' },
        
        { id: 'v2.quality.evaluations', name: t.qualityEvents || 'Quality Evaluations', category: 'quality' },
    ];
};

// Opdater eksporten for at inkludere begge
module.exports = {
    translations,
    getAvailableTopics
};