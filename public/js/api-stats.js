// API Statistik funktioner
let statsInterval;

// Funktion til at formatere tid
function formatUptime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
}

// Funktion til at hente og vise statistikker
function fetchAndDisplayStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(stats => {
            // Opdater tællerne
            document.getElementById('api-call-counter').textContent = stats.apiCalls.toLocaleString();
            document.getElementById('uptime-counter').textContent = formatUptime(stats.uptime);
            
            // Beregn og vis API-kald pr. minut
            const ratePerMin = (stats.apiCalls / (stats.uptime / 60)).toFixed(1);
            document.getElementById('api-rate-counter').textContent = `${ratePerMin}/min`;
            
            // Opret data til endpointdiagram
            const endpoints = Object.entries(stats.apiCallsByEndpoint).sort((a, b) => b[1] - a[1]);
            
            // Vis op til top 5 endpoints
            const topEndpoints = endpoints.slice(0, 5);
            const chartData = topEndpoints.map(([endpoint, count]) => ({ endpoint, count }));
            
            // Simpel visning af endpointfordeling
            const chartContainer = document.getElementById('api-endpoints-chart');
            
            if (chartData.length > 0) {
                let chartHtml = '<div class="table-responsive"><table class="table table-sm">';
                chartHtml += '<thead><tr><th>Endpoint</th><th>Antal</th><th>%</th></tr></thead><tbody>';
                
                chartData.forEach(item => {
                    const percent = ((item.count / stats.apiCalls) * 100).toFixed(1);
                    chartHtml += `
                        <tr>
                            <td>${item.endpoint}</td>
                            <td>${item.count}</td>
                            <td>
                                <div class="progress" style="height: 15px;">
                                    <div class="progress-bar" role="progressbar" style="width: ${percent}%;" 
                                         aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
                                        ${percent}%
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                
                chartHtml += '</tbody></table></div>';
                chartContainer.innerHTML = chartHtml;
            } else {
                chartContainer.innerHTML = '<p class="text-center text-muted py-4">Ingen API-kald registreret endnu</p>';
            }
        })
        .catch(error => {
            console.error('Fejl ved hentning af statistikker:', error);
            const chartContainer = document.getElementById('api-endpoints-chart');
            if (chartContainer) {
                chartContainer.innerHTML = `<p class="text-center text-danger">Fejl ved hentning af statistikker: ${error.message}</p>`;
            }
        });
}

// Start timer for at opdatere statistikker
function startStatsTracking() {
    // Hent med det samme
    fetchAndDisplayStats();
    
    // Opdater hvert 10. sekund
    statsInterval = setInterval(fetchAndDisplayStats, 10000);
}

// Stop timer for at undgå hukommelseslækage
function stopStatsTracking() {
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }
}

// Setup for statistik-modulet
function setupStatsTracking() {
    // Event listener for opdateringsknap
    const refreshButton = document.getElementById('refresh-stats');
    if (refreshButton) {
        refreshButton.addEventListener('click', fetchAndDisplayStats);
    }
}