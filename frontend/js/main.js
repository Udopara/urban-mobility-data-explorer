class UrbanMobilityApp {
    constructor() {
        this.apiBase = 'http://127.0.0.1:8000/api';
        this.currentSection = 'dashboard';
        this.currentPage = 1;
        this.pageSize = 50;
        this.sortField = null;
        this.sortDirection = 'asc';
        this.filters = {
            vendor: '',
            location: '',
            search: ''
        };
        this.cache = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupThemeToggle();
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target.dataset.section));
        });

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounceSearch();
            });
        }

        const vendorFilter = document.getElementById('vendor-filter');
        if (vendorFilter) {
            vendorFilter.addEventListener('change', (e) => {
                this.filters.vendor = e.target.value;
                this.loadTrips();
            });
        }

        const locationFilter = document.getElementById('location-filter');
        if (locationFilter) {
            locationFilter.addEventListener('change', (e) => {
                this.filters.location = e.target.value;
                this.loadTrips();
            });
        }

        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });

        const prevPageBtn = document.getElementById('prev-page');
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.changePage(-1));
        }
        
        const nextPageBtn = document.getElementById('next-page');
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.changePage(1));
        }

        const toastCloseBtn = document.getElementById('toast-close');
        if (toastCloseBtn) {
            toastCloseBtn.addEventListener('click', () => this.hideToast());
        }
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            });
        }
    }

    async loadInitialData() {
        this.showLoading();
        try {
            await Promise.all([
                this.loadDashboardMetrics(),
                this.loadVendors(),
                this.loadLocations(),
                this.loadTrips()
            ]);
        } catch (error) {
            this.showError('Failed to load initial data');
        } finally {
            this.hideLoading();
        }
    }

    async loadDashboardMetrics() {
        try {
            const [overview, summary] = await Promise.all([
                this.apiCall('/insights/overview'),
                this.apiCall('/trips/summary')
            ]);

            this.updateMetric('total-trips', overview.total_trips?.toLocaleString() || '0');
            this.updateMetric('active-vendors', overview.unique_vendors?.toLocaleString() || '0');
            this.updateMetric('total-revenue', this.formatCurrency(summary.total_revenue));
            this.updateMetric('avg-duration', this.formatDuration(summary.avg_trip_duration_minutes));

            this.updateMetricChange('trips-change', '+12.5%');
            this.updateMetricChange('vendors-change', '+2');
            this.updateMetricChange('revenue-change', '+8.3%');
            this.updateMetricChange('duration-change', '-5.2%');

            if (typeof visualizer !== 'undefined') {
                visualizer.updateCharts();
            }

        } catch (error) {
            console.error('Failed to load dashboard metrics:', error);
        }
    }

    async loadVendors() {
        try {
            const vendors = await this.apiCall('/vendors');
            this.populateVendorFilter(vendors);
            this.renderVendorsGrid(vendors);
        } catch (error) {
            console.error('Failed to load vendors:', error);
        }
    }

    async loadLocations() {
        try {
            const locations = await this.apiCall('/locations');
            this.populateLocationFilter(locations);
            this.renderLocationsGrid(locations);
        } catch (error) {
            console.error('Failed to load locations:', error);
        }
    }

    async loadTrips() {
        try {
            const params = new URLSearchParams({
                limit: this.pageSize,
                offset: (this.currentPage - 1) * this.pageSize
            });

            if (this.filters.vendor) params.append('vendor_id', this.filters.vendor);
            if (this.sortField) {
                params.append('sort', this.sortField);
                params.append('order', this.sortDirection);
            }

            const trips = await this.apiCall(`/trips?${params}`);
            this.renderTripsTable(trips);
            this.updatePagination();
        } catch (error) {
            console.error('Failed to load trips:', error);
        }
    }

    async loadInsights() {
        try {
            const [overview, topVendors] = await Promise.all([
                this.apiCall('/insights/overview'),
                this.apiCall('/insights/top-vendors?limit=10')
            ]);

            this.renderInsights(overview, topVendors);
        } catch (error) {
            console.error('Failed to load insights:', error);
        }
    }

    switchSection(section) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.app-main section').forEach(sec => sec.classList.remove('active'));
        
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        document.getElementById(section).classList.add('active');
        
        this.currentSection = section;

        if (section === 'insights') {
            this.loadInsights();
        }
    }

    populateVendorFilter(vendors) {
        const select = document.getElementById('vendor-filter');
        select.innerHTML = '<option value="">All Vendors</option>';
        vendors.forEach(vendor => {
            const option = document.createElement('option');
            option.value = vendor.vendor_id;
            option.textContent = vendor.vendor_name || vendor.vendor_id;
            select.appendChild(option);
        });
    }

    populateLocationFilter(locations) {
        const select = document.getElementById('location-filter');
        select.innerHTML = '<option value="">All Locations</option>';
        locations.slice(0, 50).forEach(location => {
            const option = document.createElement('option');
            option.value = location.location_id;
            option.textContent = `${location.location_id} - ${location.zone || location.borough || 'Unknown'}`;
            select.appendChild(option);
        });
    }

    renderTripsTable(trips) {
        const tbody = document.getElementById('trips-table-body');
        tbody.innerHTML = '';

        trips.forEach(trip => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${trip.trip_id}</td>
                <td>${trip.vendor_id}</td>
                <td>${this.formatDateTime(trip.pickup_datetime)}</td>
                <td>${this.formatDateTime(trip.dropoff_datetime)}</td>
                <td>${this.formatDistance(trip.trip_miles)}</td>
                <td>${this.formatDuration(trip.trip_duration_hours * 60)}</td>
                <td>${this.formatCurrency(trip.base_passenger_fare)}</td>
                <td>${this.formatSpeed(trip.average_speed_mph)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    renderVendorsGrid(vendors) {
        const grid = document.getElementById('vendors-grid');
        grid.innerHTML = '';

        vendors.forEach(vendor => {
            const card = document.createElement('div');
            card.className = 'vendor-card';
            card.innerHTML = `
                <h3>${vendor.vendor_name || vendor.vendor_id}</h3>
                <p class="vendor-id">ID: ${vendor.vendor_id}</p>
                <button onclick="app.loadVendorTrips('${vendor.vendor_id}')" class="view-trips-btn">View Trips</button>
            `;
            grid.appendChild(card);
        });
    }

    renderLocationsGrid(locations) {
        const grid = document.getElementById('locations-grid');
        grid.innerHTML = '';

        locations.slice(0, 12).forEach(location => {
            const card = document.createElement('div');
            card.className = 'location-card';
            card.innerHTML = `
                <h3>Zone ${location.location_id}</h3>
                <p class="location-borough">${location.borough || 'Unknown Borough'}</p>
                <p class="location-zone">${location.zone || 'Unknown Zone'}</p>
                <button onclick="app.loadLocationTrips(${location.location_id})" class="view-trips-btn">View Trips</button>
            `;
            grid.appendChild(card);
        });
    }

    renderInsights(overview, topVendors) {
        const container = document.getElementById('insights-container');
        container.innerHTML = `
            <div class="insight-card">
                <h3>System Overview</h3>
                <div class="insight-metrics">
                    <div class="insight-metric">
                        <span class="metric-label">Total Trips</span>
                        <span class="metric-value">${overview.total_trips?.toLocaleString()}</span>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-label">Unique Vendors</span>
                        <span class="metric-value">${overview.unique_vendors}</span>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-label">Unique Locations</span>
                        <span class="metric-value">${overview.unique_locations}</span>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-label">Avg Base Fare</span>
                        <span class="metric-value">${this.formatCurrency(overview.avg_base_fare)}</span>
                    </div>
                </div>
            </div>
            <div class="insight-card">
                <h3>Top Performing Vendors</h3>
                <div class="vendor-performance-list">
                    ${topVendors.map(vendor => `
                        <div class="vendor-performance-item">
                            <span class="vendor-name">${vendor.vendor_id}</span>
                            <span class="vendor-trips">${vendor.trip_count} trips</span>
                            <span class="vendor-revenue">${this.formatCurrency(vendor.total_revenue)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    handleSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }

        document.querySelectorAll('.sortable').forEach(th => {
            th.removeAttribute('data-direction');
        });
        
        const activeTh = document.querySelector(`[data-sort="${field}"]`);
        activeTh.setAttribute('data-direction', this.sortDirection);

        this.loadTrips();
    }

    changePage(direction) {
        const newPage = this.currentPage + direction;
        if (newPage >= 1) {
            this.currentPage = newPage;
            this.loadTrips();
        }
    }

    updatePagination() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const info = document.getElementById('pagination-info');
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = false;
        
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = this.currentPage * this.pageSize;
        info.textContent = `Showing ${start}-${end} of many trips`;
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadTrips();
        }, 300);
    }

    async loadVendorTrips(vendorId) {
        this.switchSection('trips');
        document.getElementById('vendor-filter').value = vendorId;
        this.filters.vendor = vendorId;
        this.loadTrips();
    }

    async loadLocationTrips(locationId) {
        this.switchSection('trips');
        document.getElementById('location-filter').value = locationId;
        this.filters.location = locationId;
        this.loadTrips();
    }

    async refreshData() {
        this.cache.clear();
        await this.loadInitialData();
        if (typeof visualizer !== 'undefined') {
            visualizer.updateCharts();
        }
    }

    async apiCall(endpoint) {
        const cacheKey = endpoint;
        if (this.cache.has(cacheKey)) {
            console.log(`📦 Cache hit for ${endpoint}`);
            return this.cache.get(cacheKey);
        }

        const url = `${this.apiBase}${endpoint}`;
        console.log(`🌐 Making API call to: ${url}`);

        try {
            const response = await fetch(url);
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ Data received for ${endpoint}:`, data);
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`❌ API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    updateMetric(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    updateMetricChange(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    showLoading() {
        document.getElementById('loading-overlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-toast').classList.add('active');
        setTimeout(() => this.hideToast(), 5000);
    }

    hideToast() {
        document.getElementById('error-toast').classList.remove('active');
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatCurrency(amount) {
        if (!amount) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDuration(minutes) {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    formatDistance(miles) {
        if (!miles) return '-';
        return `${parseFloat(miles).toFixed(2)} mi`;
    }

    formatSpeed(mph) {
        if (!mph) return '-';
        return `${parseFloat(mph).toFixed(1)} mph`;
    }
}

const app = new UrbanMobilityApp();
