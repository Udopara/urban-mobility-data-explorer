// Chart.js based visualization for Urban Mobility Data Explorer

class DataVisualizer {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: 'rgb(79, 140, 255)',
            primaryTransparent: 'rgba(79, 140, 255, 0.1)',
            accent: 'rgb(34, 211, 238)',
            accentTransparent: 'rgba(34, 211, 238, 0.1)',
            success: 'rgb(34, 197, 94)',
            successTransparent: 'rgba(34, 197, 94, 0.1)',
            warning: 'rgb(245, 158, 11)',
            warningTransparent: 'rgba(245, 158, 11, 0.1)',
            danger: 'rgb(239, 68, 68)',
            dangerTransparent: 'rgba(239, 68, 68, 0.1)',
            text: 'rgb(233, 238, 247)',
            muted: 'rgb(154, 164, 178)',
            grid: 'rgba(154, 164, 178, 0.1)'
        };
    }

    async initializeCharts() {
        await this.loadTripVolumeData();
        await this.loadVendorPerformanceData();
    }

    async loadTripVolumeData() {
        try {
            if (typeof app === 'undefined') {
                console.log('App not available yet, skipping trip volume data load');
                return;
            }
            
            // Use filter parameters if available
            const params = new URLSearchParams();
            if (app.filters && app.filters.startDate) params.append('start_date', app.filters.startDate);
            if (app.filters && app.filters.endDate) params.append('end_date', app.filters.endDate);
            
            const queryString = params.toString() ? `?limit=1000&${params.toString()}` : '?limit=1000';
            
            const trips = await app.apiCall(`/trips${queryString}`);
            if (trips && trips.length > 0) {
                const hourlyData = this.aggregateTripsByHour(trips);
                this.renderTripVolumeChart(hourlyData);
            }
        } catch (error) {
            console.error('Failed to load trip volume data:', error);
        }
    }

    async loadVendorPerformanceData() {
        try {
            if (typeof app === 'undefined') {
                console.log('App not available yet, skipping vendor performance data load');
                return;
            }
            
            // Use filter parameters if available
            const params = new URLSearchParams();
            params.append('limit', '8');
            if (app.filters && app.filters.startDate) params.append('start_date', app.filters.startDate);
            if (app.filters && app.filters.endDate) params.append('end_date', app.filters.endDate);
            
            const vendors = await app.apiCall(`/insights/top-vendors?${params.toString()}`);
            if (vendors && vendors.length > 0) {
                // Map vendor IDs to names
                const vendorsWithNames = vendors.map(v => ({
                    ...v,
                    vendor_name: app.getVendorName(v.vendor_id)
                }));
                this.renderVendorPerformanceChart(vendorsWithNames);
            }
        } catch (error) {
            console.error('Failed to load vendor performance data:', error);
        }
    }

    aggregateTripsByHour(trips) {
        const hourlyCounts = new Map();
        
        trips.forEach(trip => {
            if (trip.pickup_datetime) {
                const date = new Date(trip.pickup_datetime);
                const hour = date.getHours();
                hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
            }
        });

        // Create array with all 24 hours
        const data = [];
        for (let hour = 0; hour < 24; hour++) {
            data.push({
                hour: hour,
                label: `${hour.toString().padStart(2, '0')}:00`,
                count: hourlyCounts.get(hour) || 0
            });
        }
        
        return data;
    }

    renderTripVolumeChart(data) {
        const ctx = document.getElementById('trip-volume-chart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.tripVolume) {
            this.charts.tripVolume.destroy();
        }

        const labels = data.map(d => d.label);
        const values = data.map(d => d.count);

        this.charts.tripVolume = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Trips',
                    data: values,
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.primaryTransparent,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: this.colors.primary,
                    pointHoverBorderColor: this.colors.text,
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(18, 21, 28, 0.95)',
                        titleColor: this.colors.text,
                        bodyColor: this.colors.text,
                        borderColor: this.colors.primary,
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (context) => `${context[0].label}`,
                            label: (context) => `${context.parsed.y} trips`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: this.colors.grid,
                            drawBorder: false
                        },
                        ticks: {
                            color: this.colors.muted,
                            font: {
                                size: 11
                            },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: this.colors.grid,
                            drawBorder: false
                        },
                        ticks: {
                            color: this.colors.muted,
                            font: {
                                size: 11
                            },
                            callback: (value) => {
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    renderVendorPerformanceChart(vendors) {
        const ctx = document.getElementById('vendor-performance-chart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.vendorPerformance) {
            this.charts.vendorPerformance.destroy();
        }

        const labels = vendors.map(v => v.vendor_name || v.vendor_id || 'Unknown');
        const tripCounts = vendors.map(v => v.trip_count || 0);
        const revenues = vendors.map(v => v.total_revenue || 0);

        // Create gradient colors for bars
        const barColors = vendors.map((_, index) => {
            const colors = [
                this.colors.primary,
                this.colors.accent,
                this.colors.success,
                this.colors.warning,
                this.colors.danger,
                this.colors.primary,
                this.colors.accent,
                this.colors.success
            ];
            return colors[index % colors.length];
        });

        this.charts.vendorPerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Trip Count',
                    data: tripCounts,
                    backgroundColor: barColors.map(c => c.replace('rgb', 'rgba').replace(')', ', 0.8)')),
                    borderColor: barColors,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(18, 21, 28, 0.95)',
                        titleColor: this.colors.text,
                        bodyColor: this.colors.text,
                        borderColor: this.colors.primary,
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            title: (context) => `Vendor ${context[0].label}`,
                            label: (context) => {
                                const index = context.dataIndex;
                                const trips = tripCounts[index].toLocaleString();
                                const revenue = revenues[index].toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                });
                                return [
                                    `Trips: ${trips}`,
                                    `Revenue: ${revenue}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: this.colors.muted,
                            font: {
                                size: 11,
                                weight: 600
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: this.colors.grid,
                            drawBorder: false
                        },
                        ticks: {
                            color: this.colors.muted,
                            font: {
                                size: 11
                            },
                            callback: (value) => {
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        this.loadTripVolumeData();
        this.loadVendorPerformanceData();
    }
}

const visualizer = new DataVisualizer();

// Wait for DOM and app to be ready
document.addEventListener('DOMContentLoaded', () => {
    const waitForApp = () => {
        if (typeof app !== 'undefined' && app.apiCall) {
        visualizer.initializeCharts();
        } else {
            setTimeout(waitForApp, 100);
        }
    };
    waitForApp();
});
