/* =============================================
   CONFIG
   ============================================= */
const CHART_TYPES = [
  { id:'line',         label:'Line',         icon:'📈', desc:'Xu hướng theo thời gian' },
  { id:'area',         label:'Area',         icon:'🏔', desc:'Vùng lấp đầy' },
  { id:'bar',          label:'Bar',          icon:'📊', desc:'So sánh ngang' },
  { id:'column',       label:'Column',       icon:'📉', desc:'So sánh dọc' },
  { id:'column-single',label:'Col Đơn',      icon:'🟦', desc:'Cột đơn - 1 series' },
  { id:'column-group', label:'Col Nhóm',     icon:'🟧', desc:'Cột nhóm nhiều series' },
  { id:'combo',        label:'Combo',        icon:'📊', desc:'Cột + Đường dual-axis' },
  { id:'pie',          label:'Pie',          icon:'🥧', desc:'Tỷ lệ phần trăm' },
  { id:'donut',        label:'Donut',        icon:'⭕', desc:'Phân phối' },
  { id:'scatter',      label:'Scatter',      icon:'✦',  desc:'Tương quan' },
  { id:'radar',        label:'Radar',        icon:'◎',  desc:'Đa trục' },
  { id:'boxplot',      label:'Box Plot',     icon:'📦', desc:'Phân phối' },
];

const PALETTES = [
  { id:'ocean',  name:'Ocean',  colors:['#4f8ef7','#6ee7b7','#a78bfa','#f472b6','#fbbf24','#38bdf8','#06b6d4','#8b5cf6'], swatch:'linear-gradient(135deg,#4f8ef7,#6ee7b7)' },
  { id:'ember',  name:'Ember',  colors:['#f97316','#ef4444','#fbbf24','#fb923c','#fcd34d','#f87171','#dc2626','#ea580c'], swatch:'linear-gradient(135deg,#f97316,#ef4444)' },
  { id:'forest', name:'Forest', colors:['#4ade80','#a3e635','#34d399','#86efac','#6ee7b7','#bbf7d0','#22c55e','#10b981'], swatch:'linear-gradient(135deg,#4ade80,#a3e635)' },
  { id:'candy',  name:'Candy',  colors:['#f472b6','#c084fc','#818cf8','#38bdf8','#34d399','#fbbf24','#ec4899','#a855f7'], swatch:'linear-gradient(135deg,#f472b6,#818cf8)' },
  { id:'mono',   name:'Mono',   colors:['#e8eaf0','#8b92a5','#4f5668','#313849','#1a1e26','#0d0f12','#666d7a','#9ca3af'], swatch:'linear-gradient(135deg,#e8eaf0,#4f5668)' },
  { id:'neon',   name:'Neon',   colors:['#00f5ff','#ff00ff','#00ff88','#ffff00','#ff6600','#0080ff','#ff0088','#88ff00'], swatch:'linear-gradient(135deg,#00f5ff,#ff00ff)' },
];

const APEX_BASE = {
  chart: {
    background:'transparent',
    toolbar:{ show:true, tools:{ download:false, selection:true, zoom:true, zoomin:true, zoomout:true, pan:true, reset:true } },
    animations:{ enabled:true, speed:500 },
    fontFamily:"'DM Sans', sans-serif",
  },
  theme:{ mode:'dark' },
  grid:{ borderColor:'rgba(255,255,255,0.05)', strokeDashArray:3 },
  tooltip:{ theme:'dark', style:{ fontSize:'12px' } },
  legend:{ labels:{ colors:'#8b92a5' }, fontSize:13 },
  dataLabels:{ enabled:false },
};

const COLUMN_HINTS = {
  date:     ['date','day','month','year','week','ngày','tháng','năm','time','period','quarter','q1','q2','q3','q4','thời gian','giai đoạn','kỳ'],
  numeric:  ['revenue','sales','amount','price','value','quantity','qty','count','total','sum','profit','cost','income','loss','doanh','tiền','số','giá','tổng','đơn','lợi nhuận','chi phí','doanh thu','số lượng'],
  category: ['category','type','segment','region','status','group','class','label','name','product','channel','danh','loại','nhóm','tên','khu','sản phẩm','phòng ban','bộ phận','kênh'],
};

