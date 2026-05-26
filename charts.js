/* =============================================
   CHARTS.JS — Chart Building & Rendering
   ============================================= */

let _charts = {};
const MAX_CHARTS = 10;

function buildChartConfig(type, data, colors, xKey, yKey, groupKey, method) {
  const baseOptions = JSON.parse(JSON.stringify(APEX_BASE));
  baseOptions.colors = colors;

  switch (type) {
    case 'line':
      return buildLineChart(data, baseOptions, xKey, yKey, groupKey, method);
    case 'area':
      return buildAreaChart(data, baseOptions, xKey, yKey, groupKey, method);
    case 'bar':
      return buildBarChart(data, baseOptions, xKey, yKey, groupKey, method);
    case 'column':
      return buildColumnChart(data, baseOptions, xKey, yKey, groupKey, method);
    case 'pie':
      return buildPieChart(data, baseOptions, xKey, yKey, method);
    case 'donut':
      return buildDonutChart(data, baseOptions, xKey, yKey, method);
    case 'scatter':
      return buildScatterChart(data, baseOptions, xKey, yKey);
    case 'radar':
      return buildRadarChart(data, baseOptions, xKey, yKey, groupKey, method);
    case 'boxplot':
      return buildBoxPlotChart(data, baseOptions, xKey, yKey);
    default:
      return null;
  }
}

// ── Line Chart ────────────────────────────────
function buildLineChart(data, baseOptions, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'line' },
    series: agg.series,
    xaxis: {
      categories: agg.categories,
      title: { text: xKey },
    },
    yaxis: {
      title: { text: yKey },
    },
    stroke: { curve: 'smooth', width: 2.5 },
    markers: { size: 4 },
  };
}

// ── Area Chart ────────────────────────────────
function buildAreaChart(data, baseOptions, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'area' },
    series: agg.series,
    xaxis: {
      categories: agg.categories,
      title: { text: xKey },
    },
    yaxis: {
      title: { text: yKey },
    },
    fill: { opacity: 0.3 },
    stroke: { curve: 'smooth', width: 2 },
  };
}

// ── Bar Chart ─────────────────────────────────
function buildBarChart(data, baseOptions, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'bar' },
    series: agg.series,
    xaxis: {
      categories: agg.categories,
      title: { text: xKey },
    },
    yaxis: {
      title: { text: yKey },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: { position: 'top' },
      },
    },
  };
}

// ── Column Chart ──────────────────────────────
function buildColumnChart(data, baseOptions, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'bar' },
    series: agg.series,
    xaxis: {
      categories: agg.categories,
      title: { text: xKey },
    },
    yaxis: {
      title: { text: yKey },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '75%',
        dataLabels: { position: 'top' },
      },
    },
  };
}

// ── Pie Chart ─────────────────────────────────
function buildPieChart(data, baseOptions, xKey, yKey, method) {
  const dist = countByCategory(data, xKey, yKey, method);
  if (!dist || !dist.labels.length) return null;

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'pie' },
    series: dist.values,
    labels: dist.labels,
    plotOptions: {
      pie: {
        dataLabels: { 
          enabled: true,
          formatter: (val) => roundNumber(val, 1) + '%'
        },
      },
    },
  };
}

// ── Donut Chart ───────────────────────────────
function buildDonutChart(data, baseOptions, xKey, yKey, method) {
  const dist = countByCategory(data, xKey, yKey, method);
  if (!dist || !dist.labels.length) return null;

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'donut' },
    series: dist.values,
    labels: dist.labels,
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: { fontSize: '16px' },
            value: { fontSize: '14px' },
          },
        },
      },
    },
  };
}

// ── Scatter Chart ─────────────────────────────
function buildScatterChart(data, baseOptions, xKey, yKey) {
  const points = data
    .map(row => {
      const x = Number(row[xKey]);
      const y = Number(row[yKey]);
      return !isNaN(x) && !isNaN(y) ? [x, y] : null;
    })
    .filter(p => p !== null);

  if (!points.length) return null;

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'scatter', zoom: { enabled: true } },
    series: [{ name: yKey, data: points }],
    xaxis: { title: { text: xKey } },
    yaxis: { title: { text: yKey } },
  };
}

// ── Radar Chart ───────────────────────────────
function buildRadarChart(data, baseOptions, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'radar' },
    series: agg.series,
    xaxis: {
      categories: agg.categories,
    },
    plotOptions: {
      radar: {
        size: 140,
        polygons: {
          strokeColors: 'rgba(255,255,255,0.05)',
          fill: { colors: ['rgba(255,255,255,0.02)'] },
        },
      },
    },
  };
}

// ── Box Plot Chart ────────────────────────────
function buildBoxPlotChart(data, baseOptions, xKey, yKey) {
  // Group data by xKey and calculate quartiles
  const grouped = {};
  data.forEach(row => {
    const x = String(row[xKey] ?? '—').trim();
    const y = Number(row[yKey]) || 0;
    if (!grouped[x]) grouped[x] = [];
    grouped[x].push(y);
  });

  const series = [{
    name: yKey,
    type: 'boxPlot',
    data: Object.keys(grouped).map(x => {
      const vals = grouped[x].sort((a, b) => a - b);
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      return [Math.min(...vals), q1, vals[Math.floor(vals.length / 2)], q3, Math.max(...vals)];
    }),
  }];

  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'boxPlot' },
    series: series,
    xaxis: { categories: Object.keys(grouped) },
  };
}

// ── Render Chart ──────────────────────────────
function renderChart(containerId, chartConfig) {
  if (!chartConfig) return null;
  
  const container = document.getElementById(containerId);
  if (!container) return null;

  if (_charts[containerId]) {
    _charts[containerId].destroy();
  }

  const chart = new ApexCharts(container, chartConfig);
  chart.render();
  _charts[containerId] = chart;
  
  return chart;
}

// ── Update Chart ──────────────────────────────
function updateChart(chartId, newSeries) {
  if (_charts[chartId]) {
    _charts[chartId].updateSeries(newSeries);
  }
}

// ── Destroy Chart ─────────────────────────────
function destroyChart(chartId) {
  if (_charts[chartId]) {
    _charts[chartId].destroy();
    delete _charts[chartId];
  }
}

// ── Get Active Chart ──────────────────────────
function getActiveChart() {
  const chart = _charts['customChartContainer'];
  return chart ? chart : null;
}

// ── Clear All Charts ──────────────────────────
function clearAllCharts() {
  Object.keys(_charts).forEach(id => {
    if (_charts[id]) _charts[id].destroy();
  });
  _charts = {};
}

// ── Export Chart as PNG ───────────────────────
async function exportChartPNG(chartId, filename = 'chart.png') {
  return new Promise((resolve) => {
    const chart = _charts[chartId];
    if (!chart) {
      showToast('Chart not found', 'error');
      resolve(false);
      return;
    }

    chart.dataURI().then(({ imgURI }) => {
      const link = document.createElement('a');
      link.href = imgURI;
      link.download = filename;
      link.click();
      showToast('✓ Chart exported!', 'success');
      resolve(true);
    }).catch(err => {
      console.error('Export error:', err);
      showToast('Error exporting chart', 'error');
      resolve(false);
    });
  });
}
