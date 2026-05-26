/* =============================================
   DASHBOARD.JS — Dashboard Chart Management
   ============================================= */

let _dashboardCharts = [];

function generateDashboard(data, roles) {
  clearDashboard();
  
  // Generate KPI cards
  const kpis = computeKPIs(data, roles);
  renderKPICards(kpis);
  
  // Auto-generate recommended charts
  const suggestions = autoDetectCharts(data, roles);
  suggestions.forEach((suggestion, index) => {
    addChartToDashboard(suggestion, data, index);
  });
}

function renderKPICards(kpis) {
  const kpiGrid = document.getElementById('kpiGrid');
  kpiGrid.innerHTML = '';
  
  kpis.forEach((kpi, index) => {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.style.setProperty('--kpi-color', kpi.color);
    card.style.animation = `slideUp 0.3s ease ${index * 0.05}s both`;
    
    card.innerHTML = `
      <div class="kpi-icon">${kpi.icon || '📊'}</div>
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-value">${kpi.value}</div>
      <div class="kpi-sub">${kpi.sub}</div>
    `;
    
    kpiGrid.appendChild(card);
  });
}

function addChartToDashboard(config, data, index) {
  const chartId = `dashboard-chart-${generateRandomId()}`;
  
  const blockElement = document.createElement('div');
  blockElement.className = 'chart-block';
  blockElement.style.animation = `slideUp 0.35s ease ${0.1 + index * 0.05}s both`;
  
  const chartColors = PALETTES[0].colors;
  const chartConfig = buildChartConfig(
    config.type,
    data,
    chartColors,
    config.xKey,
    config.yKey,
    config.groupKey,
    config.agg
  );

  if (!chartConfig) return;

  blockElement.innerHTML = `
    <div class="chart-block-header">
      <div class="chart-block-title">${config.title}</div>
      <button class="chart-block-download" data-chart-id="${chartId}" title="Download chart">
        ⬇ PNG
      </button>
    </div>
    <div class="chart-block-body" id="${chartId}"></div>
  `;

  document.getElementById('dashboardChartsGrid').appendChild(blockElement);
  
  renderChart(chartId, chartConfig);
  _dashboardCharts.push({ chartId, config, blockElement });

  // Add download handler
  blockElement.querySelector('.chart-block-download').addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target.closest('.chart-block-download');
    const cId = btn.dataset.chartId;
    await exportChartPNG(cId, `${config.title || 'chart'}.png`);
  });
}

function clearDashboard() {
  // Clear KPI cards
  const kpiGrid = document.getElementById('kpiGrid');
  kpiGrid.innerHTML = '';

  // Clear dashboard charts
  _dashboardCharts.forEach(item => {
    destroyChart(item.chartId);
    item.blockElement.remove();
  });
  _dashboardCharts = [];

  // Clear charts grid
  document.getElementById('dashboardChartsGrid').innerHTML = '';
}

function removeDashboardChart(chartId) {
  const index = _dashboardCharts.findIndex(c => c.chartId === chartId);
  if (index > -1) {
    destroyChart(chartId);
    _dashboardCharts[index].blockElement.remove();
    _dashboardCharts.splice(index, 1);
  }
}

function getDashboardCharts() {
  return _dashboardCharts;
}

async function exportDashboard() {
  try {
    showSpinner(true);
    const dashboardElement = document.querySelector('.view-container');
    
    const canvas = await html2canvas(dashboardElement, {
      backgroundColor: '#0d0f12',
      scale: 1.5,
      logging: false,
      useCORS: true,
    });
    
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `dashboard-${new Date().getTime()}.png`;
    link.click();
    
    showToast('✓ Dashboard exported successfully!', 'success');
  } catch (err) {
    console.error('Dashboard export error:', err);
    showToast('Error exporting dashboard', 'error');
  } finally {
    showSpinner(false);
  }
}

function getChartBlockElement(chartId) {
  const chart = _dashboardCharts.find(c => c.chartId === chartId);
  return chart ? chart.blockElement : null;
}
