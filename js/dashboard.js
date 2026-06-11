/* =============================================
   DASHBOARD — Quản lý dashboard & chart blocks
   Phụ thuộc: config.js, utils.js, data.js, charts.js

   Để mở rộng:
   - Thêm loại card mới: sửa renderKPICards()
   - Thêm nút mới trên chart block: sửa addChartToDashboard()
   - Thêm format export mới: thêm hàm exportXxx()
   ============================================= */

let _dashboardCharts = [];

// ── Generate ───────────────────────────────────
function generateDashboard(data, roles) {
  clearDashboard();
  renderKPICards(computeKPIs(data, roles));
  autoDetectCharts(data, roles).forEach((s, i) => addChartToDashboard(s, data, i));
}

// ── KPI cards ──────────────────────────────────
function renderKPICards(kpis) {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  kpis.forEach((kpi, i) => {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.style.setProperty('--kpi-color', kpi.color);
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="kpi-icon">${kpi.icon || '📊'}</div>
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-value">${kpi.value}</div>
      <div class="kpi-sub">${kpi.sub}</div>`;
    grid.appendChild(card);
  });
}

// ── Chart block helpers ────────────────────────
function getAlternativeTypes(currentType) {
  const groups = {
    line:           ['line','area','column','bar'],
    area:           ['area','line','column','bar'],
    bar:            ['bar','column','line','area'],
    column:         ['column','bar','line','area'],
    'column-single':['column-single','column','bar'],
    'column-group': ['column-group','column','bar'],
    combo:          ['combo','line','column'],
    pie:            ['pie','donut'],
    donut:          ['donut','pie'],
    scatter:        ['scatter'],
    radar:          ['radar'],
    boxplot:        ['boxplot'],
  };
  return (groups[currentType] || [currentType]).slice(0, 4);
}

// ── Add chart block to dashboard ───────────────
function addChartToDashboard(config, data, index) {
  const chartId = `dc-${generateId()}`;
  const colors  = PALETTES[index % PALETTES.length].colors;
  const chartConfig = buildChartConfig(
    config.type, data, colors,
    config.xKey, config.yKey, config.groupKey, config.agg, config.y2Key
  );
  if (!chartConfig) return;

  const block = document.createElement('div');
  block.className = 'chart-block';
  block.style.animationDelay = `${0.1 + index * 0.06}s`;
  block.dataset.chartId = chartId;

  const switchBtns = getAlternativeTypes(config.type).map(t => {
    const ct = CHART_TYPES.find(c => c.id === t);
    return ct
      ? `<button class="chart-switch-btn${t === config.type ? ' active' : ''}" data-type="${t}">${ct.icon} ${ct.label}</button>`
      : '';
  }).join('');

  block.innerHTML = `
    <div class="chart-block-header">
      <input class="chart-title-input" value="${config.title}" title="Nhấn để sửa tiêu đề">
      <div class="chart-block-actions">
        <button class="chart-block-btn" data-action="download" title="Tải ảnh">⬇ PNG</button>
        <button class="chart-block-btn danger" data-action="remove" title="Xóa">✕</button>
      </div>
    </div>
    <div class="chart-block-body" id="${chartId}"></div>
    <div class="chart-switch-row">
      <span class="chart-switch-label">Đổi kiểu:</span>
      ${switchBtns}
    </div>`;

  document.getElementById('dashboardChartsGrid').appendChild(block);
  renderChart(chartId, chartConfig);
  _dashboardCharts.push({ chartId, config: { ...config }, block });

  // Edit title
  block.querySelector('.chart-title-input').addEventListener('change', e => {
    const dc = _dashboardCharts.find(c => c.chartId === chartId);
    if (dc) dc.config.title = e.target.value;
  });

  // Switch chart type
  block.querySelectorAll('.chart-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newType = btn.dataset.type;
      const dc = _dashboardCharts.find(c => c.chartId === chartId);
      if (!dc) return;
      dc.config.type = newType;
      const newColors = PALETTES[_dashboardCharts.indexOf(dc) % PALETTES.length].colors;
      const newCfg = buildChartConfig(newType, data, newColors, dc.config.xKey, dc.config.yKey, dc.config.groupKey, dc.config.agg, dc.config.y2Key);
      if (newCfg) {
        renderChart(chartId, newCfg);
        block.querySelectorAll('.chart-switch-btn').forEach(b => b.classList.toggle('active', b.dataset.type === newType));
        showToast(`✓ Đổi sang ${newType}`, 'info', 1500);
      }
    });
  });

  // Download
  block.querySelector('[data-action="download"]').addEventListener('click', async () => {
    await exportChartPNG(chartId, `${config.title || 'chart'}.png`);
  });

  // Remove
  block.querySelector('[data-action="remove"]').addEventListener('click', () => {
    destroyChart(chartId);
    block.remove();
    _dashboardCharts = _dashboardCharts.filter(c => c.chartId !== chartId);
    showToast('Đã xóa biểu đồ', 'info', 1500);
  });
}

// ── Clear ──────────────────────────────────────
function clearDashboard() {
  _dashboardCharts.forEach(item => { destroyChart(item.chartId); item.block.remove(); });
  _dashboardCharts = [];
  document.getElementById('kpiGrid').innerHTML = '';
  document.getElementById('dashboardChartsGrid').innerHTML = '';
}

// ── Export ─────────────────────────────────────
async function exportDashboard() {
  try {
    showSpinner(true);
    const el     = document.getElementById('view-dashboard');
    const canvas = await html2canvas(el, { backgroundColor:'#0d0f12', scale:2, logging:false, useCORS:true });
    const link   = document.createElement('a');
    link.href     = canvas.toDataURL('image/png');
    link.download = `dashboard-${Date.now()}.png`;
    link.click();
    showToast('✓ Xuất dashboard thành công!', 'success');
  } catch(err) {
    showToast('Lỗi khi xuất dashboard: ' + err.message, 'error');
  } finally { showSpinner(false); }
}

async function exportAllCharts() {
  showSpinner(true);
  let count = 0;
  for (const dc of _dashboardCharts) {
    const ok = await exportChartPNG(dc.chartId, `${dc.config.title || 'chart'}-${count + 1}.png`);
    if (ok) count++;
    await new Promise(r => setTimeout(r, 400));
  }
  showSpinner(false);
  showToast(`✓ Đã xuất ${count} biểu đồ`, 'success');
}
