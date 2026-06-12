/* =============================================
   UI — Tương tác người dùng & setup giao diện
   Phụ thuộc: config.js, utils.js, data.js,
              charts.js, dashboard.js

   Để mở rộng:
   - Thêm view mới: thêm case vào setupNavigation()
   - Thêm option export: thêm listener vào setupExportModal()
   - Thêm filter table: sửa setupTable()
   ============================================= */

// ── Navigation ─────────────────────────────────
function setupNavigation() {
  const titles = {
    dashboard: '📊 Dashboard Overview',
    charts:    '🎨 Chart Builder',
    table:     '📋 Data Table',
  };
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const target = document.getElementById(`view-${btn.dataset.view}`);
      if (target) target.classList.add('active');
      document.getElementById('topbarTitle').textContent = titles[btn.dataset.view] || 'DataViz Pro';
      if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    });
  });
}

// ── Sidebar toggle ─────────────────────────────
function setupSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('main');

  toggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('collapsed');
      main.style.marginLeft = sidebar.classList.contains('collapsed') ? '0' : 'var(--sidebar-w)';
    }
  });
}

// ── File upload & sheet selector ───────────────
function setupFileUpload() {
  document.getElementById('excelFile').addEventListener('change', e => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
  });

  // Drag & drop
  document.addEventListener('dragover', e => {
    e.preventDefault();
    document.getElementById('dragOverlay').classList.add('show');
  });
  document.addEventListener('dragleave', e => {
    if (!e.relatedTarget) document.getElementById('dragOverlay').classList.remove('show');
  });
  document.addEventListener('drop', e => {
    e.preventDefault();
    document.getElementById('dragOverlay').classList.remove('show');
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) loadFile(file);
    else showToast('Chỉ hỗ trợ .xlsx, .xls, .csv', 'error');
  });

  // Sheet switcher được thay bằng Sheet Picker modal (js/sheet-picker.js)
  // Nút "Đổi sheet" trong sidebar có thể mở lại picker nếu cần
}

// Trạng thái file hiện tại — dùng lại khi đổi sheet
let _pendingFileName = '';

async function loadFile(file) {
  if (!file) return;
  try {
    showSpinner(true);
    const wb = await parseExcelFile(file);  // lưu vào _workbook trong data.js
    showSpinner(false);

    _pendingFileName = file.name;
    document.getElementById('fileInfo').textContent = `📄 ${file.name}`;

    // Hiện nút "Đổi sheet" nếu có nhiều sheet
    _updateSwitchBtn(wb);

    // Auto-load sheet đầu tiên ngay lập tức — không cần picker
    const firstSheet = wb.SheetNames[0];
    _autoLoadSheet(wb, firstSheet);

  } catch(err) {
    showSpinner(false);
    showToast('Lỗi: ' + err.message, 'error');
    console.error(err);
  }
}

/**
 * Tự động nhận diện bảng trong sheet và load bảng lớn nhất (không hỏi user)
 */
function _autoLoadSheet(wb, sheetName) {
  showSpinner(true);
  setTimeout(() => {
    try {
      const tables = detectTablesInSheet(wb, sheetName);

      if (!tables.length) {
        // Fallback: dùng sheet_to_json thông thường nếu detector không tìm thấy
        const rows = parseSheet(wb, sheetName);
        showSpinner(false);
        if (!rows.length) { showToast('Sheet không có dữ liệu', 'error'); return; }
        _applyTableData(rows, sheetName, null);
        return;
      }

      // Lấy bảng lớn nhất (index 0 vì đã sort theo size)
      const best = tables[0];
      showSpinner(false);
      _applyTableData(best.rows, sheetName, best);

      // Nếu sheet có nhiều bảng, gợi ý người dùng
      if (tables.length > 1) {
        showToast(
          `Tìm thấy ${tables.length} bảng trong "${sheetName}" — đã chọn bảng lớn nhất. Nhấn "Đổi sheet/bảng" để chọn lại.`,
          'info', 5000
        );
      }
    } catch(err) {
      showSpinner(false);
      showToast('Lỗi đọc sheet: ' + err.message, 'error');
      console.error(err);
    }
  }, 30);
}

/**
 * Áp dụng dữ liệu bảng đã chọn vào toàn bộ app
 */
function _applyTableData(rows, sheetName, tableInfo) {
  if (!rows || !rows.length) {
    showToast('Bảng dữ liệu rỗng', 'error');
    return;
  }

  setSheetName(sheetName);
  const result = loadData(rows);

  populateColumnSelects(result.columns, result.roles);
  generateDashboard(rows, result.roles);
  renderDataTable(rows);

  document.getElementById('exportDashboardBtn').disabled     = false;
  document.getElementById('refreshBtn').disabled             = false;
  document.getElementById('exportCsvBtn').disabled           = false;
  document.getElementById('dashHeaderActions').style.display = 'flex';

  // Tiêu đề dashboard: tên file + sheet + bảng
  const baseName   = _pendingFileName.replace(/\.[^.]+$/, '');
  const tableLabel = tableInfo ? ` › ${tableInfo.label}` : '';
  document.getElementById('dashboardTitle').textContent = `${baseName} › ${sheetName}${tableLabel}`;

  document.getElementById('sheetSelector').style.display = 'none';
  document.querySelector('[data-view="dashboard"]').click();

  const desc = tableInfo
    ? `${tableInfo.rowCount.toLocaleString()} dòng × ${tableInfo.colCount} cột`
    : `${rows.length.toLocaleString()} dòng`;
  showToast(`✓ "${sheetName}"${tableInfo ? ' — ' + tableInfo.label : ''} (${desc})`, 'success', 3500);
}

