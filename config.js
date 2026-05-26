/* =============================================
   CONFIG.JS — Chart Configuration
   ============================================= */

const CHART_TYPES = [
  { id: 'line',       label: 'Line',       icon: '📈', desc: 'Trend analysis' },
  { id: 'bar',        label: 'Bar',        icon: '📊', desc: 'Comparisons' },
  { id: 'column',     label: 'Column',     icon: '📈', desc: 'Vertical bars' },
  { id: 'area',       label: 'Area',       icon: '🏔', desc: 'Filled trends' },
  { id: 'pie',        label: 'Pie',        icon: '🥧', desc: 'Proportions' },
  { id: 'donut',      label: 'Donut',      icon: '⭕', desc: 'Distribution' },
  { id: 'scatter',    label: 'Scatter',    icon: '✦', desc: 'Correlations' },
  { id: 'radar',      label: 'Radar',      icon: '◎', desc: 'Multi-axis' },
  { id: 'boxplot',    label: 'Box Plot',   icon: '📦', desc: 'Distribution' },
];

const PALETTES = [
  {
    id: 'ocean',
    name: 'Ocean',
    colors: ['#4f8ef7','#6ee7b7','#a78bfa','#f472b6','#fbbf24','#38bdf8','#06b6d4','#8b5cf6'],
    swatch: 'linear-gradient(135deg, #4f8ef7, #6ee7b7)',
  },
  {
    id: 'ember',
    name: 'Ember',
    colors: ['#f97316','#ef4444','#fbbf24','#fb923c','#fcd34d','#f87171','#dc2626','#ea580c'],
    swatch: 'linear-gradient(135deg, #f97316, #ef4444)',
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: ['#4ade80','#a3e635','#34d399','#86efac','#6ee7b7','#bbf7d0','#22c55e','#10b981'],
    swatch: 'linear-gradient(135deg, #4ade80, #a3e635)',
  },
  {
    id: 'candy',
    name: 'Candy',
    colors: ['#f472b6','#c084fc','#818cf8','#38bdf8','#34d399','#fbbf24','#ec4899','#a855f7'],
    swatch: 'linear-gradient(135deg, #f472b6, #818cf8)',
  },
  {
    id: 'purple',
    name: 'Purple',
    colors: ['#a855f7','#9333ea','#7e22ce','#6b21a8','#5b21b6','#d946ef','#c084fc','#e9d5ff'],
    swatch: 'linear-gradient(135deg, #a855f7, #9333ea)',
  },
  {
    id: 'mono',
    name: 'Monochrome',
    colors: ['#e8eaf0','#8b92a5','#4f5668','#313849','#1a1e26','#0d0f12','#666d7a','#9ca3af'],
    swatch: 'linear-gradient(135deg, #e8eaf0, #4f5668)',
  },
];

// Base ApexCharts options
const APEX_BASE = {
  chart: {
    background: 'transparent',
    toolbar: {
      show: true,
      tools: { 
        download: false, 
        selection: true, 
        zoom: true, 
        zoomin: true, 
        zoomout: true, 
        pan: true, 
        reset: true 
      },
    },
    animations: { enabled: true, speed: 400 },
    fontFamily: "'DM Sans', sans-serif",
  },
  theme: { mode: 'dark' },
  grid: {
    borderColor: 'rgba(255,255,255,0.05)',
    strokeDashArray: 3,
  },
  tooltip: { 
    theme: 'dark',
    style: { fontSize: '12px' },
  },
  legend: {
    labels: { colors: '#8b92a5' },
    fontSize: 13,
  },
  dataLabels: { enabled: false },
};

// Column detection heuristics
const COLUMN_HINTS = {
  date:     ['date','day','month','year','week','ngày','tháng','năm','time','period','quarter','q1','q2','q3','q4','thời gian','giai đoạn'],
  numeric:  ['revenue','sales','amount','price','value','quantity','qty','count','total','sum','profit','cost','income','loss','doanh','tiền','số','giá','tổng','đơn','lợi nhuận'],
  category: ['category','type','segment','region','status','group','class','label','name','product','channel','danh','loại','nhóm','tên','khu','sản phẩm'],
};

function detectColumnRole(colName) {
  const lower = colName.toLowerCase().replace(/[_\s]+/g, '');
  for (const [role, hints] of Object.entries(COLUMN_HINTS)) {
    if (hints.some(h => lower.includes(h))) return role;
  }
  return null;
}

function isNumericColumn(data, col) {
  const sample = data.slice(0, Math.min(20, data.length))
    .map(r => r[col])
    .filter(v => v !== null && v !== undefined && v !== '');
  
  if (!sample.length) return false;
  const numeric = sample.filter(v => !isNaN(Number(v)));
  return numeric.length / sample.length > 0.7;
}

function isDateColumn(data, col) {
  const sample = data.slice(0, Math.min(10, data.length))
    .map(r => r[col])
    .filter(v => v !== null && v !== undefined && v !== '');
  
  if (!sample.length) return false;
  const dates = sample.filter(v => {
    const d = new Date(v);
    return d instanceof Date && !isNaN(d);
  });
  return dates.length / sample.length > 0.7;
}
