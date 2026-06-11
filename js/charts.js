/* =============================================
   CHARTS — Xây dựng & render biểu đồ
   Phụ thuộc: config.js, utils.js, data.js

   Để thêm loại chart mới:
   1. Thêm entry vào CHART_TYPES trong config.js
   2. Viết hàm buildXxx() theo cùng pattern
   3. Thêm case vào buildChartConfig()
   ============================================= */

let _charts = {};

// ── Router ─────────────────────────────────────
function buildChartConfig(type, data, colors, xKey, yKey, groupKey, method, y2Key) {
  const base = JSON.parse(JSON.stringify(APEX_BASE));
  base.colors = colors;
  switch (type) {
    case 'line':          return buildLine(data, base, xKey, yKey, groupKey, method);
    case 'area':          return buildArea(data, base, xKey, yKey, groupKey, method);
    case 'bar':           return buildBar(data, base, xKey, yKey, groupKey, method);
    case 'column':        return buildColumn(data, base, xKey, yKey, groupKey, method);
    case 'column-single': return buildColumnSingle(data, base, xKey, yKey, method);
    case 'column-group':  return buildColumnGroup(data, base, xKey, yKey, groupKey, method);
    case 'combo':         return buildCombo(data, base, xKey, yKey, y2Key || groupKey, method);
    case 'pie':           return buildPie(data, base, xKey, yKey, method);
    case 'donut':         return buildDonut(data, base, xKey, yKey, method);
    case 'scatter':       return buildScatter(data, base, xKey, yKey);
    case 'radar':         return buildRadar(data, base, xKey, yKey, groupKey, method);
    case 'boxplot':       return buildBoxPlot(data, base, xKey, yKey);
    default: return null;
  }
}

// ── Chart builders ─────────────────────────────
function buildLine(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return {
    ...base,
    chart:  { ...base.chart, type:'line' },
    series: agg.series,
    xaxis:  { categories:agg.categories, title:{text:xKey}, labels:{rotate:-30} },
    yaxis:  { title:{text:yKey}, labels:{formatter:v=>formatNumber(v)} },
    stroke: { curve:'smooth', width:2.5 },
    markers:{ size:4 },
  };
}

function buildArea(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return {
    ...base,
    chart:  { ...base.chart, type:'area' },
    series: agg.series,
    xaxis:  { categories:agg.categories, title:{text:xKey}, labels:{rotate:-30} },
    yaxis:  { title:{text:yKey}, labels:{formatter:v=>formatNumber(v)} },
    fill:   { opacity:0.28 },
    stroke: { curve:'smooth', width:2 },
  };
}

function buildBar(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return {
    ...base,
    chart:       { ...base.chart, type:'bar' },
    series:      agg.series,
    xaxis:       { categories:agg.categories, title:{text:yKey} },
    yaxis:       { labels:{formatter:v=>formatNumber(v)} },
    plotOptions: { bar:{ horizontal:true, dataLabels:{position:'top'} } },
    tooltip:     { y:{formatter:v=>formatNumber(v)} },
  };
}

function buildColumn(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return {
    ...base,
    chart:       { ...base.chart, type:'bar' },
    series:      agg.series,
    xaxis:       { categories:agg.categories, title:{text:xKey}, labels:{rotate:-30} },
    yaxis:       { title:{text:yKey}, labels:{formatter:v=>formatNumber(v)} },
    plotOptions: { bar:{ horizontal:false, columnWidth:'72%' } },
    tooltip:     { y:{formatter:v=>formatNumber(v)} },
  };
}

function buildColumnSingle(data, base, xKey, yKey, method) {
  const agg = aggregate(data, xKey, yKey, null, method);
  if (!agg) return null;
  return {
    ...base,
    chart:       { ...base.chart, type:'bar' },
    series:      [{ name:yKey, data:agg.series[0]?.data || [] }],
    xaxis:       { categories:agg.categories, title:{text:xKey}, labels:{rotate:-30} },
    yaxis:       { title:{text:yKey}, labels:{formatter:v=>formatNumber(v)} },
    plotOptions: { bar:{ horizontal:false, columnWidth:'55%', borderRadius:4, dataLabels:{position:'top'} } },
    dataLabels:  { enabled:true, formatter:v=>formatNumber(v), offsetY:-18, style:{fontSize:'10px', colors:['#8b92a5']} },
    tooltip:     { y:{formatter:v=>formatNumber(v)} },
  };
}

function buildColumnGroup(data, base, xKey, yKey, groupKey, method) {
  if (!groupKey) return buildColumn(data, base, xKey, yKey, groupKey, method);
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return {
    ...base,
    chart:       { ...base.chart, type:'bar' },
    series:      agg.series,
    xaxis:       { categories:agg.categories, title:{text:xKey}, labels:{rotate:-30} },
    yaxis:       { title:{text:yKey}, labels:{formatter:v=>formatNumber(v)} },
    plotOptions: { bar:{ horizontal:false, columnWidth:'70%', borderRadius:3, grouped:true } },
    dataLabels:  { enabled:false },
    tooltip:     { y:{formatter:v=>formatNumber(v)} },
    legend:      { ...base.legend, position:'top' },
  };
}

