// Chart instances
let hourlyChart;
let endpointChart;

// Fetch and update overview stats
async function updateOverview() {
  try {
    const response = await fetch('/analytics/overview');
    const data = await response.json();

    document.getElementById('totalRequests').textContent = data.total_requests || '0';
    document.getElementById('successRate').textContent = data.success_rate ? `${data.success_rate}%` : '-';
    document.getElementById('avgResponseTime').textContent = data.avg_response_time ? `${data.avg_response_time}ms` : '-';
    document.getElementById('mostHitEndpoint').textContent = data.most_hit_endpoint || '-';
  } catch (error) {
    console.error('Error fetching overview:', error);
  }
}

// Fetch and update hourly chart
async function updateHourlyChart() {
  try {
    const response = await fetch('/analytics/hourly?hours=24');
    const data = await response.json();

    // Prepare data for Chart.js
    const labels = data.map(item => {
      const date = new Date(item.hour);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }).reverse();

    const successful = data.map(item => parseInt(item.successful_requests)).reverse();
    const failed = data.map(item => parseInt(item.failed_requests)).reverse();

    const ctx = document.getElementById('hourlyChart').getContext('2d');

    if (hourlyChart) {
      hourlyChart.destroy();
    }

    hourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Successful',
            data: successful,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Failed/Rate Limited',
            data: failed,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching hourly data:', error);
  }
}

// Fetch and update endpoint chart
async function updateEndpointChart() {
  try {
    const response = await fetch('/analytics/endpoints');
    const data = await response.json();

    const labels = data.map(item => item.endpoint);
    const requests = data.map(item => parseInt(item.total_requests));

    const ctx = document.getElementById('endpointChart').getContext('2d');

    if (endpointChart) {
      endpointChart.destroy();
    }

    endpointChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Requests',
          data: requests,
          backgroundColor: [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#4facfe',
            '#43e97b'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching endpoint data:', error);
  }
}

// Fetch and update top consumers table
async function updateTopConsumers() {
  try {
    const response = await fetch('/analytics/top-consumers?limit=10');
    const data = await response.json();

    const tbody = document.getElementById('consumersBody');
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">No data available</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(item => `
      <tr>
        <td>${item.user_id}</td>
        <td><span class="badge badge-${item.tier}">${item.tier}</span></td>
        <td>${item.total_requests}</td>
        <td>${item.rate_limited_requests || 0}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error fetching top consumers:', error);
  }
}

// Fetch and update endpoints table
async function updateEndpointsTable() {
  try {
    const response = await fetch('/analytics/endpoints');
    const data = await response.json();

    const tbody = document.getElementById('endpointsBody');
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">No data available</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(item => {
      const successRate = ((parseInt(item.successful_requests) / parseInt(item.total_requests)) * 100).toFixed(1);
      return `
        <tr>
          <td>${item.endpoint}</td>
          <td>${item.total_requests}</td>
          <td>${successRate}%</td>
          <td>${item.avg_response_time}ms</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error fetching endpoints:', error);
  }
}

// Update last updated timestamp
function updateTimestamp() {
  document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
}

// Refresh all data
async function refreshDashboard() {
  await Promise.all([
    updateOverview(),
    updateHourlyChart(),
    updateEndpointChart(),
    updateTopConsumers(),
    updateEndpointsTable()
  ]);
  updateTimestamp();
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  refreshDashboard();
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);
  
  // Auto-refresh every 30 seconds
  setInterval(refreshDashboard, 30000);
});