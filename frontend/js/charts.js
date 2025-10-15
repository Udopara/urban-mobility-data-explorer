class ChartRenderer {
    constructor() {
        this.colors = {
            primary: '#4f8cff',
            accent: '#22d3ee',
            success: '#22c55e',
            warning: '#f59e0b',
            danger: '#ef4444',
            surface: '#12151c',
            text: '#e9eef7',
            muted: '#9aa4b2'
        };
    }

    renderTripVolumeChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        const width = rect.width;
        const height = rect.height;
        const padding = { top: 20, right: 40, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.fillStyle = this.colors.surface;
        ctx.fillRect(0, 0, width, height);

        if (!data || data.length === 0) {
            this.renderNoDataMessage(ctx, width, height);
            return;
        }

        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const valueRange = maxValue - minValue;

        this.drawAxes(ctx, padding, chartWidth, chartHeight, data, maxValue, minValue);
        this.drawLineChart(ctx, padding, chartWidth, chartHeight, data, maxValue, minValue);
        this.drawDataPoints(ctx, padding, chartWidth, chartHeight, data, maxValue, minValue);
    }

    renderVendorPerformanceChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        const width = rect.width;
        const height = rect.height;
        const padding = { top: 20, right: 20, bottom: 60, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.fillStyle = this.colors.surface;
        ctx.fillRect(0, 0, width, height);

        if (!data || data.length === 0) {
            this.renderNoDataMessage(ctx, width, height);
            return;
        }

        const maxValue = Math.max(...data.map(d => d.trip_count));
        const barWidth = chartWidth / data.length * 0.8;
        const barSpacing = chartWidth / data.length;

        this.drawBarChartAxes(ctx, padding, chartWidth, chartHeight, data, maxValue);
        this.drawBarChart(ctx, padding, chartWidth, chartHeight, data, maxValue, barWidth, barSpacing);
        this.drawBarChartLabels(ctx, padding, chartWidth, chartHeight, data, barSpacing);
    }

    drawAxes(ctx, padding, chartWidth, chartHeight, data, maxValue, minValue) {
        ctx.strokeStyle = this.colors.muted;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        const ySteps = 5;
        const stepValue = (maxValue - minValue) / ySteps;
        
        for (let i = 0; i <= ySteps; i++) {
            const value = minValue + (stepValue * i);
            const y = padding.top + chartHeight - (i / ySteps) * chartHeight;
            
            ctx.fillStyle = this.colors.muted;
            ctx.font = '12px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(this.formatNumber(value), padding.left - 10, y + 4);
            
            if (i > 0) {
                ctx.strokeStyle = this.colors.surface;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + chartWidth, y);
                ctx.stroke();
            }
        }
    }

    drawLineChart(ctx, padding, chartWidth, chartHeight, data, maxValue, minValue) {
        if (data.length < 2) return;
        
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding.left + (index / (data.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    drawDataPoints(ctx, padding, chartWidth, chartHeight, data, maxValue, minValue) {
        data.forEach((point, index) => {
            const x = padding.left + (index / (data.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
            
            ctx.fillStyle = this.colors.primary;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.strokeStyle = this.colors.surface;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.stroke();
        });
    }

    drawBarChartAxes(ctx, padding, chartWidth, chartHeight, data, maxValue) {
        ctx.strokeStyle = this.colors.muted;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        const ySteps = 5;
        const stepValue = maxValue / ySteps;
        
        for (let i = 0; i <= ySteps; i++) {
            const value = stepValue * i;
            const y = padding.top + chartHeight - (i / ySteps) * chartHeight;
            
            ctx.fillStyle = this.colors.muted;
            ctx.font = '12px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(this.formatNumber(value), padding.left - 10, y + 4);
            
            if (i > 0) {
                ctx.strokeStyle = this.colors.surface;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + chartWidth, y);
                ctx.stroke();
            }
        }
    }

    drawBarChart(ctx, padding, chartWidth, chartHeight, data, maxValue, barWidth, barSpacing) {
        const colors = [this.colors.primary, this.colors.accent, this.colors.success, this.colors.warning, this.colors.danger];
        
        data.forEach((item, index) => {
            const barHeight = (item.trip_count / maxValue) * chartHeight;
            const x = padding.left + (index * barSpacing) + (barSpacing - barWidth) / 2;
            const y = padding.top + chartHeight - barHeight;
            
            const color = colors[index % colors.length];
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.strokeStyle = this.colors.surface;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, barWidth, barHeight);
        });
    }

    drawBarChartLabels(ctx, padding, chartWidth, chartHeight, data, barSpacing) {
        ctx.fillStyle = this.colors.text;
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        
        data.forEach((item, index) => {
            const x = padding.left + (index * barSpacing) + (barSpacing / 2);
            const y = padding.top + chartHeight + 20;
            
            const label = item.vendor_id.length > 8 ? item.vendor_id.substring(0, 8) + '...' : item.vendor_id;
            ctx.fillText(label, x, y);
        });
    }

    renderNoDataMessage(ctx, width, height) {
        ctx.fillStyle = this.colors.muted;
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data available', width / 2, height / 2);
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return Math.round(num).toString();
    }
}

class DataVisualizer {
    constructor() {
        this.chartRenderer = new ChartRenderer();
        this.charts = new Map();
    }

    async initializeCharts() {
        await this.loadTripVolumeData();
        await this.loadVendorPerformanceData();
    }

    async loadTripVolumeData() {
        try {
            // Check if app is available
            if (typeof app === 'undefined') {
                console.log('App not available yet, skipping trip volume data load');
                return;
            }
            const trips = await app.apiCall('/trips?limit=1000');
            const hourlyData = this.aggregateTripsByHour(trips);
            this.renderTripVolumeChart(hourlyData);
        } catch (error) {
            console.error('Failed to load trip volume data:', error);
        }
    }

    async loadVendorPerformanceData() {
        try {
            // Check if app is available
            if (typeof app === 'undefined') {
                console.log('App not available yet, skipping vendor performance data load');
                return;
            }
            const vendors = await app.apiCall('/insights/top-vendors?limit=8');
            this.renderVendorPerformanceChart(vendors);
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

        const data = [];
        for (let hour = 0; hour < 24; hour++) {
            data.push({
                label: `${hour}:00`,
                value: hourlyCounts.get(hour) || 0
            });
        }
        
        return data;
    }

    renderTripVolumeChart(data) {
        this.chartRenderer.renderTripVolumeChart('trip-volume-chart', data);
    }

    renderVendorPerformanceChart(data) {
        this.chartRenderer.renderVendorPerformanceChart('vendor-performance-chart', data);
    }

    updateCharts() {
        this.loadTripVolumeData();
        this.loadVendorPerformanceData();
    }
}

const visualizer = new DataVisualizer();

document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to be available before initializing charts
    const waitForApp = () => {
        if (typeof app !== 'undefined' && app.apiCall) {
            visualizer.initializeCharts();
        } else {
            setTimeout(waitForApp, 100);
        }
    };
    waitForApp();
});

window.addEventListener('resize', () => {
    visualizer.updateCharts();
});