function buildCombo(data, base, xKey, yKey, y2Key, method) {
  if (!yKey || !y2Key) return null;
  const agg1 = aggregate(data, xKey, yKey,  null, method);
  const agg2 = aggregate(data, xKey, y2Key, null, method);
  if (!agg1 || !agg2) return null;
  return {
    ...base,
    chart:       { ...base.chart, type:'line', stacked:false },
    series: [
      { name:yKey,  type:'column', data:agg1.series[0]?.data || [] },
      { name:y2Key, type:'line',   data:agg2.series[0]?.data || [] },
    ],
    xaxis:       { categories:agg1.categories, title:{text:xKey}, labels:{rotate:-30} },
    yaxis: [
      { seriesName:yKey,  title:{text:yKey,  style:{color:base.colors[0]}}, labels:{formatter:v=>formatNumber(v), style:{colors:base.colors[0]}} },
      { seriesName:y2Key, opposite:true, title:{text:y2Key, style:{color:base.colors[1]}}, labels:{formatter:v=>formatNumber(v), style:{colors:base.colors[1]}} },
    ],
    plotOptions: { bar:{ horizontal:false, columnWidth:'55%', borderRadius:4 } },
    stroke:      { width:[0,2.5], curve:'smooth' },
    markers:     { size:[0,4] },
    dataLabels:  { enabled:false },
    tooltip:     { shared:true, intersect:false, y:{formatter:v=>formatNumber(v)} },
    legend:      { ...base.legend, position:'top' },
  };
}

function buildPie(data, base, xKey, yKey, method) {
  const dist = countByCategory(data, xKey, yKey, method);
  if (!dist || !dist.labels.length) return null;
  return {
    ...base,
    chart:       { ...base.chart, type:'pie' },
    series:      dist.values,
    labels:      dist.labels,
    tooltip:     { y:{formatter:v=>formatNumber(v)} },
    plotOptions: { pie:{ dataLabels:{ enabled:true, formatter:v=>roundNumber(v,1)+'%' } } },
  };
}

function buildDonut(data, base, xKey, yKey, method) {
  const dist = countByCategory(data, xKey, yKey, method);
  if (!dist || !dist.labels.length) return null;
  return {
    ...base,
    chart:       { ...base.chart, type:'donut' },
    series:      dist.values,
    labels:      dist.labels,
    tooltip:     { y:{formatter:v=>formatNumber(v)} },
    plotOptions: { pie:{ donut:{ size:'75%', labels:{ show:true, name:{fontSize:'16px'}, value:{fontSize:'14px', formatter:v=>formatNumber(Number(v))} } } } },
  };
}

function buildScatter(data, base, xKey, yKey) {
  const points = data.map(row => {
    const x = Number(row[xKey]), y = Number(row[yKey]);
    return (!isNaN(x) && !isNaN(y)) ? [x, y] : null;
  }).filter(Boolean);
  if (!points.length) return null;
  return {
    ...base,
    chart:   { ...base.chart, type:'scatter', zoom:{enabled:true} },
    series:  [{ name:yKey, data:points }],
    xaxis:   { title:{text:xKey}, labels:{formatter:v=>formatNumber(v)} },
    yaxis:   { title:{text:yKey}, labels:{formatter:v=>formatNumber(v)} },
    tooltip: { x:{formatter:v=>xKey+': '+formatNumber(v)}, y:{formatter:v=>yKey+': '+formatNumber(v)} },
  };
}

function buildRadar(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return {
    ...base,
    chart:       { ...base.chart, type:'radar' },
    series:      agg.series,
    xaxis:       { categories:agg.categories },
    plotOptions: { radar:{ size:140, polygons:{ strokeColors:'rgba(255,255,255,0.05)', fill:{colors:['rgba(255,255,255,0.02)']} } } },
  };
}

function buildBoxPlot(data, base, xKey, yKey) {
  const grouped = {};
  data.forEach(row => {
    const x = String(row[xKey] ?? '—').trim();
    const y = Number(row[yKey]) || 0;
    if (!grouped[x]) grouped[x] = [];
    grouped[x].push(y);
  });
  const cats   = Object.keys(grouped);
  const series = [{
    name: yKey,
    type: 'boxPlot',
    data: cats.map(x => {
      const v  = grouped[x].sort((a, b) => a - b);
      const q1 = v[Math.floor(v.length * .25)];
      const q2 = v[Math.floor(v.length / 2)];
      const q3 = v[Math.floor(v.length * .75)];
      return { x, y:[Math.min(...v), q1, q2, q3, Math.max(...v)] };
    }),
  }];
  return { ...base, chart:{...base.chart, type:'boxPlot'}, series, xaxis:{categories:cats} };
}

// ── Render / Destroy ───────────────────────────
function renderChart(containerId, chartConfig) {
  if (!chartConfig) return null;
  const container = document.getElementById(containerId);
  if (!container) return null;
  if (_charts[containerId]) { try { _charts[containerId].destroy(); } catch(e) {} }
  const chart = new ApexCharts(container, chartConfig);
  chart.render();
  _charts[containerId] = chart;
  return chart;
}

function destroyChart(chartId) {
  if (_charts[chartId]) {
    try { _charts[chartId].destroy(); } catch(e) {}
    delete _charts[chartId];
  }
}

function clearAllCharts() {
  Object.keys(_charts).forEach(id => destroyChart(id));
  _charts = {};
}

// ── Export ─────────────────────────────────────
async function exportChartPNG(chartId, filename = 'chart.png') {
  const chart = _charts[chartId];
  if (!chart) { showToast('Không tìm thấy biểu đồ', 'error'); return false; }
  try {
    const { imgURI } = await chart.dataURI();
    const link = document.createElement('a');
    link.href = imgURI; link.download = filename; link.click();
    showToast('✓ Xuất ảnh thành công!', 'success');
    return true;
  } catch(err) {
    try {
      const el     = document.getElementById(chartId);
      const canvas = await html2canvas(el, { backgroundColor:'#0d0f12', scale:2, logging:false });
      const link   = document.createElement('a');
      link.href = canvas.toDataURL('image/png'); link.download = filename; link.click();
      showToast('✓ Xuất ảnh thành công!', 'success');
      return true;
    } catch(e2) {
      showToast('Lỗi khi xuất ảnh', 'error');
      return false;
    }
  }
}
