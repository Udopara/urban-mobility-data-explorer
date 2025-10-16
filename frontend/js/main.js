class UrbanMobilityApp {
    constructor() {
        this.apiBase = 'http://127.0.0.1:8000/api';
        this.currentSection = 'dashboard';
        this.currentPage = 1;
        this.pageSize = 10;
        this.locationsCurrentPage = 1;
        this.locationsPageSize = 12;
        this.sortField = null;
        this.sortDirection = 'desc';
        this.filters = {
            vendor: '',
            location: '',
            search: '',
            startDate: '',
            endDate: ''
        };
        this.searchTimeout = null;
        this.cache = new Map();
        this.vendorMap = new Map(); // Map vendor IDs to names
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupThemeToggle();
        this.setupScrollEffects();
    }
    
    setupScrollEffects() {
        // Add shadow to header on scroll
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            const header = document.querySelector('.app-header');
            
            if (header) {
                if (currentScroll > 20) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            }
            
            lastScroll = currentScroll;
        });
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
                this.currentPage = 1; 
                this.highlightActiveFilters();
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


        const sortFieldSelect = document.getElementById('sort-field');
        if (sortFieldSelect) {
            sortFieldSelect.addEventListener('change', (e) => {
                this.sortField = e.target.value;
                this.currentPage = 1;
                this.highlightActiveFilters();
                this.loadTrips();
            });
        }

        const sortDirectionSelect = document.getElementById('sort-direction');
        if (sortDirectionSelect) {
            sortDirectionSelect.addEventListener('change', (e) => {
                this.sortDirection = e.target.value;
                this.currentPage = 1;
                this.loadTrips();
            });
        }

        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Dashboard date inputs
        const dashStartDateInput = document.getElementById('start-date');
        if (dashStartDateInput) {
            dashStartDateInput.addEventListener('change', (e) => {
                this.filters.startDate = e.target.value;
                this.cache.clear(); // Clear cache when filters change
                this.loadDashboardMetrics();
                if (typeof visualizer !== 'undefined') {
                    visualizer.updateCharts();
                }
            });
        }

        const dashEndDateInput = document.getElementById('end-date');
        if (dashEndDateInput) {
            dashEndDateInput.addEventListener('change', (e) => {
                this.filters.endDate = e.target.value;
                this.cache.clear(); // Clear cache when filters change
                this.loadDashboardMetrics();
                if (typeof visualizer !== 'undefined') {
                    visualizer.updateCharts();
                }
            });
        }

        // Trips page date inputs
        const tripsStartDateInput = document.getElementById('trips-start-date');
        if (tripsStartDateInput) {
            tripsStartDateInput.addEventListener('change', (e) => {
                this.filters.startDate = e.target.value;
                this.currentPage = 1;
                this.highlightActiveFilters();
                this.loadTrips();
            });
        }

        const tripsEndDateInput = document.getElementById('trips-end-date');
        if (tripsEndDateInput) {
            tripsEndDateInput.addEventListener('change', (e) => {
                this.filters.endDate = e.target.value;
                this.currentPage = 1;
                this.highlightActiveFilters();
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

        const itemsPerPageSelect = document.getElementById('items-per-page-select');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1; 
                this.loadTrips();
            });
        }

        const locationsItemsPerPageSelect = document.getElementById('locations-items-per-page-select');
        if (locationsItemsPerPageSelect) {
            locationsItemsPerPageSelect.addEventListener('change', (e) => {
                this.locationsPageSize = parseInt(e.target.value);
                this.locationsCurrentPage = 1; 
                this.loadLocations();
            });
        }

        const locationsPrevPageBtn = document.getElementById('locations-prev-page');
        if (locationsPrevPageBtn) {
            locationsPrevPageBtn.addEventListener('click', () => this.changeLocationsPage(-1));
        }
        
        const locationsNextPageBtn = document.getElementById('locations-next-page');
        if (locationsNextPageBtn) {
            locationsNextPageBtn.addEventListener('click', () => this.changeLocationsPage(1));
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
            // Build query params from filters
            const params = new URLSearchParams();
            if (this.filters.startDate) params.append('start_date', this.filters.startDate);
            if (this.filters.endDate) params.append('end_date', this.filters.endDate);
            
            const queryString = params.toString() ? `?${params.toString()}` : '';
            
            const [overview, summary] = await Promise.all([
                this.apiCall(`/insights/overview${queryString}`),
                this.apiCall(`/trips/summary${queryString}`)
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
            this.showVendorsLoading();
            const vendors = await this.apiCall('/vendors');
            
            // Build vendor map for ID -> Name lookup
            vendors.forEach(vendor => {
                this.vendorMap.set(vendor.vendor_id, vendor.vendor_name || vendor.vendor_id);
            });
            
            this.populateVendorFilter(vendors);
            this.renderVendorsGrid(vendors);
        } catch (error) {
            console.error('Failed to load vendors:', error);
            this.showVendorsError();
        }
    }
    
    getVendorName(vendorId) {
        return this.vendorMap.get(vendorId) || vendorId;
    }

    async loadLocations() {
        try {
            this.showLocationsLoading();
            const params = new URLSearchParams({
                limit: this.locationsPageSize,
                offset: (this.locationsCurrentPage - 1) * this.locationsPageSize
            });
            
            console.log('Loading locations with params:', params.toString());
            const locations = await this.apiCall(`/locations?${params}`);
            console.log('Locations loaded:', locations);
            
            if (!locations || locations.length === 0) {
                console.warn('No locations data returned from API');
            }
            
            this.populateLocationFilter(locations);
            this.renderLocationsGrid(locations);
            this.updateLocationsPagination();
        } catch (error) {
            console.error('Failed to load locations:', error);
            console.error('Error details:', error.message, error.stack);
            this.showLocationsError();
        }
    }

    async loadTrips() {
        try {
            // Show loading skeleton
            const tableBody = document.getElementById('trips-table-body');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr><td colspan="8" style="padding: 40px;">
                        <div class="loading-skeleton shimmer"></div>
                    </td></tr>
                `;
            }
            
            const params = new URLSearchParams({
                limit: this.pageSize,
                offset: (this.currentPage - 1) * this.pageSize
            });

            // Add filter parameters
            if (this.filters.vendor) params.append('vendor_id', this.filters.vendor);
            if (this.filters.search) params.append('search', this.filters.search);
            if (this.filters.startDate) params.append('start_date', this.filters.startDate);
            if (this.filters.endDate) params.append('end_date', this.filters.endDate);

            // Add sorting parameters
            if (this.sortField) {
                params.append('sort_by', this.sortField);
                params.append('sort_order', this.sortDirection);
            }

            const trips = await this.apiCall(`/trips?${params}`);
            this.renderTripsTable(trips);
            this.updatePagination();
        } catch (error) {
            console.error('Failed to load trips:', error);
            const tableBody = document.getElementById('trips-table-body');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr><td colspan="8" class="error-card" style="padding: 40px;">
                        <div class="error-content">
                            <span class="error-icon">⚠️</span>
                            <h3>Failed to load trips</h3>
                            <p>Please try again later</p>
                        </div>
                    </td></tr>
                `;
            }
            this.showToast('Failed to load trips data', 'error');
        }
    }

    async loadInsights() {
        try {
            // Show loading state
            this.showInsightsLoading();
            this.showAlgorithmPerformanceLoading();
            
            const params = new URLSearchParams();
            if (this.filters.startDate) params.append('start_date', this.filters.startDate);
            if (this.filters.endDate) params.append('end_date', this.filters.endDate);
            
            const queryString = params.toString() ? `?${params.toString()}` : '';
            
            const [overview, topVendors, algorithmStats] = await Promise.all([
                this.apiCall(`/insights/overview${queryString}`),
                this.apiCall(`/insights/top-vendors?limit=10${queryString ? '&' + params.toString() : ''}`),
                this.apiCall('/insights/algorithm-performance')
            ]);

            this.renderInsights(overview, topVendors);
            this.renderAlgorithmPerformance(algorithmStats);
        } catch (error) {
            console.error('Failed to load insights:', error);
            this.showInsightsError();
        }
    }

    showInsightsError() {
        const container = document.getElementById('insights-container');
        if (container) {
            container.innerHTML = `
                <div class="error-card">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Failed to Load Insights</h3>
                    <p>There was an error loading the insights data. Please try refreshing the page.</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i> Refresh Page
                    </button>
                </div>
            `;
        }
    }

    showInsightsLoading() {
        const container = document.getElementById('insights-container');
        container.innerHTML = `
            <!-- Algorithm Performance Loading Card -->
            <div class="algorithm-performance-card loading-card">
                <div class="card-header">
                    <div class="card-icon loading-skeleton"></div>
                    <h3 class="loading-skeleton" style="width: 200px; height: 24px;"></h3>
                    <p class="loading-skeleton" style="width: 150px; height: 16px;"></p>
                </div>
                <div class="algorithm-stats-grid">
                    ${Array.from({length: 5}, () => `
                        <div class="stat-card loading-skeleton" style="width: 100%; height: 80px;"></div>
                    `).join('')}
                </div>
                <div class="card-divider loading-skeleton" style="width: 100%; height: 1px; margin: 20px 0;"></div>
                <div class="fare-range-stats">
                    ${Array.from({length: 3}, () => `
                        <div class="fare-stat loading-skeleton" style="width: 100px; height: 40px;"></div>
                    `).join('')}
                </div>
            </div>
            
            <div class="insight-card loading-card">
                <div class="card-header">
                    <div class="card-icon loading-skeleton"></div>
                    <h3 class="loading-skeleton" style="width: 120px; height: 20px;"></h3>
                </div>
                <div class="insight-metrics">
                    ${Array.from({length: 4}, () => `
                        <div class="insight-metric">
                            <div class="metric-icon loading-skeleton"></div>
                            <div class="metric-content">
                                <span class="metric-label loading-skeleton" style="width: 80px; height: 14px;"></span>
                                <span class="metric-value loading-skeleton" style="width: 60px; height: 18px;"></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="insight-card loading-card">
                <div class="card-header">
                    <div class="card-icon loading-skeleton"></div>
                    <h3 class="loading-skeleton" style="width: 150px; height: 20px;"></h3>
                </div>
                <div class="vendor-performance-list">
                    ${Array.from({length: 5}, () => `
                        <div class="vendor-performance-item">
                            <div class="vendor-rank loading-skeleton" style="width: 24px; height: 24px;"></div>
                            <div class="vendor-info">
                                <span class="vendor-name loading-skeleton" style="width: 80px; height: 16px;"></span>
                                <span class="vendor-trips loading-skeleton" style="width: 60px; height: 14px;"></span>
                            </div>
                            <div class="vendor-revenue loading-skeleton" style="width: 70px; height: 16px;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showVendorsLoading() {
        const grid = document.getElementById('vendors-grid');
        grid.innerHTML = Array.from({length: 6}, () => `
            <div class="vendor-card loading-card">
                <div class="vendor-icon loading-skeleton" style="width: 40px; height: 40px; border-radius: 8px;"></div>
                <h3 class="loading-skeleton" style="width: 120px; height: 18px;"></h3>
                <p class="loading-skeleton" style="width: 80px; height: 14px;"></p>
                <div class="loading-skeleton" style="width: 100%; height: 32px; border-radius: 6px;"></div>
            </div>
        `).join('');
    }

    showVendorsError() {
        const grid = document.getElementById('vendors-grid');
        grid.innerHTML = `
            <div class="vendor-card error-card">
                <div class="error-content">
                    <div class="error-icon">
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                            <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M10 6V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M10 14H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h3>Failed to Load Vendors</h3>
                    <p>There was an error loading the vendors data.</p>
                    <button class="retry-btn" onclick="app.loadVendors()">Retry</button>
                </div>
            </div>
        `;
    }

    showLocationsLoading() {
        const grid = document.getElementById('locations-grid');
        grid.innerHTML = Array.from({length: 9}, () => `
            <div class="location-card loading-card">
                <div class="location-icon loading-skeleton" style="width: 40px; height: 40px; border-radius: 8px;"></div>
                <h3 class="loading-skeleton" style="width: 100px; height: 18px;"></h3>
                <p class="loading-skeleton" style="width: 120px; height: 14px;"></p>
                <p class="loading-skeleton" style="width: 90px; height: 14px;"></p>
                <div class="loading-skeleton" style="width: 100%; height: 32px; border-radius: 6px;"></div>
            </div>
        `).join('');
    }

    showLocationsError() {
        const grid = document.getElementById('locations-grid');
        grid.innerHTML = `
            <div class="location-card error-card">
                <div class="error-content">
                    <div class="error-icon">
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                            <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M10 6V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M10 14H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h3>Failed to Load Locations</h3>
                    <p>There was an error loading the locations data.</p>
                    <button class="retry-btn" onclick="app.loadLocations()">Retry</button>
                </div>
            </div>
        `;
    }

    switchSection(section) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.app-main section').forEach(sec => sec.classList.remove('active'));
        
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        document.getElementById(section).classList.add('active');
        
        this.currentSection = section;

        // Load data based on section
        if (section === 'insights') {
            this.loadInsights();
        } else if (section === 'analytics') {
            this.loadAnalytics();
        }
    }

    async loadAnalytics() {
        try {
            console.log('📊 Loading analytics section...');
            
            // Build query params from filters
            const params = new URLSearchParams();
            if (this.filters.startDate) params.append('start_date', this.filters.startDate);
            if (this.filters.endDate) params.append('end_date', this.filters.endDate);
            
            const queryString = params.toString() ? `?${params.toString()}` : '';
            
            // Load analytics data
            const summary = await this.apiCall(`/trips/summary${queryString}`);
            
            // Update analytics metrics
            if (summary) {
                const avgDistanceEl = document.getElementById('analytics-avg-distance');
                if (avgDistanceEl) {
                    avgDistanceEl.textContent = summary.avg_trip_miles ? 
                        `${summary.avg_trip_miles.toFixed(2)} mi` : '-';
                }

                const avgSpeedEl = document.getElementById('analytics-avg-speed');
                if (avgSpeedEl) {
                    avgSpeedEl.textContent = summary.avg_speed_mph ? 
                        `${summary.avg_speed_mph.toFixed(1)} mph` : '-';
                }

                const revenuePerTripEl = document.getElementById('analytics-revenue-per-trip');
                if (revenuePerTripEl && summary.total_revenue && summary.total_trips) {
                    const revenuePerTrip = summary.total_revenue / summary.total_trips;
                    revenuePerTripEl.textContent = this.formatCurrency(revenuePerTrip);
                }

                const peakHourEl = document.getElementById('analytics-peak-hour');
                if (peakHourEl) {
                    // Calculate peak hour from trips data
                    const trips = await this.apiCall(`/trips?limit=1000${queryString ? '&' + params.toString() : ''}`);
                    if (trips && trips.length > 0) {
                        const hourCounts = {};
                        trips.forEach(trip => {
                            if (trip.pickup_datetime) {
                                const hour = new Date(trip.pickup_datetime).getHours();
                                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                            }
                        });
                        if (Object.keys(hourCounts).length > 0) {
                            const peakHour = Object.keys(hourCounts).reduce((a, b) => 
                                hourCounts[a] > hourCounts[b] ? a : b
                            );
                            peakHourEl.textContent = `${peakHour.toString().padStart(2, '0')}:00`;
                        }
                    }
                }
            }

            // Initialize advanced charts
            if (typeof advancedVisualizer !== 'undefined') {
                console.log('🚀 Initializing advanced charts...');
                await advancedVisualizer.initializeAllCharts();
            } else {
                console.warn('⚠️ advancedVisualizer not available');
            }
        } catch (error) {
            console.error('❌ Failed to load analytics:', error);
            this.showToast('Failed to load analytics data', 'error');
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
        if (!select) {
            console.log('Location filter dropdown not found in current view');
            return;
        }
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

        if (!trips || trips.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" style="padding: 60px; text-align: center;">
                    <div class="error-content">
                        <span style="font-size: 48px;">📭</span>
                        <h3 style="margin: 16px 0 8px; color: var(--text);">No trips found</h3>
                        <p style="color: var(--muted);">Try adjusting your filters or search criteria</p>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

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

        vendors.forEach((vendor, index) => {
            const card = document.createElement('div');
            card.className = 'vendor-card';
            card.innerHTML = `
                <div class="vendor-header">
                    <div class="vendor-icon">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M13 6C13 4.34315 11.6569 3 10 3C8.34315 3 7 4.34315 7 6C7 7.65685 8.34315 9 10 9C11.6569 9 13 7.65685 13 6Z" fill="currentColor"/>
                            <path d="M3 18C3 15.2386 5.23858 13 8 13H12C14.7614 13 17 15.2386 17 18V20H3V18Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="vendor-rank">${index + 1}</div>
                </div>
                <div class="vendor-content">
                    <h3>${vendor.vendor_name || vendor.vendor_id}</h3>
                    <p class="vendor-id">ID: ${vendor.vendor_id}</p>
                    <div class="vendor-stats">
                        <div class="stat-item">
                            <span class="stat-label">Status</span>
                            <span class="stat-value active">Active</span>
                        </div>
                    </div>
                </div>
                <button onclick="app.loadVendorTrips('${vendor.vendor_id}')" class="view-trips-btn">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2L3 7V18H7V12H13V18H17V7L10 2Z" fill="currentColor"/>
                    </svg>
                    View Trips
                </button>
            `;
            grid.appendChild(card);
        });
    }

    renderLocationsGrid(locations) {
        const grid = document.getElementById('locations-grid');
        grid.innerHTML = '';

        locations.forEach((location, index) => {
            const card = document.createElement('div');
            card.className = 'location-card';
            card.innerHTML = `
                <div class="location-header">
                    <div class="location-icon">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M17.657 16.657L13.414 20.9C13.0247 21.2905 12.3915 21.2905 12.002 20.9L7.75799 16.657C6.34899 15.248 5.34899 13.414 5.34899 11.414C5.34899 7.414 8.75799 4 12.757 4C16.757 4 20.166 7.414 20.166 11.414C20.166 13.414 19.166 15.248 17.657 16.657Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="location-id">${location.location_id}</div>
                </div>
                <div class="location-content">
                    <h3>Zone ${location.location_id}</h3>
                    <div class="location-details">
                        <div class="detail-item">
                            <span class="detail-label">Borough</span>
                            <span class="detail-value">${location.borough || 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Zone</span>
                            <span class="detail-value">${location.zone || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                <button onclick="app.loadLocationTrips(${location.location_id})" class="view-trips-btn">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2L3 7V18H7V12H13V18H17V7L10 2Z" fill="currentColor"/>
                    </svg>
                    View Trips
                </button>
            `;
            grid.appendChild(card);
        });
    }

    showAlgorithmPerformanceLoading() {
        const algorithmCard = document.querySelector('.algorithm-performance-card');
        if (algorithmCard) {
            algorithmCard.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">
                        <i class="fas fa-microchip"></i>
                    </div>
                    <h3>Custom Algorithm Performance</h3>
                    <p class="card-subtitle">IQR-based outlier detection with manual QuickSort</p>
                </div>
                <div class="algorithm-stats-grid">
                    <div class="stat-card loading-skeleton" style="height: 80px;"></div>
                    <div class="stat-card loading-skeleton" style="height: 80px;"></div>
                    <div class="stat-card loading-skeleton" style="height: 80px;"></div>
                    <div class="stat-card loading-skeleton" style="height: 80px;"></div>
                    <div class="stat-card loading-skeleton" style="height: 80px;"></div>
                </div>
                <div class="card-divider"></div>
                <div class="fare-range-stats">
                    <div class="fare-stat loading-skeleton" style="width: 100px; height: 40px;"></div>
                    <div class="fare-stat loading-skeleton" style="width: 100px; height: 40px;"></div>
                    <div class="fare-stat loading-skeleton" style="width: 100px; height: 40px;"></div>
                </div>
            `;
        }
    }

    renderAlgorithmPerformance(stats) {
        if (!stats) return;
        
        // Create the algorithm performance card HTML structure
        const algorithmCard = document.querySelector('.algorithm-performance-card');
        if (algorithmCard) {
            algorithmCard.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">
                        <i class="fas fa-microchip"></i>
                    </div>
                    <h3>Custom Algorithm Performance</h3>
                    <p class="card-subtitle">IQR-based outlier detection with manual QuickSort</p>
                </div>
                <div class="algorithm-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-cogs"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">Algorithm</span>
                            <span class="stat-value">${stats.algorithm_status || 'Custom IQR Detection'}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">Complexity</span>
                            <span class="stat-value">${stats.algorithm_complexity || 'O(n log n)'}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">Trips Analyzed</span>
                            <span class="stat-value" id="trips-analyzed">${stats.total_trips_analyzed?.toLocaleString() || '0'}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">Outliers Detected</span>
                            <span class="stat-value" id="outliers-detected">${stats.outliers_detected?.toLocaleString() || '0'}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">Outlier Rate</span>
                            <span class="stat-value" id="outlier-percentage">${stats.outlier_percentage?.toFixed(2) || '0'}%</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-label">Data Quality Score</span>
                            <span class="stat-value" id="data-quality-score">${stats.data_quality_score?.toFixed(1) || '0'}%</span>
                        </div>
                    </div>
                </div>
                <div class="card-divider"></div>
                <div class="fare-range-stats">
                    <div class="fare-stat">
                        <span class="fare-label">Min Fare</span>
                        <span class="fare-value" id="min-fare">${this.formatCurrency(stats.fare_statistics?.min_fare || 0)}</span>
                    </div>
                    <div class="fare-stat">
                        <span class="fare-label">Max Fare</span>
                        <span class="fare-value" id="max-fare">${this.formatCurrency(stats.fare_statistics?.max_fare || 0)}</span>
                    </div>
                    <div class="fare-stat">
                        <span class="fare-label">Avg Fare</span>
                        <span class="fare-value" id="avg-fare">${this.formatCurrency(stats.fare_statistics?.avg_fare || 0)}</span>
                    </div>
                </div>
            `;
        }
        
        console.log('✅ Algorithm performance data loaded:', stats);
    }

    renderInsights(overview, topVendors) {
        const container = document.getElementById('insights-container');
        container.innerHTML = `
            <div class="insight-card overview-card">
                <div class="card-header">
                    <div class="card-icon">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M3 4C3 3.44772 3.44772 3 4 3H16C16.5523 3 17 3.44772 17 4V6C17 6.55228 16.5523 7 16 7H4C3.44772 7 3 6.55228 3 6V4Z" fill="currentColor"/>
                            <path d="M3 10C3 9.44772 3.44772 9 4 9H16C16.5523 9 17 9.44772 17 10V12C17 12.5523 16.5523 13 16 13H4C3.44772 13 3 12.5523 3 12V10Z" fill="currentColor"/>
                            <path d="M3 16C3 15.4477 3.44772 15 4 15H16C16.5523 15 17 15.4477 17 16V18C17 18.5523 16.5523 19 16 19H4C3.44772 19 3 18.5523 3 18V16Z" fill="currentColor"/>
                        </svg>
                    </div>
                <h3>System Overview</h3>
                </div>
                <div class="insight-metrics">
                    <div class="insight-metric">
                        <div class="metric-icon trips-icon">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                <path d="M10 2L3 7V18H7V12H13V18H17V7L10 2Z" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="metric-content">
                        <span class="metric-label">Total Trips</span>
                        <span class="metric-value">${overview.total_trips?.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="insight-metric">
                        <div class="metric-icon vendors-icon">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" fill="none"/>
                            </svg>
                        </div>
                        <div class="metric-content">
                        <span class="metric-label">Unique Vendors</span>
                        <span class="metric-value">${overview.unique_vendors}</span>
                        </div>
                    </div>
                    <div class="insight-metric">
                        <div class="metric-icon locations-icon">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                <path d="M17.657 16.657L13.414 20.9C13.0247 21.2905 12.3915 21.2905 12.002 20.9L7.75799 16.657C6.34899 15.248 5.34899 13.414 5.34899 11.414C5.34899 7.414 8.75799 4 12.757 4C16.757 4 20.166 7.414 20.166 11.414C20.166 13.414 19.166 15.248 17.657 16.657Z" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="metric-content">
                        <span class="metric-label">Unique Locations</span>
                        <span class="metric-value">${overview.unique_locations}</span>
                        </div>
                    </div>
                    <div class="insight-metric">
                        <div class="metric-icon fare-icon">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                <path d="M4 4H16L14 12H6L4 4Z" fill="currentColor"/>
                                <path d="M6 12L8 20H12L14 12" stroke="currentColor" stroke-width="2" fill="none"/>
                            </svg>
                        </div>
                        <div class="metric-content">
                        <span class="metric-label">Avg Base Fare</span>
                        <span class="metric-value">${this.formatCurrency(overview.avg_base_fare)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="insight-card vendors-card">
                <div class="card-header">
                    <div class="card-icon">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M13 6C13 4.34315 11.6569 3 10 3C8.34315 3 7 4.34315 7 6C7 7.65685 8.34315 9 10 9C11.6569 9 13 7.65685 13 6Z" fill="currentColor"/>
                            <path d="M3 18C3 15.2386 5.23858 13 8 13H12C14.7614 13 17 15.2386 17 18V20H3V18Z" fill="currentColor"/>
                        </svg>
                    </div>
                <h3>Top Performing Vendors</h3>
                </div>
                <div class="vendor-performance-list">
                    ${topVendors.map((vendor, index) => `
                        <div class="vendor-performance-item ${index < 3 ? 'top-vendor' : ''}">
                            <div class="vendor-rank">${index + 1}</div>
                            <div class="vendor-info">
                            <span class="vendor-name">${this.getVendorName(vendor.vendor_id)}</span>
                                <span class="vendor-trips">${vendor.trip_count.toLocaleString()} trips</span>
                            </div>
                            <div class="vendor-revenue">${this.formatCurrency(vendor.total_revenue)}</div>
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
        
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = false; 
        
        if (info) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = this.currentPage * this.pageSize;
            info.textContent = `Showing ${start}-${end} of many trips`;
        }
    }

    changeLocationsPage(direction) {
        const newPage = this.locationsCurrentPage + direction;
        if (newPage >= 1) {
            this.locationsCurrentPage = newPage;
            this.loadLocations();
        }
    }

    updateLocationsPagination() {
        const prevBtn = document.getElementById('locations-prev-page');
        const nextBtn = document.getElementById('locations-next-page');
        const info = document.getElementById('locations-pagination-info');
        
        prevBtn.disabled = this.locationsCurrentPage === 1;
        nextBtn.disabled = false; 
        
        const start = (this.locationsCurrentPage - 1) * this.locationsPageSize + 1;
        const end = this.locationsCurrentPage * this.locationsPageSize;
        info.textContent = `Showing ${start}-${end} of many locations`;
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        // Show loading indicator
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.style.borderColor = 'var(--primary)';
        }
        
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this.loadTrips();
            
            // Reset border color
            if (searchInput) {
                searchInput.style.borderColor = '';
            }
        }, 400); 
    }

    highlightActiveFilters() {
        // Visual feedback for active filters
        const clearBtn = document.getElementById('clear-filters');
        const hasActiveFilters = 
            this.filters.vendor || 
            this.filters.search || 
            this.filters.startDate || 
            this.filters.endDate || 
            this.sortField;
        
        if (clearBtn) {
            if (hasActiveFilters) {
                clearBtn.style.display = 'block';
                clearBtn.classList.add('pulse');
            } else {
                clearBtn.style.display = 'none';
                clearBtn.classList.remove('pulse');
            }
        }
    }

    clearAllFilters() {
        // Reset all filter values
        this.filters = {
            vendor: '',
            location: '',
            search: '',
            startDate: '',
            endDate: ''
        };

        // Reset sort values
        this.sortField = null;
        this.sortDirection = 'desc';

        // Reset form inputs with animation
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.style.borderColor = '';
        }
        
        const vendorFilter = document.getElementById('vendor-filter');
        if (vendorFilter) vendorFilter.value = '';
        
        const tripsStartDate = document.getElementById('trips-start-date');
        if (tripsStartDate) tripsStartDate.value = '';
        
        const tripsEndDate = document.getElementById('trips-end-date');
        if (tripsEndDate) tripsEndDate.value = '';
        
        const sortField = document.getElementById('sort-field');
        if (sortField) sortField.value = '';
        
        const sortDirection = document.getElementById('sort-direction');
        if (sortDirection) sortDirection.value = 'desc';

        // Reset pagination
        this.currentPage = 1;
        
        // Update filter highlights
        this.highlightActiveFilters();

        // Show success feedback
        this.showToast('✨ Filters cleared successfully', 'success');

        // Reload data
        this.loadTrips();
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
        // Visual feedback
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.style.animation = 'spin 0.6s ease-in-out';
            setTimeout(() => {
                if (refreshBtn) refreshBtn.style.animation = '';
            }, 600);
        }
        
        // Clear cache and reload
        this.cache.clear();
        this.showToast(' Refreshing data...', 'info');
        
        try {
            await this.loadInitialData();
            
            // Reload current section data
            if (this.currentSection === 'analytics') {
                await this.loadAnalytics();
            } else if (this.currentSection === 'dashboard') {
                await this.loadDashboardMetrics();
            }
            
            if (typeof visualizer !== 'undefined') {
                visualizer.updateCharts();
            }
            
            if (typeof advancedVisualizer !== 'undefined' && this.currentSection === 'analytics') {
                await advancedVisualizer.initializeAllCharts();
            }
            
            this.showToast('✅ Data refreshed successfully', 'success');
        } catch (error) {
            console.error('Refresh error:', error);
            this.showToast('❌ Failed to refresh data', 'error');
        }
    }

    async apiCall(endpoint) {
        const cacheKey = endpoint;
        if (this.cache.has(cacheKey)) {
            console.log(` Cache hit for ${endpoint}`);
            return this.cache.get(cacheKey);
        }

        const url = `${this.apiBase}${endpoint}`;
        console.log(` Making API call to: ${url}`);

        try {
            const response = await fetch(url);
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(` Data received for ${endpoint}:`, data);
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error(` API call failed for ${endpoint}:`, error);
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

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-content">${message}</span>
            <button class="toast-close" aria-label="Close">✕</button>
        `;
        
        // Add to container
        container.appendChild(toast);
        
        // Close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        });
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    hideToast() {
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        });
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
        if (amount === null || amount === undefined) return '-';
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
