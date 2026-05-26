/* =============================================
   UI.JS — UI Event Handlers & Interactions
   ============================================= */

// ── Sidebar & Navigation ──────────────────────
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active view
      const viewId = `view-${btn.dataset.view}`;
      views.forEach(v => v.classList.remove('active'));
      const targetView = document.getElementById(viewId);
      if (targetView) {
        targetView.classList.add('active');
        updateTopbarTitle(btn.dataset.view);
      }
    });
  });
}

function updateTopbarTitle(view) {
  const titles = {
    dashboard: '📊 Dashboard Overview',
    charts: '🎨 Chart Builder',
    table: '📋 Data Table'
  };
  document.getElementById('topbarTitle').textContent = titles[view] || 'DataViz Pro';
}

// ── Sidebar Toggle ───────────────────────────
function setupSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}

// ── Chart Type Selection ──────────────────────
function setupChartTypeGrid() {
  const grid = document.getElementById('chartTypeGrid');
  let selectedType = 'line';

  CHART_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.className = `chart-type-btn ${type.id === 'line' ? 'selected' : ''}`;
    btn.dataset.type = type.id;
    btn.title = type.desc;
    
    btn.innerHTML = `
      <div class="chart-type-icon">${type.icon}</div>
      <div class="chart-type-label">${type.label}</div>
    `;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => {
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
      selectedType = type.id;
    });

    grid.appendChild(btn);
  });

  return () => selectedType;
}

let getSelectedChartType = setupChartTypeGrid();

// ── Palette Selection ────────────────────────
function setupPaletteGrid() {
  const grid = document.getElementById('paletteGrid');
  let selectedPalette = PALETTES[0];

  PALETTES.forEach((palette, index) => {
    const btn = document.createElement('button');
    btn.className = `palette-btn ${index === 0 ? 'selected' : ''}`;
    btn.style.background = palette.swatch;
    btn.title = palette.name;
    btn.dataset.paletteId = palette.id;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => {
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
      selectedPalette = palette;
    });

    grid.appendChild(btn);
  });

  return () => selectedPalette;
}

let getSelectedPalette = setupPaletteGrid();

// ── Column Selectors ──────────────────────────
function populateColumnSelects(columns, roles) {
  const xSelect = document.getElementById('xAxisSelect');
  const ySelect = document.getElementById('yAxisSelect');
  const groupSelect = document.getElementById('groupSelect');

  [xSelect, ySelect, groupSelect].forEach(select => {
    select.innerHTML = '<option value="">— Select column —</option>';
    columns.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      select.appendChild(opt);
    });
  });

  // Pre-select sensible defaults
  const numCols = columns.filter(c => roles[c] === 'numeric');
  const catCols = columns.filter(c => roles[c] === 'category');

  if (catCols.length > 0) xSelect.value = catCols[0];
  if (numCols.length > 0) ySelect.value = numCols[0];
  if (catCols.length > 1) groupSelect.value = '';
}

// ── Data Table ────────────────────────────────
function renderDataTable(data) {
  const table = document.getElementById('dataTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  if (!data || !data.length) {
    thead.innerHTML = '';
    tbody.innerHTML = '';
    return;
  }

  // Headers
  const columns = Object.keys(data[0]);
  thead.innerHTML = '';
  const headerRow = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Body
  tbody.innerHTML = '';
  const displayData = data.slice(0, 1000); // Limit to 1000 rows for performance
  
  displayData.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      const value = row[col];
      const isNumeric = !isNaN(Number(value)) && value !== '';
      
      if (isNumeric) td.classList.add('numeric');
      td.textContent = value ?? '—';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // Update count
  const count = document.getElementById('tableCount');
  count.textContent = `${displayData.length} of ${data.length} rows`;
}

// ── Table Search ─────────────────────────────
function setupTableSearch() {
  const searchInput = document.getElementById('tableSearch');
  let fullData = getRawData();

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    
    if (!query) {
      renderDataTable(fullData);
      return;
    }

    const filtered = fullData.filter(row => {
      return Object.values(row).some(val => {
        return String(val).toLowerCase().includes(query);
      });
    });

    renderDataTable(filtered);
  });
}

