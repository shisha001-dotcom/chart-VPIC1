/* =============================================
   CONFIG — Hằng số toàn cục
   ============================================= */

const CHART_TYPES = [
  // ── Trend ──
  { id:'line',         label:'Line',        icon:'📈', desc:'Xu hướng theo thời gian',      group:'trend' },
  { id:'area',         label:'Area',        icon:'🏔',  desc:'Vùng lấp đầy',                group:'trend' },
  // ── Comparison ──
  { id:'bar',          label:'Bar',         icon:'📊', desc:'So sánh ngang',                group:'compare' },
  { id:'column',       label:'Column',      icon:'📉', desc:'So sánh dọc',                  group:'compare' },
  { id:'column-single',label:'Col Đơn',     icon:'🟦', desc:'Cột đơn - 1 series',           group:'compare' },
  { id:'column-group', label:'Col Nhóm',    icon:'🟧', desc:'Cột nhóm nhiều series',        group:'compare' },
  { id:'waterfall',    label:'Waterfall',   icon:'🌊', desc:'Tăng/giảm tích lũy',           group:'compare' },
  // ── Combo ──
  { id:'combo',        label:'Combo',       icon:'📊', desc:'Cột + Đường dual-axis',        group:'combo' },
  { id:'combo-multi',  label:'Combo Pro',   icon:'🔀', desc:'N cột + M đường, multi-axis',  group:'combo' },
  // ── Distribution ──
  { id:'pie',          label:'Pie',         icon:'🥧', desc:'Tỷ lệ %',                      group:'dist' },
  { id:'donut',        label:'Donut',       icon:'⭕', desc:'Phân phối',                    group:'dist' },
  { id:'treemap',      label:'Treemap',     icon:'🗺',  desc:'Ô vuông tỷ lệ',               group:'dist' },
  { id:'funnel',       label:'Funnel',      icon:'🔻', desc:'Phễu chuyển đổi',              group:'dist' },
  { id:'histogram',    label:'Histogram',   icon:'📶', desc:'Phân phối tần suất',           group:'dist' },
  // ── Correlation ──
  { id:'scatter',      label:'Scatter',     icon:'✦',  desc:'Tương quan',                  group:'corr' },
  { id:'heatmap',      label:'Heatmap',     icon:'🌡',  desc:'Ma trận màu',                 group:'corr' },
  // ── Multi-dim ──
  { id:'radar',        label:'Radar',       icon:'◎',  desc:'Đa trục',                     group:'multi' },
  { id:'boxplot',      label:'Box Plot',    icon:'📦', desc:'Phân phối thống kê',           group:'multi' },
];

// Nhóm chart type để hiển thị trong builder (label nhóm)
const CHART_TYPE_GROUPS = [
  { id:'trend',   label:'Xu hướng' },
  { id:'compare', label:'So sánh' },
  { id:'combo',   label:'Kết hợp' },
  { id:'dist',    label:'Phân phối' },
  { id:'corr',    label:'Tương quan' },
  { id:'multi',   label:'Đa chiều' },
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
  numeric:  ['revenue','sales','amount','price','value','quantity','qty','count','total','sum','profit','cost','income','loss','doanh','tiền','số','giá','tổng','đơn','lợi nhuận','chi phí','doanh thu','số lượng','margin','rate','ratio','%','pct','percent','tỷ lệ','tỉ lệ'],
  category: ['category','type','segment','region','status','group','class','label','name','product','channel','danh','loại','nhóm','tên','khu','sản phẩm','phòng ban','bộ phận','kênh'],
};