/* =============================================
   DATA LAYER
   ============================================= */
let _rawData = [], _columns = [], _detectedRoles = {}, _currentSheetName = '', _workbook = null;

function detectColumnRole(col) {
  const lower = col.toLowerCase().replace(/[_\s]+/g,'');
  for (const [role, hints] of Object.entries(COLUMN_HINTS)) {
    if (hints.some(h => lower.includes(h))) return role;
  }
  return null;
}

function isNumericColumn(data, col) {
  const sample = data.slice(0, Math.min(20, data.length)).map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
  if (!sample.length) return false;
  return sample.filter(v => !isNaN(Number(v))).length / sample.length > 0.7;
}

function isDateColumn(data, col) {
  const sample = data.slice(0, Math.min(10, data.length)).map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
  if (!sample.length) return false;
  return sample.filter(v => { const d = new Date(v); return d instanceof Date && !isNaN(d); }).length / sample.length > 0.7;
}

function loadData(rows) {
  _rawData = rows;
  _columns = rows.length ? Object.keys(rows[0]) : [];
  _detectedRoles = {};
  _columns.forEach(col => {
    const h = detectColumnRole(col);
    if (h) _detectedRoles[col] = h;
    else if (isDateColumn(rows, col)) _detectedRoles[col] = 'date';
    else _detectedRoles[col] = isNumericColumn(rows, col) ? 'numeric' : 'category';
  });
  return { columns: _columns, roles: _detectedRoles };
}

function getRawData()  { return _rawData; }
function getColumns()  { return _columns; }
function getRoles()    { return _detectedRoles; }
function setSheetName(n) { _currentSheetName = n; }

function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        _workbook = XLSX.read(data, { type: 'array', cellDates: true });
        resolve(_workbook);
      } catch(err) { reject(new Error('Lỗi đọc file: ' + err.message)); }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}

function parseSheet(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/* =============================================
   UTILS
   ============================================= */
function formatNumber(n) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number(n.toFixed(2)).toLocaleString('vi-VN');
}

function roundNumber(num, dec = 2) { return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec); }
function generateId() { return Math.random().toString(36).substr(2, 9); }

function showToast(msg, type = 'info', duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), duration);
}

function showSpinner(show = true) {
  document.getElementById('spinnerOverlay').classList.toggle('show', show);
}

/* =============================================
   AGGREGATION
   ============================================= */
function applyAgg(vals, method) {
  if (!vals.length) return 0;
  switch(method) {
    case 'sum':   return vals.reduce((a, b) => a + b, 0);
    case 'count': return vals.length;
    case 'avg':   return roundNumber(vals.reduce((a, b) => a + b, 0) / vals.length);
    case 'max':   return Math.max(...vals);
    case 'min':   return Math.min(...vals);
    default:      return vals.reduce((a, b) => a + b, 0);
  }
}

function aggregate(data, xKey, yKey, groupKey, method) {
  if (!xKey || !yKey) return null;
  const grouped = {};
  data.forEach(row => {
    const x = String(row[xKey] ?? '—').trim();
    const y = Number(row[yKey]) || 0;
    const g = groupKey ? String(row[groupKey] ?? 'Other').trim() : '__single__';
    if (!grouped[x]) grouped[x] = {};
    if (!grouped[x][g]) grouped[x][g] = [];
    grouped[x][g].push(y);
  });
  const xCategories = Object.keys(grouped);
  const groupNames = [...new Set(data.map(r => groupKey ? String(r[groupKey] ?? 'Other').trim() : '__single__'))];
  const series = groupNames.map(g => ({
    name: g === '__single__' ? yKey : g,
    data: xCategories.map(x => applyAgg(grouped[x]?.[g] || [], method))
  }));
  return { categories: xCategories, series };
}