// ── Chart Builder ────────────────────────────
function setupChartBuilder() {
  const buildBtn = document.getElementById('buildChartBtn');
  const addBtn = document.getElementById('addToDashboardBtn');
  const downloadBtn = document.getElementById('downloadChartBtn');

  buildBtn.addEventListener('click', buildCustomChart);
  addBtn.addEventListener('click', addCustomChartToDashboard);
  downloadBtn.addEventListener('click', downloadCustomChart);
}

function buildCustomChart() {
  const chartType = getSelectedChartType();
  const palette = getSelectedPalette();
  const xKey = document.getElementById('xAxisSelect').value;
  const yKey = document.getElementById('yAxisSelect').value;
  const groupKey = document.getElementById('groupSelect').value || null;
  const method = document.getElementById('aggSelect').value;
  const data = getRawData();

  // Validate
  const validation = validateChartData(xKey, yKey, data);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    return;
  }

  // Build chart
  const chartConfig = buildChartConfig(
    chartType,
    data,
    palette.colors,
    xKey,
    yKey,
    groupKey,
    method
  );

  if (!chartConfig) {
    showToast('Unable to create chart with selected data', 'error');
    return;
  }

  // Render
  document.getElementById('previewEmpty').style.display = 'none';
  renderChart('customChartContainer', chartConfig);

  // Show action buttons
  document.getElementById('chartActions').style.display = 'flex';
  
  showToast('✓ Chart created!', 'success');
}

function addCustomChartToDashboard() {
  const data = getRawData();
  if (!data.length) return;

  const config = {
    type: getSelectedChartType(),
    xKey: document.getElementById('xAxisSelect').value,
    yKey: document.getElementById('yAxisSelect').value,
    groupKey: document.getElementById('groupSelect').value || null,
    agg: document.getElementById('aggSelect').value,
    title: `${document.getElementById('yAxisSelect').value || 'Value'} Analysis`
  };

  addChartToDashboard(config, data, _dashboardCharts.length);
  showToast('✓ Chart added to dashboard!', 'success');
  
  // Switch to dashboard view
  document.querySelector('[data-view="dashboard"]').click();
}

async function downloadCustomChart() {
  await exportChartPNG('customChartContainer', 'custom-chart.png');
}

// ── File Upload ───────────────────────────────
function setupFileUpload() {
  const fileInput = document.getElementById('excelFile');
  const fileInfo = document.getElementById('fileInfo');

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showSpinner(true);
      const { rows, sheetName } = await parseExcel(file);

      if (!rows || !rows.length) {
        showToast('Excel file is empty', 'error');
        return;
      }

      // Load data
      setSheetName(sheetName);
      const result = loadData(rows);

      // Update UI
      fileInfo.textContent = `📄 ${file.name}`;
      populateColumnSelects(result.columns, result.roles);
      
      // Generate dashboard
      generateDashboard(rows, result.roles);
      renderDataTable(rows);
      setupTableSearch();

      // Enable export button
      document.getElementById('exportDashboardBtn').disabled = false;

      // Switch to dashboard
      document.querySelector('[data-view="dashboard"]').click();

      showToast(`✓ Loaded ${rows.length} rows from ${sheetName}`, 'success');
    } catch (err) {
      console.error('Load error:', err);
      showToast('Error loading file: ' + err.message, 'error');
    } finally {
      showSpinner(false);
    }
  });
}

// ── Export Dashboard ──────────────────────────
function setupExportButtons() {
  document.getElementById('exportDashboardBtn').addEventListener('click', async () => {
    if (getRawData().length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    await exportDashboard();
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    const data = getRawData();
    if (!data.length) {
      showToast('No data loaded', 'error');
      return;
    }
    const roles = getRoles();
    generateDashboard(data, roles);
    showToast('✓ Dashboard refreshed', 'success');
  });
}

// ── Initialize UI ────────────────────────────
function initializeUI() {
  setupNavigation();
  setupSidebarToggle();
  setupChartBuilder();
  setupFileUpload();
  setupExportButtons();
}