/**
 * Hiện / ẩn nút "Đổi sheet" tùy số lượng sheet
 * Nếu chỉ 1 sheet thì vẫn hiện để người dùng có thể đổi bảng
 */
function _updateSwitchBtn(wb) {
  const btn = document.getElementById('switchSheetBtn');
  if (!btn) return;
  btn.style.display = 'flex';
  btn.textContent   = wb.SheetNames.length > 1
    ? `🗂 ${wb.SheetNames.length} sheets`
    : '🗂 Đổi bảng';
}

/**
 * Mở Sheet Picker để chuyển sheet/bảng — gọi từ nút trên topbar
 */
function openSwitchPicker() {
  const wb = getWorkbook();
  if (!wb) { showToast('Chưa có file nào được tải', 'error'); return; }
  openSheetPicker(wb, (rows, sheetName, tableInfo) => {
    _applyTableData(rows, sheetName, tableInfo);
  });
}

// ── Column selects ─────────────────────────────
function populateColumnSelects(columns, roles) {
  const xSel  = document.getElementById('xAxisSelect');
  const ySel  = document.getElementById('yAxisSelect');
  const y2Sel = document.getElementById('y2AxisSelect');
  const gSel  = document.getElementById('groupSelect');

  [xSel, ySel, y2Sel].forEach(s => { s.innerHTML = '<option value="">— Chọn cột —</option>'; });
  gSel.innerHTML = '<option value="">— Không nhóm —</option>';

  columns.forEach(col => {
    const roleTag = { numeric:'[#]', date:'[D]', category:'[A]' }[roles[col]] || '';
    [xSel, ySel, y2Sel, gSel].forEach(s => {
      const o = document.createElement('option');
      o.value = col; o.textContent = `${roleTag} ${col}`;
      s.appendChild(o);
    });
  });

  const numCols  = columns.filter(c => roles[c] === 'numeric');
  const catCols  = columns.filter(c => roles[c] === 'category');
  const dateCols = columns.filter(c => roles[c] === 'date');
  if (catCols.length || dateCols.length) xSel.value = dateCols[0] || catCols[0];
  if (numCols.length)     ySel.value  = numCols[0];
  if (numCols.length > 1) y2Sel.value = numCols[1];
}

// ── Chart Builder UI ───────────────────────────
function setupChartTypeGrid() {
  const grid = document.getElementById('chartTypeGrid');
  let sel = 'column';

  CHART_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.className   = `chart-type-btn${type.id === sel ? ' selected' : ''}`;
    btn.dataset.type = type.id;
    btn.title       = type.desc;
    btn.innerHTML   = `<div class="chart-type-icon">${type.icon}</div><div>${type.label}</div>`;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      sel = type.id;
      // Combo: ẩn Group By, hiện Y2
      const y2group = document.getElementById('y2AxisGroup');
      const ggroup  = document.getElementById('groupFieldGroup');
      if (type.id === 'combo') {
        y2group.style.display = 'flex';
        ggroup.style.display  = 'none';
      } else {
        y2group.style.display = 'none';
        ggroup.style.display  = 'flex';
      }
    });
    grid.appendChild(btn);
  });

  return () => sel;
}

function setupPaletteGrid() {
  const grid = document.getElementById('paletteGrid');
  let sel = PALETTES[0];

  PALETTES.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className        = `palette-btn${i === 0 ? ' selected' : ''}`;
    btn.style.background = p.swatch;
    btn.title            = p.name;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      sel = p;
    });
    grid.appendChild(btn);
  });

  return () => sel;
}

let getSelectedChartType, getSelectedPalette;

function setupChartBuilder() {
  getSelectedChartType = setupChartTypeGrid();
  getSelectedPalette   = setupPaletteGrid();

  document.getElementById('buildChartBtn').addEventListener('click', buildCustomChart);

  document.getElementById('addToDashboardBtn').addEventListener('click', () => {
    const data = getRawData();
    if (!data.length) { showToast('Chưa có dữ liệu', 'error'); return; }
    const config = {
      type:     getSelectedChartType(),
      xKey:     document.getElementById('xAxisSelect').value,
      yKey:     document.getElementById('yAxisSelect').value,
      y2Key:    document.getElementById('y2AxisSelect').value || null,
      groupKey: document.getElementById('groupSelect').value || null,
      agg:      document.getElementById('aggSelect').value,
      title:    document.getElementById('chartTitleInput').value || `Biểu đồ ${_dashboardCharts.length + 1}`,
    };
    addChartToDashboard(config, data, _dashboardCharts.length);
    showToast('✓ Đã thêm vào Dashboard!', 'success');
    document.querySelector('[data-view="dashboard"]').click();
  });

  document.getElementById('downloadChartBtn').addEventListener('click', () =>
    exportChartPNG('customChartContainer', 'custom-chart.png'));
}