function countByCategory(data, catKey, valueKey, method = 'sum') {
  const map = {};
  data.forEach(row => {
    const cat = String(row[catKey] ?? '—').trim();
    if (!map[cat]) map[cat] = [];
    map[cat].push(valueKey ? (Number(row[valueKey]) || 0) : 1);
  });
  const labels = Object.keys(map);
  const sorted = labels.map(l => ({ label: l, value: applyAgg(map[l], method) })).sort((a, b) => b.value - a.value);
  return { labels: sorted.map(s => s.label), values: sorted.map(s => s.value) };
}

function computeKPIs(data, roles) {
  const kpis = [];
  kpis.push({ label: 'Tổng số dòng', value: data.length.toLocaleString(), sub: 'dòng dữ liệu', color: '#4f8ef7', icon: '📊' });
  const numCols = Object.entries(roles).filter(([, r]) => r === 'numeric').map(([c]) => c).slice(0, 3);
  const colors = ['#6ee7b7', '#fbbf24', '#f472b6'];
  const icons  = ['💰', '📈', '🎯'];
  numCols.forEach((col, i) => {
    const vals = data.map(r => Number(r[col]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    kpis.push({ label: col, value: formatNumber(sum), sub: `TB: ${formatNumber(sum / data.length)}`, color: colors[i], icon: icons[i] });
  });
  const catCols = Object.entries(roles).filter(([, r]) => r === 'category').map(([c]) => c);
  catCols.slice(0, 2).forEach((col, i) => {
    const unique = new Set(data.map(r => r[col])).size;
    kpis.push({ label: col + ' (unique)', value: unique, sub: 'giá trị khác nhau', color: ['#a78bfa', '#38bdf8'][i], icon: ['🏷', '🔖'][i] });
  });
  return kpis.slice(0, 6);
}

function autoDetectCharts(data, roles) {
  const suggestions = [];
  const cols = Object.keys(roles);
  const dateCols = cols.filter(c => roles[c] === 'date');
  const numCols  = cols.filter(c => roles[c] === 'numeric');
  const catCols  = cols.filter(c => roles[c] === 'category');
  const dateCol = dateCols[0], numCol = numCols[0], catCol = catCols[0];

  if (dateCol && numCol) suggestions.push({ type:'area', xKey:dateCol, yKey:numCol, title:`${numCol} theo Thời gian`, groupKey:null, agg:'sum' });
  if (catCol && numCol) {
    suggestions.push({ type:'bar',   xKey:catCol, yKey:numCol, title:`${numCol} theo ${catCol}`, groupKey:null, agg:'sum' });
    suggestions.push({ type:'donut', xKey:catCol, yKey:numCol, title:`Phân phối ${catCol}`,       groupKey:null, agg:'sum' });
  }
  if (numCols.length >= 2) suggestions.push({ type:'scatter', xKey:numCols[0], yKey:numCols[1], title:`${numCols[0]} vs ${numCols[1]}`, groupKey:null, agg:'sum' });
  if (!dateCol && catCol && numCol && numCols.length >= 2) {
    suggestions.push({ type:'line', xKey:catCol, yKey:numCols[0], title:`Xu hướng ${numCols[0]}`, groupKey:null, agg:'avg' });
  }
  if (!suggestions.length && catCol) suggestions.push({ type:'pie', xKey:catCol, yKey:numCol || null, title:`Thống kê ${catCol}`, groupKey:null, agg:'count' });
  return suggestions.slice(0, 4);
}

/* =============================================
   CHART BUILDING
   ============================================= */
let _charts = {};

function buildChartConfig(type, data, colors, xKey, yKey, groupKey, method, y2Key) {
  const base = JSON.parse(JSON.stringify(APEX_BASE));
  base.colors = colors;
  switch(type) {
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

function buildLine(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return { ...base, chart:{...base.chart, type:'line'}, series:agg.series,
    xaxis:{categories:agg.categories, title:{text:xKey}, labels:{rotate:-30}},
    yaxis:{title:{text:yKey}, labels:{formatter:v=>formatNumber(v)}},
    stroke:{curve:'smooth', width:2.5}, markers:{size:4} };
}

function buildArea(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return { ...base, chart:{...base.chart, type:'area'}, series:agg.series,
    xaxis:{categories:agg.categories, title:{text:xKey}, labels:{rotate:-30}},
    yaxis:{title:{text:yKey}, labels:{formatter:v=>formatNumber(v)}},
    fill:{opacity:0.28}, stroke:{curve:'smooth', width:2} };
}

function buildBar(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return { ...base, chart:{...base.chart, type:'bar'}, series:agg.series,
    xaxis:{categories:agg.categories, title:{text:yKey}},
    yaxis:{labels:{formatter:v=>formatNumber(v)}},
    plotOptions:{bar:{horizontal:true, dataLabels:{position:'top'}}},
    tooltip:{y:{formatter:v=>formatNumber(v)}} };
}

function buildColumn(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return { ...base, chart:{...base.chart, type:'bar'}, series:agg.series,
    xaxis:{categories:agg.categories, title:{text:xKey}, labels:{rotate:-30}},
    yaxis:{title:{text:yKey}, labels:{formatter:v=>formatNumber(v)}},
    plotOptions:{bar:{horizontal:false, columnWidth:'72%'}},
    tooltip:{y:{formatter:v=>formatNumber(v)}} };
}

function buildColumnSingle(data, base, xKey, yKey, method) {
  const agg = aggregate(data, xKey, yKey, null, method);
  if (!agg) return null;
  const singleSeries = [{ name: yKey, data: agg.series[0]?.data || [] }];
  return {
    ...base,
    chart: { ...base.chart, type: 'bar' },
    series: singleSeries,
    xaxis: { categories: agg.categories, title: { text: xKey }, labels: { rotate: -30 } },
    yaxis: { title: { text: yKey }, labels: { formatter: v => formatNumber(v) } },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4,
      dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, formatter: v => formatNumber(v), offsetY: -18,
      style: { fontSize: '10px', colors: ['#8b92a5'] } },
    tooltip: { y: { formatter: v => formatNumber(v) } },
  };
}

function buildColumnGroup(data, base, xKey, yKey, groupKey, method) {
  if (!groupKey) return buildColumn(data, base, xKey, yKey, groupKey, method);
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return {
    ...base,
    chart: { ...base.chart, type: 'bar' },
    series: agg.series,
    xaxis: { categories: agg.categories, title: { text: xKey }, labels: { rotate: -30 } },
    yaxis: { title: { text: yKey }, labels: { formatter: v => formatNumber(v) } },
    plotOptions: { bar: { horizontal: false, columnWidth: '70%', borderRadius: 3, grouped: true } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: v => formatNumber(v) } },
    legend: { ...base.legend, position: 'top' },
  };
}

function buildCombo(data, base, xKey, yKey, y2Key, method) {
  if (!yKey || !y2Key) return null;
  const agg1 = aggregate(data, xKey, yKey, null, method);
  const agg2 = aggregate(data, xKey, y2Key, null, method);
  if (!agg1 || !agg2) return null;
  const categories = agg1.categories;
  return {
    ...base,
    chart: { ...base.chart, type: 'line', stacked: false },
    series: [
      { name: yKey,  type: 'column', data: agg1.series[0]?.data || [] },
      { name: y2Key, type: 'line',   data: agg2.series[0]?.data || [] },
    ],
    xaxis: { categories, title: { text: xKey }, labels: { rotate: -30 } },
    yaxis: [
      { seriesName: yKey,  title: { text: yKey,  style: { color: base.colors[0] } },
        labels: { formatter: v => formatNumber(v), style: { colors: base.colors[0] } } },
      { seriesName: y2Key, opposite: true,
        title: { text: y2Key, style: { color: base.colors[1] } },
        labels: { formatter: v => formatNumber(v), style: { colors: base.colors[1] } } },
    ],
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 } },
    stroke: { width: [0, 2.5], curve: 'smooth' },
    markers: { size: [0, 4] },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false, y: { formatter: v => formatNumber(v) } },
    legend: { ...base.legend, position: 'top' },
  };
}

