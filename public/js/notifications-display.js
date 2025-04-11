// Funktioner til visning og hentning af notifikationer

// Opdateret fetchNotifications funktion
function fetchNotifications(connectionId) {
    console.log('Henter notifikationer for ID:', connectionId);
    
    // Tjek om connectionId er gyldig
    if (!connectionId) {
        console.error('Manglende connectionId');
        if (notificationsList) {
            notificationsList.innerHTML = '<p class="text-danger">Vælg venligst en forbindelse</p>';
        }
        return;
    }
    
    // Tjek om notificationsList findes
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) {
        console.error('notificationsList element ikke fundet!');
        return;
    }
    
    // Vis loading indikator
    notificationsList.innerHTML = '<p class="text-center"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Henter...</span></div> Henter notifikationer...</p>';
    
    // Tilføj en timestamp for at forhindre caching
    const timestamp = new Date().getTime();
    fetch(`/api/notifications/${connectionId}?t=${timestamp}`)
        .then(response => {
            console.log('API respons status:', response.status);
            if (!response.ok) {
                throw new Error(`Netværk respons ikke OK: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Modtagne notifikationer fra API:', data ? data.length : 0, 'notifikationer');
            if (data && data.length > 0) {
                console.log('Første notifikation:', JSON.stringify(data[0]).substring(0, 100) + '...');
            }
            
            // Sikre at data ikke er undefined eller null
            window.allNotifications = data || [];
            
            try {
                // Opdater køfiltre baseret på køer fundet i data
                if (typeof updateQueueFiltersList === 'function') {
                    updateQueueFiltersList(window.allNotifications);
                }
                
                if (typeof NotificationFilters !== 'undefined') {
                    const filteredData = NotificationFilters.applyFilters(window.allNotifications);
                    displayNotifications(filteredData);
                } else {
                    console.warn('NotificationFilters not defined, showing unfiltered data');
                    displayNotifications(window.allNotifications);
                }
            } catch (error) {
                console.error('Error applying filters:', error);
                displayNotifications(window.allNotifications);
            }
        })
        .catch(error => {
            console.error('Fejl ved hentning af notifikationer:', error);
            if (notificationsList) {
                notificationsList.innerHTML = `<p class="text-danger">Fejl ved hentning af notifikationer: ${error.message}</p>`;
            }
        });
}

// Opdateret displayNotifications funktion
function displayNotifications(notifications) {
    console.log('displayNotifications kaldt med', notifications ? notifications.length : 0, 'notifikationer');
    
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) {
        console.error('notificationsList element ikke fundet!');
        return;
    }
    
    if (!notifications || notifications.length === 0) {
        notificationsList.innerHTML = '<p class="text-center">Ingen notifikationer matcher dine filtreringskriterier</p>';
        return;
    }
    
    // Tilføj antal-information øverst
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>Seneste statusopdateringer</h4>
            <span class="badge bg-primary">Viser ${notifications.length} af ${window.allNotifications ? window.allNotifications.length : notifications.length}</span>
        </div>
    `;
    
    notifications.forEach((notification, index) => {
        console.log(`Behandler notifikation ${index + 1}/${notifications.length}`);
        
        try {
            // Sikr at timestamp eksisterer
            const timestamp = notification.timestamp ? new Date(notification.timestamp) : new Date();
            const time = timestamp.toLocaleString();
            const topic = notification.topic || 'unknown-topic';
            
            console.log(`Notifikation ${index + 1}: Topic=${topic}, Timestamp=${time}`);
            
            // Hvis det er en presence-notifikation
            if (topic.includes('presence') && notification.data && notification.data.presenceDefinition) {
                const status = notification.data.presenceDefinition.systemPresence.toLowerCase();
                const name = notification.data.name || 'Ukendt bruger';
                const message = notification.data.presenceDefinition.presenceMessage || '';
                
                console.log(`Presence: ${name}, Status: ${status}`);
                
                // Map status til klasse
                let statusClass = 'status-offline';
                if (status.includes('available')) statusClass = 'status-available';
                else if (status.includes('away') || status.includes('break') || status.includes('meal')) statusClass = 'status-away';
                else if (status.includes('busy') || status.includes('meeting') || status.includes('training')) statusClass = 'status-busy';
                
                html += `
                    <div class="alert alert-light mb-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="status-indicator ${statusClass}"></span>
                                <strong>${name}</strong> - ${status.toUpperCase()}
                                ${message ? `<small class="text-muted">(${message})</small>` : ''}
                            </div>
                            <small class="text-muted">${time}</small>
                        </div>
                    </div>
                `;
            } 
            // Hvis det er en kvalitetsvurdering
            else if (topic.includes('quality.evaluations') && notification.data) {
                const data = notification.data;
                const evaluationName = data.evaluationForm ? data.evaluationForm.name : 'Evaluering';
                const score = data.score !== undefined ? `${(data.score * 100).toFixed(1)}%` : 'N/A';
                const evaluator = data.evaluator ? data.evaluator.name : 'Ukendt';
                
                console.log(`Evaluering: ${evaluationName}, Score: ${score}`);
                
                html += `
                    <div class="alert alert-info mb-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${evaluationName}</strong> - Score: ${score}<br>
                                <small>Evalueret af: ${evaluator}</small>
                            </div>
                            <small class="text-muted">${time}</small>
                        </div>
                    </div>
                `;
            }
            // Kø-notifikation
            else if (topic.includes('routing.queues') && notification.data) {
                const queueName = notification.data.name || 'Unnamed Queue';
                const stats = notification.data.statistics || {};
                
                const waitingContacts = stats.contactsWaiting || 0;
                const agentsActive = stats.usersActive || 0;
                const agentsAvailable = stats.usersAvailable || 0;
                
                // Format ventetid fra millisekunder til minutter:sekunder
                const longestWaitMs = stats.longestWaitingMs || 0;
                const minutes = Math.floor(longestWaitMs / 60000);
                const seconds = Math.floor((longestWaitMs % 60000) / 1000);
                const waitTimeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                html += `
                    <div class="alert ${waitingContacts > 0 ? 'alert-warning' : 'alert-success'} mb-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${queueName}</strong>
                                <span class="badge ${waitingContacts > 0 ? 'bg-warning text-dark' : 'bg-success'} ms-2">${waitingContacts} ventende</span>
                            </div>
                            <small class="text-muted">${time}</small>
                        </div>
                        <div class="mt-2 small">
                            <span class="me-3">Aktive agenter: ${agentsActive}</span>
                            <span class="me-3">Tilgængelige: ${agentsAvailable}</span>
                            <span>Længste ventetid: ${waitTimeFormatted}</span>
                        </div>
                    </div>
                `;
            }
            else {
                // Standard notifikation visning for andre typer
                console.log(`Andet: Topic=${topic}`);
                
                let dataDisplay = '';
                try {
                    dataDisplay = JSON.stringify(notification.data, null, 2);
                } catch(e) {
                    dataDisplay = "Kunne ikke vise data: " + e.message;
                }
                
                html += `
                    <div class="alert alert-secondary mb-3">
                        <p><strong>Tidspunkt:</strong> ${time}</p>
                        <p><strong>Emne:</strong> ${topic}</p>
                        <pre>${dataDisplay}</pre>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Fejl ved behandling af notifikation:', error, notification);
            html += `
                <div class="alert alert-danger mb-2">
                    <p>Fejl ved visning af notifikation: ${error.message}</p>
                    <pre>${JSON.stringify(notification, null, 2)}</pre>
                </div>
            `;
        }
    });
    
    console.log('Opdaterer DOM med nye notifikationer, HTML længde:', html.length);
    notificationsList.innerHTML = html;
    
    // Tilføj en kort animation på dashboardet for at indikere opdatering
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.classList.add('bg-fade');
        setTimeout(() => {
            dashboardSection.classList.remove('bg-fade');
        }, 500);
    } else {
        console.error('dashboard-section element ikke fundet!');
    }
}

// Funktion til at opdatere visningen baseret på filtre
function updateFilteredDisplay() {
    if (window.allNotifications) {
        try {
            const filteredData = NotificationFilters.applyFilters(window.allNotifications);
            displayNotifications(filteredData);
        } catch (error) {
            console.error('Fejl ved filtrering af notifikationer:', error);
            displayNotifications(window.allNotifications);
        }
    }
}

// Funktion til at opdatere køer i filtreringssektion
function updateQueueFiltersList(notifications) {
    const queuesList = document.getElementById('queues-list');
    if (!queuesList) return;
    
    // Find unikke køer fra notifikationerne
    const queues = {};
    
    // Sikre at notifications er et array
    if (Array.isArray(notifications)) {
        notifications.forEach(notification => {
            if (notification && notification.topic && notification.topic.includes('routing.queues') && notification.data && notification.data.id) {
                queues[notification.data.id] = notification.data.name || 'Unnamed Queue';
            }
        });
    }
    
    // Hvis der ikke er nogen køer fundet
    if (Object.keys(queues).length === 0) {
        queuesList.innerHTML = `<p class="text-muted">Ingen køer fundet</p>`;
        return;
    }
    
    // Opret checkboxes for hver kø
    let html = '';
    Object.entries(queues).sort((a, b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
        html += `
            <div class="form-check">
                <input class="form-check-input queue-checkbox" type="checkbox" id="queue-${id}" data-queue-id="${id}">
                <label class="form-check-label" for="queue-${id}">
                    ${name}
                </label>
            </div>
        `;
    });
    
    queuesList.innerHTML = html;
    
    // Tilføj event listeners til de nye checkboxes
    document.querySelectorAll('.queue-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const queueId = this.getAttribute('data-queue-id');
            const selectedQueues = NotificationFilters.activeFilters.queues.selectedQueues || {};
            
            // Opdater valgte køer
            selectedQueues[queueId] = this.checked;
            NotificationFilters.updateFilter('queues', 'selectedQueues', selectedQueues);
            
            // Deaktiver "Vis alle" hvis nogen kø er valgt
            const hasSelectedQueues = Object.values(selectedQueues).some(selected => selected);
            document.getElementById('show-all-queues').checked = !hasSelectedQueues;
            NotificationFilters.updateFilter('queues', 'showAll', !hasSelectedQueues);
            
            updateFilteredDisplay();
        });
    });
}