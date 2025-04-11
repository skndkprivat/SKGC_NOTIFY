// notification-filters.js
const NotificationFilters = {
    // Gemmer alle aktive filtre
    activeFilters: {},
    
    // Indeholder filterlogik for hver notifikationstype
    filterHandlers: {},
    
    // Registrerer en ny filterhåndterer for en bestemt notifikationstype
    registerFilterHandler: function(topicPattern, handler) {
        this.filterHandlers[topicPattern] = handler;
    },
    
    // Opdaterer filterkriterierne
    updateFilter: function(filterType, key, value) {
        if (!this.activeFilters[filterType]) {
            this.activeFilters[filterType] = {};
        }
        this.activeFilters[filterType][key] = value;
    },
    
    // Nulstiller alle filtre
    resetFilters: function() {
        this.activeFilters = {
            presence: {
                available: true,
                busy: true,
                away: true,
                break: true,
                meal: true,
                meeting: true,
                training: true,
                OnQueue: true,
                offline: false
            },
            evaluation: {
                minScore: 0,
                maxScore: 100
            },
            queues: {
                nameFilter: "",
                minWaiting: 0,
                selectedQueues: {},
                showAll: true
            },
            general: {
                userSearch: "",
                onlyOnlineUsers: false,
                hideOffline: true
            },
            topics: {}
        };
        
        // Initialiser alle emnetyper til true (vis dem)
        Object.keys(this.filterHandlers).forEach(topic => {
            this.activeFilters.topics[topic] = true;
        });
    },
    
    // Anvender filtre på et sæt notifikationer
    applyFilters: function(notifications) {
        if (!notifications) return [];
        
        return notifications.filter(notification => {
            // Tjek først om notifikationstypen er aktiveret
            let matched = false;
            
            // Find den rigtige filterhåndterer for denne notifikation
            for (const topicPattern in this.filterHandlers) {
                if (notification.topic && notification.topic.includes(topicPattern)) {
                    // Kontrollér om denne topic-type er aktiveret
                    if (this.activeFilters.topics && this.activeFilters.topics[topicPattern] === false) {
                        return false;
                    }
                    
                    // Kald den specifikke filterhåndterer
                    matched = true;
                    return this.filterHandlers[topicPattern](notification, this.activeFilters);
                }
            }
            
            // Hvis ingen håndterer blev fundet, vis som standard
            return !matched || true;
        });
    },
    
    // Initialiserer filtersystemet
    init: function() {
        this.resetFilters();
        
        // Registrer standardfilterhåndterere
        this.registerFilterHandler('presence', this.presenceFilterHandler);
        this.registerFilterHandler('quality.evaluations', this.evaluationFilterHandler);
        this.registerFilterHandler('routing.queues.statistics', this.queueFilterHandler);
    },
    
    // Filterhåndterer for presence-notifikationer
    presenceFilterHandler: function(notification, filters) {
        if (!notification.data || !notification.data.presenceDefinition) return false;
        
        const status = notification.data.presenceDefinition.systemPresence.toLowerCase();
        const userName = notification.data.name || '';
        
        // 1. Tjek status-filtret
        if (!filters.presence[status]) {
            return false;
        }
        
        // 2. Tjek "kun online brugere"-filter
        if (filters.general.onlyOnlineUsers && status === 'offline') {
            return false;
        }
        
        // 3. Tjek bruger-søgefilter
        if (filters.general.userSearch && userName) {
            return userName.toLowerCase().includes(filters.general.userSearch.toLowerCase());
        }
        
        return true;
    },
    
    // Filterhåndterer for evalueringsnotifikationer
    evaluationFilterHandler: function(notification, filters) {
        if (!notification.data) return false;
        
        const score = notification.data.score !== undefined ? notification.data.score * 100 : 0;
        const evaluator = notification.data.evaluator ? notification.data.evaluator.name : '';
        
        // 1. Tjek score-interval
        if (filters.evaluation.minScore !== undefined && 
            score < filters.evaluation.minScore) {
            return false;
        }
        
        // 2. Tjek evaluator-filter hvis det findes
        if (filters.evaluation.evaluator && evaluator) {
            return evaluator.toLowerCase().includes(filters.evaluation.evaluator.toLowerCase());
        }
        
        return true;
    },
    
    // Filterhåndterer for kø-statistik notifikationer
    queueFilterHandler: function(notification, filters) {
        if (!notification.data) return false;
        
        const queueName = notification.data.name || '';
        const contactsWaiting = notification.data.statistics ? notification.data.statistics.contactsWaiting || 0 : 0;
        
        // Filtrer efter kønavn
        if (filters.queues && filters.queues.nameFilter && queueName) {
            if (!queueName.toLowerCase().includes(filters.queues.nameFilter.toLowerCase())) {
                return false;
            }
        }
        
        // Filtrer efter valgte køer
        if (filters.queues && filters.queues.selectedQueues && 
            Object.keys(filters.queues.selectedQueues).length > 0 && 
            !filters.queues.showAll) {
            if (!filters.queues.selectedQueues[notification.data.id]) {
                return false;
            }
        }
        
        // Filtrer efter antal ventende kontakter
        if (filters.queues && filters.queues.minWaiting !== undefined && 
            contactsWaiting < filters.queues.minWaiting) {
            return false;
        }
        
        return true;
    }
};

// Initialiser filtersystemet
NotificationFilters.init();