function buildPie(data, base, xKey, yKey, method) {
  const dist = countByCategory(data, xKey, yKey, method);
  if (!dist || !dist.labels.length) return null;
  return { ...base, chart:{...base.chart, type:'pie'}, series:dist.values, labels:dist.labels,
    tooltip:{y:{formatter:v=>formatNumber(v)}},
    plotOptions:{pie:{dataLabels:{enabled:true, formatter:v=>roundNumber(v,1)+'%'}}} };
}

function buildDonut(data, base, xKey, yKey, method) {
  const dist = countByCategory(data, xKey, yKey, method);
  if (!dist || !dist.labels.length) return null;
  return { ...base, chart:{...base.chart, type:'donut'}, series:dist.values, labels:dist.labels,
    tooltip:{y:{formatter:v=>formatNumber(v)}},
    plotOptions:{pie:{donut:{size:'75%', labels:{show:true, name:{fontSize:'16px'}, value:{fontSize:'14px', formatter:v=>formatNumber(Number(v))}}}}} };
}

function buildScatter(data, base, xKey, yKey) {
  const points = data.map(row => { const x=Number(row[xKey]), y=Number(row[yKey]); return (!isNaN(x) && !isNaN(y)) ? [x, y] : null; }).filter(Boolean);
  if (!points.length) return null;
  return { ...base, chart:{...base.chart, type:'scatter', zoom:{enabled:true}},
    series:[{name:yKey, data:points}],
    xaxis:{title:{text:xKey}, labels:{formatter:v=>formatNumber(v)}},
    yaxis:{title:{text:yKey}, labels:{formatter:v=>formatNumber(v)}},
    tooltip:{x:{formatter:v=>xKey+': '+formatNumber(v)}, y:{formatter:v=>yKey+': '+formatNumber(v)}} };
}

