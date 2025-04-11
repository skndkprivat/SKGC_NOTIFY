// Filter Setup og Event Listeners

// Funktion til at opsætte filter-event listeners
function setupFilterEventListeners() {
    // 1. Statusfiltre
    document.querySelectorAll('.filter-status').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (typeof NotificationFilters !== 'undefined') {
                const status = this.getAttribute('data-status');
                NotificationFilters.updateFilter('presence', status, this.checked);
                updateFilteredDisplay();
            }
        });
    });
    
    // 2. Topic-filtre
    document.querySelectorAll('.filter-topic').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (typeof NotificationFilters !== 'undefined') {
                const topic = this.getAttribute('data-topic');
                NotificationFilters.updateFilter('topics', topic, this.checked);
                updateFilteredDisplay();
            }
        });
    });
    
    // 3. "Vis kun online brugere" toggle
    const onlineUsersCheckbox = document.getElementById('show-only-online-users');
    if (onlineUsersCheckbox) {
        onlineUsersCheckbox.addEventListener('change', function() {
            if (typeof NotificationFilters !== 'undefined') {
                NotificationFilters.updateFilter('general', 'onlyOnlineUsers', this.checked);
                
                // Opdater UI baseret på dette valg
                if (this.checked) {
                    const offlineCheckbox = document.getElementById('filter-presence-offline');
                    if (offlineCheckbox) {
                        offlineCheckbox.checked = false;
                        NotificationFilters.updateFilter('presence', 'offline', false);
                    }
                }
                
                updateFilteredDisplay();
            }
        });
    }
    
    // 4. Brugersøgning
    const userSearchInput = document.getElementById('filter-user-search');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', function() {
            if (typeof NotificationFilters !== 'undefined') {
                NotificationFilters.updateFilter('general', 'userSearch', this.value);
                
                // Forsinkelse for bedre ydelse
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(updateFilteredDisplay, 300);
            }
        });
    }
    
    // 5. Evalueringsscore-slider
    const scoreRangeInput = document.getElementById('filter-score-range');
    if (scoreRangeInput) {
        scoreRangeInput.addEventListener('input', function() {
            if (typeof NotificationFilters !== 'undefined') {
                const value = parseInt(this.value);
                const minScoreLabel = document.getElementById('min-score-label');
                if (minScoreLabel) {
                    minScoreLabel.textContent = `${value}%`;
                }
                NotificationFilters.updateFilter('evaluation', 'minScore', value);
                updateFilteredDisplay();
            }
        });
    }
    
    // 6. Evaluator-søgning
    const evaluatorSearchInput = document.getElementById('filter-evaluator-search');
    if (evaluatorSearchInput) {
        evaluatorSearchInput.addEventListener('input', function() {
            if (typeof NotificationFilters !== 'undefined') {
                NotificationFilters.updateFilter('evaluation', 'evaluator', this.value);
                
                // Forsinkelse for bedre ydelse
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(updateFilteredDisplay, 300);
            }
        });
    }
    
    // 7. Min ventende kontakter range
    const minWaitingInput = document.getElementById('filter-min-waiting');
    if (minWaitingInput) {
        minWaitingInput.addEventListener('input', function() {
            if (typeof NotificationFilters !== 'undefined') {
                const value = parseInt(this.value);
                const minWaitingValue = document.getElementById('min-waiting-value');
                if (minWaitingValue) {
                    minWaitingValue.textContent = value;
                }
                NotificationFilters.updateFilter('queues', 'minWaiting', value);
                updateFilteredDisplay();
            }
        });
    }
    
    // 8. Kø søgning
    const queueSearchInput = document.getElementById('filter-queue-search');
    if (queueSearchInput) {
        queueSearchInput.addEventListener('input', function() {
            if (typeof NotificationFilters !== 'undefined') {
                NotificationFilters.updateFilter('queues', 'nameFilter', this.value);
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(updateFilteredDisplay, 300);
            }
        });
    }
    
    // 9. Vis alle køer toggle
    const showAllQueuesCheckbox = document.getElementById('show-all-queues');
    if (showAllQueuesCheckbox) {
        showAllQueuesCheckbox.addEventListener('change', function() {
            if (typeof NotificationFilters !== 'undefined') {
                NotificationFilters.updateFilter('queues', 'showAll', this.checked);
                
                // Hvis vi skifter til "vis alle", nulstil de valgte køer
                if (this.checked) {
                    NotificationFilters.updateFilter('queues', 'selectedQueues', {});
                    
                    // Opdater UI
                    document.querySelectorAll('.queue-checkbox').forEach(checkbox => {
                        checkbox.checked = false;
                    });
                }
                
                updateFilteredDisplay();
            }
        });
    }
    
    // 10. Reset filtre knap
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (typeof NotificationFilters !== 'undefined') {
                // Reset UI
                document.querySelectorAll('.filter-status, .filter-topic').forEach(checkbox => {
                    checkbox.checked = true;
                });
                
                const offlineCheckbox = document.getElementById('filter-presence-offline');
                if (offlineCheckbox) {
                    offlineCheckbox.checked = false;
                }
                
                const onlineCheckbox = document.getElementById('show-only-online-users');
                if (onlineCheckbox) {
                    onlineCheckbox.checked = false;
                }
                
                const userSearch = document.getElementById('filter-user-search');
                if (userSearch) {
                    userSearch.value = '';
                }
                
                const evaluatorSearch = document.getElementById('filter-evaluator-search');
                if (evaluatorSearch) {
                    evaluatorSearch.value = '';
                }
                
                const scoreRange = document.getElementById('filter-score-range');
                if (scoreRange) {
                    scoreRange.value = 0;
                }
                
                const minScoreLabel = document.getElementById('min-score-label');
                if (minScoreLabel) {
                    minScoreLabel.textContent = '0%';
                }
                
                const minWaitingInput = document.getElementById('filter-min-waiting');
                if (minWaitingInput) {
                    minWaitingInput.value = 0;
                }
                
                const minWaitingValue = document.getElementById('min-waiting-value');
                if (minWaitingValue) {
                    minWaitingValue.textContent = '0';
                }
                
                const showAllQueues = document.getElementById('show-all-queues');
                if (showAllQueues) {
                    showAllQueues.checked = true;
                }
                
                const queueSearch = document.getElementById('filter-queue-search');
                if (queueSearch) {
                    queueSearch.value = '';
                }
                
                // Reset filter-objektet
                NotificationFilters.resetFilters();
                
                // Opdater visningen
                updateFilteredDisplay();
            }
        });
    }
}