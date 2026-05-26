/* =============================================
   CONFIG.JS — Chart Types, Palettes, Column Detection
   ============================================= */

const CHART_TYPES = [
  { id: 'line',       label: 'Line',       icon: '📈' },
  { id: 'bar',        label: 'Bar',        icon: '📊' },
  { id: 'area',       label: 'Area',       icon: '🏔' },
  { id: 'pie',        label: 'Pie',        icon: '🥧' },
  { id: 'donut',      label: 'Donut',      icon: '⭕' },
  { id: 'scatter',    label: 'Scatter',    icon: '✦' },
  { id: 'heatmap',    label: 'Heatmap',    icon: '🟦' },
  { id: 'radar',      label: 'Radar',      icon: '◎' },
  { id: 'treemap',    label: 'Treemap',    icon: '▦' },
];

const PALETTES = [
  {
    id: 'ocean',
    colors: ['#4f8ef7','#6ee7b7','#a78bfa','#f472b6','#fbbf24','#38bdf8'],
    swatch: 'linear-gradient(135deg, #4f8ef7, #6ee7b7)',
  },
  {
    id: 'ember',
    colors: ['#f97316','#ef4444','#fbbf24','#fb923c','#fcd34d','#f87171'],
    swatch: 'linear-gradient(135deg, #f97316, #ef4444)',
  },
  {
    id: 'forest',
    colors: ['#4ade80','#a3e635','#34d399','#86efac','#6ee7b7','#bbf7d0'],
    swatch: 'linear-gradient(135deg, #4ade80, #a3e635)',
  },
  {
    id: 'candy',
    colors: ['#f472b6','#c084fc','#818cf8','#38bdf8','#34d399','#fbbf24'],
    swatch: 'linear-gradient(135deg, #f472b6, #818cf8)',
  },
  {
    id: 'mono',
    colors: ['#e8eaf0','#8b92a5','#4f5668','#313849','#1a1e26','#0d0f12'],
    swatch: 'linear-gradient(135deg, #e8eaf0, #4f5668)',
  },
];

// Apex base options shared across all charts
const APEX_BASE = {
  chart: {
    background: 'transparent',
    toolbar: {
      show: true,
      tools: { download: false, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true },
    },
    animations: { enabled: true, speed: 400 },
    fontFamily: "'DM Sans', sans-serif",
  },
  theme: { mode: 'dark' },
  grid: {
    borderColor: 'rgba(255,255,255,0.05)',
    strokeDashArray: 3,
  },
  tooltip: { theme: 'dark' },
  legend: {
    labels: { colors: '#8b92a5' },
  },
  dataLabels: { enabled: false },
};

// Column detection heuristics
const COLUMN_HINTS = {
  date:     ['date','day','month','year','week','ngày','tháng','năm','time','period','quarter','q1','q2','q3','q4'],
  numeric:  ['revenue','sales','amount','price','value','quantity','qty','count','total','sum','profit','cost','income','loss','doanh','tiền','số','giá'],
  category: ['category','type','segment','region','status','group','class','label','name','product','channel','danh','loại','nhóm','tên','khu'],
};

function detectColumnRole(colName) {
  const lower = colName.toLowerCase().replace(/[_\s]+/g, '');
  for (const [role, hints] of Object.entries(COLUMN_HINTS)) {
    if (hints.some(h => lower.includes(h))) return role;
  }
  return null;
}

function isNumericColumn(data, col) {
  const sample = data.slice(0, 20).map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
  if (!sample.length) return false;
  const numeric = sample.filter(v => !isNaN(Number(v)));
  return numeric.length / sample.length > 0.7;
}