function buildRadar(data, base, xKey, yKey, groupKey, method) {
  const agg = aggregate(data, xKey, yKey, groupKey, method);
  if (!agg) return null;
  return { ...base, chart:{...base.chart, type:'radar'}, series:agg.series, xaxis:{categories:agg.categories},
    plotOptions:{radar:{size:140, polygons:{strokeColors:'rgba(255,255,255,0.05)', fill:{colors:['rgba(255,255,255,0.02)']}}}} };
}

function buildBoxPlot(data, base, xKey, yKey) {
  const grouped = {};
  data.forEach(row => {
    const x = String(row[xKey] ?? '—').trim();
    const y = Number(row[yKey]) || 0;
    if (!grouped[x]) grouped[x] = [];
    grouped[x].push(y);
  });
  const series = [{ name: yKey, type: 'boxPlot', data: Object.keys(grouped).map(x => {
    const v = grouped[x].sort((a, b) => a - b);
    return [Math.min(...v), v[Math.floor(v.length*.25)], v[Math.floor(v.length/2)], v[Math.floor(v.length*.75)], Math.max(...v)];
  }) }];
  return { ...base, chart:{...base.chart, type:'boxPlot'}, series, xaxis:{categories:Object.keys(grouped)} };
}

function renderChart(containerId, chartConfig) {
  if (!chartConfig) return null;
  const container = document.getElementById(containerId);
  if (!container) return null;
  if (_charts[containerId]) { _charts[containerId].destroy(); }
  const chart = new ApexCharts(container, chartConfig);
  chart.render();
  _charts[containerId] = chart;
  return chart;
}

function destroyChart(chartId) {
  if (_charts[chartId]) { _charts[chartId].destroy(); delete _charts[chartId]; }
}

function clearAllCharts() {
  Object.keys(_charts).forEach(id => { if (_charts[id]) _charts[id].destroy(); });
  _charts = {};
}

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
      const el = document.getElementById(chartId);
      const canvas = await html2canvas(el, { backgroundColor:'#0d0f12', scale:2, logging:false });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png'); link.download = filename; link.click();
      showToast('✓ Xuất ảnh thành công!', 'success'); return true;
    } catch(e2) {
      showToast('Lỗi khi xuất ảnh', 'error'); return false;
    }
  }
}

/* =============================================
   DASHBOARD
   ============================================= */
let _dashboardCharts = [];

