// Hovedapplikationslogik
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fuldt indlæst');
    console.log('connectionSelector findes:', !!document.getElementById('connectionSelector'));
    console.log('notificationsList findes:', !!document.getElementById('notificationsList'));
    
    const connectionSelector = document.getElementById('connectionSelector');
    const notificationsList = document.getElementById('notificationsList');
    let pollingInterval;
    let statsInterval;
    
    // Tilføj event listeners til toggle-knapperne
    const toggleButtons = document.querySelectorAll('.toggle-section');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            const content = document.getElementById(`${section}-content`);
            const icon = this.querySelector('i');
            
            console.log('Toggle klikket for sektion:', section);
            
            if (content) {
                // Tjek computed style i stedet for inline style
                const currentDisplay = window.getComputedStyle(content).display;
                
                if (currentDisplay === 'none') {
                    content.style.display = 'block';
                    if (icon) {
                        icon.classList.remove('bi-chevron-down');
                        icon.classList.add('bi-chevron-up');
                    }
                    console.log('Viser indhold');
                } else {
                    content.style.display = 'none';
                    if (icon) {
                        icon.classList.remove('bi-chevron-up');
                        icon.classList.add('bi-chevron-down');
                    }
                    console.log('Skjuler indhold');
                }
            }
        });
    });
    
    // Toggle polling interval section baseret på valgt metode
    const methodRadios = document.querySelectorAll('input[name="method"]');
    const pollingIntervalSection = document.getElementById('polling-interval-section');
    
    if (methodRadios && pollingIntervalSection) {
        methodRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'polling' && this.checked) {
                    pollingIntervalSection.style.display = 'block';
                } else {
                    pollingIntervalSection.style.display = 'none';
                }
            });
        });
    }
    
    // Auto-select forbindelse hvis der kun er en
    function checkAndAutoSelect() {
        if (connectionSelector && connectionSelector.options.length === 2) {
            connectionSelector.selectedIndex = 1;
            const event = new Event('change');
            connectionSelector.dispatchEvent(event);
        }
    }
    
    // Kald auto-select efter en kort forsinkelse
    setTimeout(checkAndAutoSelect, 500);
    
    // Event listener for ændring af forbindelse
    if (connectionSelector) {
        connectionSelector.addEventListener('change', function() {
            const connectionId = this.value;
            
            if (connectionId) {
                console.log('Forbindelse valgt:', connectionId);
                
                // Find indholdselementerne
                const connectionsContent = document.getElementById('connections-content');
                const notificationsContent = document.getElementById('notifications-content');
                
                // Log for debugging
                console.log('Connections content fundet:', !!connectionsContent);
                console.log('Notifications content fundet:', !!notificationsContent);
                
                // Skjul sektioner
                if (connectionsContent) connectionsContent.style.display = 'none';
                if (notificationsContent) notificationsContent.style.display = 'none';
                
                // Opdater ikonerne
                const icons = document.querySelectorAll('.toggle-section i');
                icons.forEach(icon => {
                    icon.classList.remove('bi-chevron-up');
                    icon.classList.add('bi-chevron-down');
                });
                
                // Scroll til dashboard
                const dashboardSection = document.getElementById('dashboard-section');
                if (dashboardSection) {
                    dashboardSection.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
                
                // Vis filter-sektion og stats
                const filterSection = document.getElementById('notification-filters');
                if (filterSection) {
                    filterSection.style.display = 'block';
                }
                
                // Start tracking statistics
                startStatsTracking();
                
                // Hent notifikationer og start polling
                fetchNotifications(connectionId);
                startPolling(connectionId);
            } else {
                console.log('Ingen forbindelse valgt');
                
                // Skjul filter-sektion
                const filterSection = document.getElementById('notification-filters');
                if (filterSection) {
                    filterSection.style.display = 'none';
                }
                
                // Stop stats tracking
                stopStatsTracking();
                
                if (notificationsList) {
                    notificationsList.innerHTML = '<p class="text-center">Vælg en forbindelse for at se notifikationer</p>';
                }
            }
        });
    }
    
    function startPolling(connectionId) {
        console.log('Starter polling for ID:', connectionId);
        // Stop tidligere interval hvis det findes
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        // Hent én gang med det samme
        fetchNotifications(connectionId);
        
        // Start nyt interval
        pollingInterval = setInterval(() => {
            console.log('Polling: Henter opdaterede notifikationer');
            fetchNotifications(connectionId);
        }, 10000); // Opdater hver 10. sekund
    }
/* 
	// Add this code to your main.js or another JavaScript file that runs on page load
	document.addEventListener('DOMContentLoaded', function() {
		console.log('Checking for API stats elements...');
		
		// Check if the stats section exists
		const statsSection = document.getElementById('stats-section');
		if (statsSection) {
			console.log('Stats section found, setting up tracking');
			
			// If setupStatsTracking function exists, call it
			if (typeof setupStatsTracking === 'function') {
				setupStatsTracking();
				console.log('Stats tracking setup complete');
			} else {
				console.error('setupStatsTracking function not found');
			}
			
			// Check if a connection is already selected
			const connectionSelector = document.getElementById('connectionSelector');
			if (connectionSelector && connectionSelector.value) {
				console.log('Connection already selected, starting stats tracking');
				
				// If startStatsTracking function exists, call it
				if (typeof startStatsTracking === 'function') {
					startStatsTracking();
					console.log('Stats tracking started');
				} else {
					console.error('startStatsTracking function not found');
				}
			}
		} else {
			console.warn('Stats section not found in the DOM');
		}
		
		// Add event listener to connection selector to start stats tracking when changed
		const connectionSelector = document.getElementById('connectionSelector');
		if (connectionSelector) {
			connectionSelector.addEventListener('change', function() {
				console.log('Connection changed to:', this.value);
				
				if (this.value) {
					// Start tracking stats if a connection is selected
					if (typeof startStatsTracking === 'function') {
						startStatsTracking();
						console.log('Stats tracking started on connection change');
					}
				} else {
					// Stop tracking if no connection is selected
					if (typeof stopStatsTracking === 'function') {
						stopStatsTracking();
						console.log('Stats tracking stopped on connection change');
					}
				}
			});
		}
	});
 */    
    // Skjul filtre ved start
    const filterSection = document.getElementById('notification-filters');
    if (filterSection) {
        filterSection.style.display = 'none';
    }
    
    // Initialiser filtre og stats
    if (typeof setupFilterEventListeners === 'function') {
        setupFilterEventListeners();
    }
    
    if (typeof setupStatsTracking === 'function') {
        setupStatsTracking();
    }
    
    // Eksporter globale funktioner
    window.startPolling = startPolling;
    window.fetchNotifications = fetchNotifications;
    window.displayNotifications = displayNotifications;
    window.updateFilteredDisplay = updateFilteredDisplay;
    window.startStatsTracking = startStatsTracking;
    window.stopStatsTracking = stopStatsTracking;
});