function buildCustomChart() {
  const chartType = getSelectedChartType();
  const palette   = getSelectedPalette();
  const xKey      = document.getElementById('xAxisSelect').value;
  const yKey      = document.getElementById('yAxisSelect').value;
  const groupKey  = document.getElementById('groupSelect').value || null;
  const y2Key     = document.getElementById('y2AxisSelect').value || null;
  const method    = document.getElementById('aggSelect').value;
  const data      = getRawData();

  if (!xKey)        { showToast('Vui lòng chọn trục X', 'error'); return; }
  if (!data.length) { showToast('Chưa có dữ liệu — hãy upload file trước', 'error'); return; }
  if (chartType === 'combo' && !y2Key) { showToast('Combo chart cần chọn cả Trục Y2', 'error'); return; }

  const cfg = buildChartConfig(chartType, data, palette.colors, xKey, yKey, groupKey, method, y2Key);
  if (!cfg) { showToast('Không thể tạo biểu đồ với dữ liệu đã chọn', 'error'); return; }

  document.getElementById('previewEmpty').style.display = 'none';
  renderChart('customChartContainer', cfg);
  document.getElementById('chartActions').style.display = 'flex';

  if (!document.getElementById('chartTitleInput').value)
    document.getElementById('chartTitleInput').value = `${yKey || xKey} theo ${xKey}`;

  showToast('✓ Biểu đồ đã được tạo!', 'success');
}

// ── Data Table ─────────────────────────────────
let _tableData = [], _sortCol = null, _sortDir = 'asc';

function renderDataTable(data) {
  _tableData = data;
  const table = document.getElementById('dataTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!data || !data.length) { thead.innerHTML = ''; tbody.innerHTML = ''; return; }

  const columns = Object.keys(data[0]);
  thead.innerHTML = '';
  const hr = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent  = col;
    th.dataset.col  = col;
    if (_sortCol === col) th.classList.add(_sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    th.addEventListener('click', () => sortTable(col));
    hr.appendChild(th);
  });
  thead.appendChild(hr);

  tbody.innerHTML = '';
  data.slice(0, 2000).forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td    = document.createElement('td');
      const val   = row[col];
      const isNum = !isNaN(Number(val)) && val !== '';
      if (isNum) td.classList.add('numeric');
      td.textContent = val ?? '—';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  document.getElementById('tableCount').textContent = `${Math.min(data.length, 2000)} / ${data.length} dòng`;
  document.getElementById('exportCsvBtn').disabled  = false;
}

function sortTable(col) {
  if (_sortCol === col) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
  else { _sortCol = col; _sortDir = 'asc'; }
  const sorted = [..._tableData].sort((a, b) => {
    const va = a[col], vb = b[col];
    const na = Number(va), nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb)) return _sortDir === 'asc' ? na - nb : nb - na;
    return _sortDir === 'asc'
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });
  renderDataTable(sorted);
}

function exportCSV() {
  const data = getRawData();
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  const rows = [
    cols.join(','),
    ...data.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type:'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href     = URL.createObjectURL(blob);
  link.download = `${_currentSheetName || 'data'}.csv`;
  link.click();
  showToast('✓ Xuất CSV thành công!', 'success');
}

function setupTable() {
  let searchTimer;
  document.getElementById('tableSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = e.target.value.toLowerCase();
      if (!q) { renderDataTable(getRawData()); return; }
      const filtered = getRawData().filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
      renderDataTable(filtered);
    }, 200);
  });
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
}

// ── Export modal ───────────────────────────────
function setupExportModal() {
  const overlay = document.getElementById('exportModal');
  document.getElementById('exportDashboardBtn').addEventListener('click', () => overlay.classList.add('show'));
  document.getElementById('exportModalClose').addEventListener('click',   () => overlay.classList.remove('show'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });

  document.getElementById('exportPNG').addEventListener('click', async () => {
    overlay.classList.remove('show'); await exportDashboard();
  });
  document.getElementById('exportAllCharts').addEventListener('click', async () => {
    overlay.classList.remove('show'); await exportAllCharts();
  });
  document.getElementById('exportCSVModal').addEventListener('click', () => {
    overlay.classList.remove('show'); exportCSV();
  });
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const data = getRawData();
    if (!data.length) { showToast('Chưa có dữ liệu', 'error'); return; }
    generateDashboard(data, getRoles());
    showToast('✓ Dashboard đã được làm mới', 'success');
  });
}