function generateDashboard(data, roles) {
  clearDashboard();
  renderKPICards(computeKPIs(data, roles));
  autoDetectCharts(data, roles).forEach((s, i) => addChartToDashboard(s, data, i));
}

function renderKPICards(kpis) {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  kpis.forEach((kpi, i) => {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.style.setProperty('--kpi-color', kpi.color);
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `<div class="kpi-icon">${kpi.icon || '📊'}</div>
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-value">${kpi.value}</div>
      <div class="kpi-sub">${kpi.sub}</div>`;
    grid.appendChild(card);
  });
}

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

function addChartToDashboard(config, data, index) {
  const chartId = `dc-${generateId()}`;
  const colors = PALETTES[index % PALETTES.length].colors;
  const chartConfig = buildChartConfig(config.type, data, colors, config.xKey, config.yKey, config.groupKey, config.agg, config.y2Key);
  if (!chartConfig) return;

  const block = document.createElement('div');
  block.className = 'chart-block';
  block.style.animationDelay = `${0.1 + index * 0.06}s`;
  block.dataset.chartId = chartId;
  block.dataset.config = JSON.stringify(config);

  const altTypes = getAlternativeTypes(config.type);
  const switchBtns = altTypes.map(t => {
    const ct = CHART_TYPES.find(c => c.id === t);
    return ct ? `<button class="chart-switch-btn${t === config.type ? ' active' : ''}" data-type="${t}" data-chart-id="${chartId}">${ct.icon} ${ct.label}</button>` : '';
  }).join('');

  block.innerHTML = `
    <div class="chart-block-header">
      <input class="chart-title-input" value="${config.title}" title="Nhấn để sửa tiêu đề">
      <div class="chart-block-actions">
        <button class="chart-block-btn" data-action="download" data-chart-id="${chartId}" title="Tải ảnh">⬇ PNG</button>
        <button class="chart-block-btn danger" data-action="remove" data-chart-id="${chartId}" title="Xóa">✕</button>
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

  block.querySelector('.chart-title-input').addEventListener('change', e => {
    const dc = _dashboardCharts.find(c => c.chartId === chartId);
    if (dc) dc.config.title = e.target.value;
  });

  block.querySelectorAll('.chart-switch-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const newType = e.target.dataset.type;
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

  block.querySelector('[data-action="download"]').addEventListener('click', async () => {
    await exportChartPNG(chartId, `${config.title || 'chart'}.png`);
  });

  block.querySelector('[data-action="remove"]').addEventListener('click', () => {
    destroyChart(chartId);
    block.remove();
    _dashboardCharts = _dashboardCharts.filter(c => c.chartId !== chartId);
    showToast('Đã xóa biểu đồ', 'info', 1500);
  });
}

function clearDashboard() {
  _dashboardCharts.forEach(item => { destroyChart(item.chartId); item.block.remove(); });
  _dashboardCharts = [];
  document.getElementById('kpiGrid').innerHTML = '';
  document.getElementById('dashboardChartsGrid').innerHTML = '';
}

async function exportDashboard() {
  try {
    showSpinner(true);
    const el = document.getElementById('view-dashboard');
    const canvas = await html2canvas(el, { backgroundColor:'#0d0f12', scale:2, logging:false, useCORS:true });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `dashboard-${Date.now()}.png`;
    link.click();
    showToast('✓ Xuất dashboard thành công!', 'success');
  } catch(err) {
    showToast('Lỗi khi xuất dashboard', 'error');
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

/* =============================================
   DATA TABLE
   ============================================= */
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
    th.textContent = col;
    th.dataset.col = col;
    if (_sortCol === col) th.classList.add(_sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    th.addEventListener('click', () => sortTable(col));
    hr.appendChild(th);
  });
  thead.appendChild(hr);

  tbody.innerHTML = '';
  const display = data.slice(0, 2000);
  display.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      const val = row[col];
      const isNum = !isNaN(Number(val)) && val !== '';
      if (isNum) td.classList.add('numeric');
      td.textContent = val ?? '—';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  document.getElementById('tableCount').textContent = `${display.length} / ${data.length} dòng`;
  document.getElementById('exportCsvBtn').disabled = false;
}

function sortTable(col) {
  if (_sortCol === col) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
  else { _sortCol = col; _sortDir = 'asc'; }
  const sorted = [..._tableData].sort((a, b) => {
    const va = a[col], vb = b[col];
    const na = Number(va), nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb)) return _sortDir === 'asc' ? na - nb : nb - na;
    return _sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
  renderDataTable(sorted);
}

function exportCSV() {
  const data = getRawData();
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  const rows = [cols.join(','), ...data.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type:'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${_currentSheetName || 'data'}.csv`;
  link.click();
  showToast('✓ Xuất CSV thành công!', 'success');
}

