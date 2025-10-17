// Advanced Chart.js visualizations for Urban Mobility Data Explorer
// Enterprise-level data visualization components

class AdvancedDataVisualizer {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: 'rgb(79, 140, 255)',
            primaryGradient: ['rgba(79, 140, 255, 0.8)', 'rgba(79, 140, 255, 0.1)'],
            accent: 'rgb(34, 211, 238)',
            accentGradient: ['rgba(34, 211, 238, 0.8)', 'rgba(34, 211, 238, 0.1)'],
            success: 'rgb(34, 197, 94)',
            successGradient: ['rgba(34, 197, 94, 0.8)', 'rgba(34, 197, 94, 0.1)'],
            warning: 'rgb(245, 158, 11)',
            warningGradient: ['rgba(245, 158, 11, 0.8)', 'rgba(245, 158, 11, 0.1)'],
            danger: 'rgb(239, 68, 68)',
            dangerGradient: ['rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.1)'],
            purple: 'rgb(168, 85, 247)',
            purpleGradient: ['rgba(168, 85, 247, 0.8)', 'rgba(168, 85, 247, 0.1)'],
            text: 'rgb(233, 238, 247)',
            muted: 'rgb(154, 164, 178)',
            grid: 'rgba(154, 164, 178, 0.1)'
        };
        
        this.chartPalette = [
            this.colors.primary,
            this.colors.accent,
            this.colors.success,
            this.colors.warning,
            this.colors.danger,
            this.colors.purple,
            'rgb(249, 115, 22)', // orange
            'rgb(236, 72, 153)', // pink
        ];
    }

    // ============================================
    // DISTANCE VS FARE SCATTER PLOT
    // ============================================
    async renderDistanceFareScatter() {
        try {
            const trips = await app.apiCall('/trips?limit=1000');
            const scatterData = this.generateScatterData(trips);
            this.createScatterChart('distance-fare-scatter', scatterData);
        } catch (error) {
            console.error('Failed to render distance-fare scatter:', error);
        }
    }

    generateScatterData(trips) {
        return trips
            .filter(t => t.trip_miles && t.base_passenger_fare)
            .map(trip => ({
                x: parseFloat(trip.trip_miles),
                y: parseFloat(trip.base_passenger_fare)
            }));
    }

    createScatterChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Trip Distance vs Fare',
                    data: data,
                    backgroundColor: this.colors.primary.replace('rgb', 'rgba').replace(')', ', 0.6)'),
                    borderColor: this.colors.primary,
                    borderWidth: 1,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.3,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(18, 21, 28, 0.95)',
                        titleColor: this.colors.text,
                        bodyColor: this.colors.text,
                        borderColor: this.colors.primary,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => [
                                `Distance: ${context.parsed.x.toFixed(2)} miles`,
                                `Fare: $${context.parsed.y.toFixed(2)}`
                            ]
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Trip Distance (miles)',
                            color: this.colors.text,
                            font: { size: 12, weight: '600' }
                        },
                        grid: { color: this.colors.grid, drawBorder: false },
                        ticks: { color: this.colors.muted, font: { size: 11 } }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Base Passenger Fare ($)',
                            color: this.colors.text,
                            font: { size: 12, weight: '600' }
                        },
                        grid: { color: this.colors.grid, drawBorder: false },
                        ticks: { color: this.colors.muted, font: { size: 11 } }
                    }
                }
            }
        });
    }

    // ============================================
    // BOROUGH DISTRIBUTION - Doughnut Chart
    // ============================================
    async renderBoroughDistribution() {
        try {
            const locations = await app.apiCall('/locations?limit=300');
            const boroughData = this.aggregateByBorough(locations);
            this.createDoughnutChart('borough-distribution-chart', boroughData);
        } catch (error) {
            console.error('Failed to render borough distribution:', error);
        }
    }

    aggregateByBorough(locations) {
        const boroughCounts = {};
        
        locations.forEach(loc => {
            const borough = loc.borough || 'Unknown';
            boroughCounts[borough] = (boroughCounts[borough] || 0) + 1;
        });

        return {
            labels: Object.keys(boroughCounts),
            data: Object.values(boroughCounts)
        };
    }

    createDoughnutChart(canvasId, chartData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.data,
                    backgroundColor: this.chartPalette,
                    borderColor: chartData.labels.map((_, i) => this.chartPalette[i % this.chartPalette.length]),
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.3,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: this.colors.text,
                            padding: 10,
                            font: { size: 11, weight: '600' },
                            boxWidth: 12,
                            generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label} (${data.datasets[0].data[i]})`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].borderColor[i],
                                    lineWidth: 2,
                                    hidden: false,
                                    index: i
                                }));
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(18, 21, 28, 0.95)',
                        titleColor: this.colors.text,
                        bodyColor: this.colors.text,
                        borderColor: this.colors.primary,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} zones (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // ============================================
    // REVENUE VS DRIVER PAY - Mixed Chart
    // ============================================
    async renderRevenueAnalysis() {
        try {
            console.log('🔄 Loading revenue analysis data...');
            const vendors = await app.apiCall('/insights/top-vendors?limit=10');
            console.log('✅ Loaded', vendors.length, 'vendors for revenue chart');
            
            if (!vendors || vendors.length === 0) {
                console.warn('⚠️ No vendor data available');
                return;
            }
            
            // Map vendor IDs to names
            const vendorsWithNames = vendors.map(v => ({
                ...v,
                vendor_name: app.getVendorName(v.vendor_id)
            }));
            
            this.createRevenueChart('revenue-analysis-chart', vendorsWithNames);
        } catch (error) {
            console.error(' Failed to render revenue analysis:', error);
        }
    }

    createRevenueChart(canvasId, vendors) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.log('Canvas not found:', canvasId);
            return;
        }

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = vendors.map(v => v.vendor_name || v.vendor_id);
        const revenues = vendors.map(v => v.total_revenue || 0);
        const avgFares = vendors.map(v => v.avg_base_fare || 0);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Total Revenue',
                        data: revenues,
                        backgroundColor: this.colors.primaryGradient[0],
                        borderColor: this.colors.primary,
                        borderWidth: 2,
                        borderRadius: 6,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: 'Avg Base Fare',
                        data: avgFares,
                        borderColor: this.colors.accent,
                        backgroundColor: this.colors.accentGradient[0],
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: this.colors.text,
                            padding: 15,
                            font: { size: 12, weight: '600' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(18, 21, 28, 0.95)',
                        titleColor: this.colors.text,
                        bodyColor: this.colors.text,
                        borderColor: this.colors.primary,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    label += '$' + context.parsed.y.toLocaleString();
                                } else {
                                    label += '$' + context.parsed.y.toFixed(2);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: {
                            color: this.colors.muted,
                            font: { size: 11, weight: '600' }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Total Revenue ($)',
                            color: this.colors.text,
                            font: { size: 12, weight: '600' }
                        },
                        grid: { color: this.colors.grid, drawBorder: false },
                        ticks: {
                            color: this.colors.muted,
                            font: { size: 11 },
                            callback: (value) => '$' + (value / 1000).toFixed(0) + 'K'
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Avg Fare ($)',
                            color: this.colors.accent,
                            font: { size: 12, weight: '600' }
                        },
                        grid: { display: false },
                        ticks: {
                            color: this.colors.accent,
                            font: { size: 11 },
                            callback: (value) => '$' + value.toFixed(0)
                        }
                    }
                }
            }
        });
    }

    // ============================================
    // UTILITY: Initialize all advanced charts
    // ============================================
    async initializeAllCharts() {
        console.log('🚀 Initializing all advanced charts...');
        try {
            await Promise.all([
                this.renderDistanceFareScatter(),
                this.renderBoroughDistribution(),
                this.renderRevenueAnalysis()
            ]);
            console.log('✅ All advanced charts initialized');
        } catch (error) {
            console.error('❌ Error initializing charts:', error);
        }
    }

    // ============================================
    // UTILITY: Destroy all charts
    // ============================================
    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Export for use in main app
const advancedVisualizer = new AdvancedDataVisualizer();

// Initialize when DOM is ready and app is available
document.addEventListener('DOMContentLoaded', () => {
    const waitForApp = () => {
        if (typeof app !== 'undefined' && app.apiCall) {
            console.log('✅ Advanced visualizer ready');
        } else {
            setTimeout(waitForApp, 100);
        }
    };
    waitForApp();
});

