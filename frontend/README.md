### Urban Mobility Data Explorer — Frontend

This folder contains the client-side application for Urban Mobility Data Explorer. It is a static, dependency-free frontend that consumes the backend API to display dashboards, charts, tables, and insights about trips, vendors, and locations.

---

## Quick start

1. Ensure the backend is running and reachable (default expected URL: `http://127.0.0.1:8000`).
2. Open `index.html` directly in a modern browser, or serve this directory with a simple HTTP server to avoid CORS/file protocol issues.

Examples:

```bash
# Python 3 (from this folder)
python -m http.server 5500
# Then open: http://localhost:5500/
```

If your backend runs at a non-default URL, update the API base in `js/main.js`:

```js
// js/main.js
this.apiBase = 'http://127.0.0.1:8000/api'; // change to your backend base
```

---

## Project structure

- `index.html`: Main HTML shell, sections, and view containers.
- `css/styles.css`: Design system (CSS variables), responsive layout, components, animations.
- `js/main.js`: Core application logic (`UrbanMobilityApp`): routing, data fetching, rendering.
- `js/charts.js`: Chart rendering (`DataVisualizer`) powered by Chart.js.
- `urban_image.png`: Favicon/branding image.

---

## Runtime dependencies

- [Chart.js 4.x] is loaded via CDN in `index.html`.
- Google Fonts (Inter) via CDN.

No local build tools or package managers are required. Any modern browser is sufficient.

---

## How the app works

### Views/sections (in `index.html`)

- `Dashboard` (`#dashboard`)
  - KPI metric cards: Total Trips, Active Vendors, Total Revenue, Avg Trip Duration.
  - Charts:
    - Trip Volume Over Time (`#trip-volume-chart`)
    - Vendor Performance (`#vendor-performance-chart`)

- `Trips` (`#trips`)
  - Filter panel: free-text search, vendor filter, date range, sorting, pagination, items-per-page.
  - Data table of trips with sortable columns.

- `Vendors` (`#vendors`)
  - Grid of vendor cards with “View Trips” actions.

- `Locations` (`#locations`)
  - Grid of location cards; their pagination and items-per-page controls.

- `Insights` (`#insights`)
  - Analytical cards for system overview and top vendors.

UI chrome: sticky header, navigation buttons (switch sections), toast notifications, and a global loading overlay.

### Core classes

- `UrbanMobilityApp` (`js/main.js`)
  - State: current section, pagination, filters, sorting, simple in-memory cache.
  - Lifecycle: `init()` → listeners, initial data load (`loadInitialData()`), theme/scroll effects.
  - Data fetching: `apiCall(endpoint)` wraps `fetch` to the configured `apiBase` and caches results per-endpoint.
  - Rendering: updates metric cards, tables/grids, insights, and pagination text.
  - UX: loading overlays, shimmer skeletons, errors, and toast messages.

- `DataVisualizer` (`js/charts.js`)
  - Reads app data via `app.apiCall()`.
  - Renders:
    - Line chart for trip volume aggregated by hour of day.
    - Bar chart for top vendor performance (trip counts and revenue in tooltip).
  - Exposes `updateCharts()` to refresh after data changes.

### Styling system

`css/styles.css` defines a tokenized design system via CSS variables: colors, spacing, radii, shadows, and transitions. Components include: header, navigation, metric cards, charts, filter panel, inputs, data table, vendor/location cards, pagination, insights, loaders (skeleton/shimmer), and toasts. Responsive breakpoints target ~1200px, 768px, 480px, and 360px.

---

## Backend API expectations

Set the base URL in `js/main.js` via `this.apiBase` (defaults to `http://127.0.0.1:8000/api`). The frontend expects the following endpoints to exist and return JSON:

- `GET /insights/overview`
  - Example fields: `total_trips`, `unique_vendors`, `unique_locations`, `avg_base_fare`.

- `GET /trips/summary`
  - Example fields: `total_revenue`, `avg_trip_duration_minutes`.

- `GET /vendors`
  - Returns array of vendors: `{ vendor_id, vendor_name? }[]`.

- `GET /locations?limit={n}&offset={m}`
  - Returns array of locations: `{ location_id, borough?, zone? }[]`.

- `GET /trips?limit={n}&offset={m}&vendor_id?=&search?=&start_date?=&end_date?=&sort_by?=&sort_order?=`
  - Returns array of trips with fields used by the table (e.g., `trip_id`, `vendor_id`, `pickup_datetime`, `dropoff_datetime`, `trip_miles`, `trip_duration_hours`, `base_passenger_fare`, `average_speed_mph`).

- `GET /insights/top-vendors?limit={n}`
  - Returns array: `{ vendor_id, trip_count, total_revenue }[]`.

If your backend uses different paths or fields, adjust the renderers and the `apiCall` consumers accordingly.

---

## Configuration and customization

- API base URL: edit `this.apiBase` in `js/main.js`.
- Theme: a light/dark theme attribute is toggled via `data-theme` on `html` (persisted in `localStorage`); extend CSS variables to fully support light theme if needed.
- Page sizes: `pageSize` and `locationsPageSize` in `js/main.js`, plus the default options in the corresponding `<select>` elements in `index.html`.
- Sorting: table header `th.sortable[data-sort]` keys must match the backend’s `sort_by` fields.
- Charts: customize colors in `DataVisualizer.colors` in `js/charts.js`.

---

## Development tips

- Prefer running via a local HTTP server to avoid browser restrictions for `file://`.
- Use the browser devtools network tab to inspect API calls and CORS.
- The app uses a simple per-endpoint cache; call `Refresh` (hooked to `refreshData()` if a button with id `refresh-btn` exists) or hard-reload to bust cache.
- The UI shows detailed console logs for fetches and errors; check the console when debugging.

---

## Deployment

Because the frontend is static:

- Any static host works (e.g., Nginx, GitHub Pages, Netlify, Cloudflare Pages).
- Ensure the backend is accessible from the deployed origin and that CORS is enabled server-side.
- Optionally, inject the API base URL at deploy time using an environment-specific `main.js` or a small inline script that sets `window.API_BASE` and reads it in `main.js`.

---

## Troubleshooting

- Blank dashboard or errors fetching data
  - Verify backend is running and reachable at `this.apiBase`.
  - Open devtools → Network; confirm 2xx responses and correct CORS headers.

- Charts not rendering
  - Ensure Chart.js CDN loads (no adblock/CDN errors), and that the `<canvas>` elements exist in the active section.

- Filters seem unresponsive
  - Look for console errors. Many inputs trigger `loadTrips()` on change; ensure the related elements exist in the DOM for the current section.

- Pagination text says “many”
  - The backend does not currently return total counts; the UI displays a friendly placeholder. Enhance your API to return totals and update `updatePagination()`/`updateLocationsPagination()` accordingly.

---

## License

See repository-level `README.md` for licensing and overall project details.