/* =============================================
   UI SETUP
   ============================================= */
function setupChartTypeGrid() {
  const grid = document.getElementById('chartTypeGrid');
  let sel = 'column';
  CHART_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.className = `chart-type-btn${type.id === sel ? ' selected' : ''}`;
    btn.dataset.type = type.id;
    btn.title = type.desc;
    btn.innerHTML = `<div class="chart-type-icon">${type.icon}</div><div>${type.label}</div>`;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); sel = type.id;
      const y2group = document.getElementById('y2AxisGroup');
      const ggroup  = document.getElementById('groupSelect').closest('.field-group');
      if (type.id === 'combo') {
        y2group.style.display = 'flex';
        if (ggroup) ggroup.style.display = 'none';
      } else {
        y2group.style.display = 'none';
        if (ggroup) ggroup.style.display = 'flex';
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
    btn.className = `palette-btn${i === 0 ? ' selected' : ''}`;
    btn.style.background = p.swatch; btn.title = p.name;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); sel = p;
    });
    grid.appendChild(btn);
  });
  return () => sel;
}

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
  if (numCols.length) ySel.value = numCols[0];
  if (numCols.length > 1) y2Sel.value = numCols[1];
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const viewId = `view-${btn.dataset.view}`;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const target = document.getElementById(viewId);
      if (target) target.classList.add('active');
      const titles = { dashboard:'📊 Dashboard Overview', charts:'🎨 Chart Builder', table:'📋 Data Table' };
      document.getElementById('topbarTitle').textContent = titles[btn.dataset.view] || 'DataViz Pro';
    });
  });
}

function setupFileUpload() {
  const fileInput = document.getElementById('excelFile');
  fileInput.addEventListener('change', e => loadFile(e.target.files[0]));

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

  document.getElementById('sheetSelect').addEventListener('change', e => {
    if (!_workbook) return;
    try {
      const rows = parseSheet(_workbook, e.target.value);
      if (!rows.length) { showToast('Sheet rỗng', 'error'); return; }
      setSheetName(e.target.value);
      const result = loadData(rows);
      populateColumnSelects(result.columns, result.roles);
      generateDashboard(rows, result.roles);
      renderDataTable(rows);
      document.getElementById('rowBadge').textContent = rows.length.toLocaleString() + ' dòng';
      showToast(`✓ Đã chuyển sang sheet: ${e.target.value}`, 'success');
    } catch(err) { showToast('Lỗi đọc sheet: ' + err.message, 'error'); }
  });
}

async function loadFile(file) {
  if (!file) return;
  try {
    showSpinner(true);
    const wb = await parseExcelFile(file);
    const sheetName = wb.SheetNames[0];
    const rows = parseSheet(wb, sheetName);
    if (!rows.length) { showToast('File Excel rỗng', 'error'); return; }

    setSheetName(sheetName);
    const result = loadData(rows);

    document.getElementById('fileInfo').textContent = `📄 ${file.name}`;

    const sheetSel = document.getElementById('sheetSelect');
    const sheetContainer = document.getElementById('sheetSelector');
    sheetSel.innerHTML = wb.SheetNames.map(n => `<option${n === sheetName ? ' selected' : ''}>${n}</option>`).join('');
    sheetContainer.style.display = wb.SheetNames.length > 1 ? 'flex' : 'none';

    populateColumnSelects(result.columns, result.roles);
    generateDashboard(rows, result.roles);
    renderDataTable(rows);

    document.getElementById('exportDashboardBtn').disabled = false;
    document.getElementById('refreshBtn').disabled = false;
    document.getElementById('exportCsvBtn').disabled = false;
    document.getElementById('dashHeaderActions').style.display = 'flex';
    document.getElementById('rowBadge').textContent = rows.length.toLocaleString() + ' dòng';
    document.getElementById('dashboardTitle').textContent = file.name.replace(/\.[^.]+$/, '');

    document.querySelector('[data-view="dashboard"]').click();

    showToast(`✓ Đã tải ${rows.length.toLocaleString()} dòng từ "${sheetName}"`, 'success', 4000);
  } catch(err) {
    showToast('Lỗi: ' + err.message, 'error');
  } finally { showSpinner(false); }
}

/* =============================================
   CHART BUILDER SETUP
   ============================================= */
let getSelectedChartType, getSelectedPalette;

function setupChartBuilder() {
  getSelectedChartType = setupChartTypeGrid();
  getSelectedPalette   = setupPaletteGrid();

  document.getElementById('buildChartBtn').addEventListener('click', buildCustomChart);

  document.getElementById('addToDashboardBtn').addEventListener('click', () => {
    const data = getRawData();
    if (!data.length) { showToast('Chưa có dữ liệu', 'error'); return; }
    const config = {
      type: getSelectedChartType(),
      xKey: document.getElementById('xAxisSelect').value,
      yKey: document.getElementById('yAxisSelect').value,
      y2Key: document.getElementById('y2AxisSelect').value || null,
      groupKey: document.getElementById('groupSelect').value || null,
      agg: document.getElementById('aggSelect').value,
      title: document.getElementById('chartTitleInput').value || `Biểu đồ ${_dashboardCharts.length + 1}`
    };
    addChartToDashboard(config, data, _dashboardCharts.length);
    showToast('✓ Đã thêm vào Dashboard!', 'success');
    document.querySelector('[data-view="dashboard"]').click();
  });

  document.getElementById('downloadChartBtn').addEventListener('click', () => exportChartPNG('customChartContainer', 'custom-chart.png'));
  document.getElementById('downloadChartSVGBtn').addEventListener('click', () => exportChartPNG('customChartContainer', 'custom-chart-svg.png'));
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

  if (!xKey) { showToast('Vui lòng chọn trục X', 'error'); return; }
  if (!data.length) { showToast('Chưa có dữ liệu', 'error'); return; }
  if (chartType === 'combo' && !y2Key) { showToast('Combo chart cần chọn cả Trục Y2', 'error'); return; }

  const cfg = buildChartConfig(chartType, data, palette.colors, xKey, yKey, groupKey, method, y2Key);
  if (!cfg) { showToast('Không thể tạo biểu đồ với dữ liệu đã chọn', 'error'); return; }

  document.getElementById('previewEmpty').style.display = 'none';
  renderChart('customChartContainer', cfg);
  document.getElementById('chartActions').style.display = 'flex';

  if (!document.getElementById('chartTitleInput').value) {
    document.getElementById('chartTitleInput').value = `${yKey || xKey} theo ${xKey}`;
  }
  showToast('✓ Biểu đồ đã được tạo!', 'success');
}

/* =============================================
   TABLE SETUP
   ============================================= */
function setupTable() {
  let searchTimer;
  document.getElementById('tableSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = e.target.value.toLowerCase();
      if (!q) { renderDataTable(getRawData()); return; }
      const filtered = getRawData().filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q)));
      renderDataTable(filtered);
    }, 200);
  });
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
}

/* =============================================
   EXPORT MODAL SETUP
   ============================================= */
function setupExportModal() {
  const overlay = document.getElementById('exportModal');
  document.getElementById('exportDashboardBtn').addEventListener('click', () => overlay.classList.add('show'));
  document.getElementById('exportModalClose').addEventListener('click', () => overlay.classList.remove('show'));
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

/* =============================================
   INIT
   ============================================= */
(function init() {
  setupNavigation();

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  setupFileUpload();
  setupChartBuilder();
  setupTable();
  setupExportModal();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });

  if (window.innerWidth <= 768) {
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
})();
