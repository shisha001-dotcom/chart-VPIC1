/* =============================================
   DATA — Xử lý dữ liệu
   Phụ thuộc: config.js, utils.js

   Để mở rộng:
   - Thêm loại file mới: thêm hàm parseSomething()
   - Thêm logic nhận diện cột: sửa detectColumnRole()
   - Thêm phương thức tổng hợp: thêm case vào applyAgg()
   - Thêm KPI card mới: sửa computeKPIs()
   - Thêm gợi ý chart tự động: sửa autoDetectCharts()
   ============================================= */

// ── State ──────────────────────────────────────
let _rawData        = [];
let _originalData   = [];  // bản gốc, không bao giờ bị sửa — dùng để reset
let _columns        = [];
let _detectedRoles  = {};
let _currentSheetName = '';
let _workbook       = null;

// ── Getters ────────────────────────────────────
function getRawData()      { return _rawData; }
function getOriginalData() { return _originalData; }
function getColumns()      { return _columns; }
function getRoles()        { return _detectedRoles; }
function getWorkbook()     { return _workbook; }
function setSheetName(n)   { _currentSheetName = n; }

/**
 * Ghi đè _rawData (dùng sau khi xóa/lọc dòng từ Data Table)
 * Không đụng vào _originalData
 */
function _overwriteRawData(rows) {
  _rawData  = rows;
  _columns  = rows.length ? Object.keys(rows[0]) : [];
  // Giữ nguyên roles cũ, chỉ cập nhật những cột còn lại
  const newRoles = {};
  _columns.forEach(c => { if (_detectedRoles[c]) newRoles[c] = _detectedRoles[c]; });
  _detectedRoles = newRoles;
}

// ── Column role detection ──────────────────────
function detectColumnRole(col) {
  const lower = col.toLowerCase().replace(/[_\s]+/g, '');
  for (const [role, hints] of Object.entries(COLUMN_HINTS)) {
    if (hints.some(h => lower.includes(h))) return role;
  }
  return null;
}

function isNumericColumn(data, col) {
  const sample = data.slice(0, Math.min(20, data.length))
    .map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
  if (!sample.length) return false;
  return sample.filter(v => !isNaN(Number(v))).length / sample.length > 0.7;
}

function isDateColumn(data, col) {
  const sample = data.slice(0, Math.min(10, data.length))
    .map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
  if (!sample.length) return false;
  return sample.filter(v => {
    const d = new Date(v);
    return d instanceof Date && !isNaN(d);
  }).length / sample.length > 0.7;
}

// ── Load & parse ───────────────────────────────
function loadData(rows) {
  _rawData      = rows;
  _originalData = [...rows];   // snapshot bản gốc
  _columns      = rows.length ? Object.keys(rows[0]) : [];
  _detectedRoles = {};
  _columns.forEach(col => {
    const h = detectColumnRole(col);
    if (h)                             _detectedRoles[col] = h;
    else if (isDateColumn(rows, col))  _detectedRoles[col] = 'date';
    else _detectedRoles[col] = isNumericColumn(rows, col) ? 'numeric' : 'category';
  });
  return { columns: _columns, roles: _detectedRoles };
}

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

// ── Aggregation ────────────────────────────────
function applyAgg(vals, method) {
  if (!vals.length) return 0;
  switch (method) {
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
  const groupNames = [...new Set(
    data.map(r => groupKey ? String(r[groupKey] ?? 'Other').trim() : '__single__')
  )];
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
  const sorted = labels
    .map(l => ({ label: l, value: applyAgg(map[l], method) }))
    .sort((a, b) => b.value - a.value);
  return { labels: sorted.map(s => s.label), values: sorted.map(s => s.value) };
}

// ── KPI & auto-detect ──────────────────────────
function computeKPIs(data, roles) {
  const kpis = [];
  kpis.push({ label:'Tổng số dòng', value:data.length.toLocaleString(), sub:'dòng dữ liệu', color:'#4f8ef7', icon:'📊' });

  const numCols = Object.entries(roles).filter(([, r]) => r === 'numeric').map(([c]) => c).slice(0, 3);
  const numColors = ['#6ee7b7','#fbbf24','#f472b6'];
  const numIcons  = ['💰','📈','🎯'];
  numCols.forEach((col, i) => {
    const vals = data.map(r => Number(r[col]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    kpis.push({ label:col, value:formatNumber(sum), sub:`TB: ${formatNumber(sum / data.length)}`, color:numColors[i], icon:numIcons[i] });
  });

  const catCols = Object.entries(roles).filter(([, r]) => r === 'category').map(([c]) => c);
  catCols.slice(0, 2).forEach((col, i) => {
    const unique = new Set(data.map(r => r[col])).size;
    kpis.push({ label:col+' (unique)', value:unique, sub:'giá trị khác nhau', color:['#a78bfa','#38bdf8'][i], icon:['🏷','🔖'][i] });
  });

  return kpis.slice(0, 6);
}

function autoDetectCharts(data, roles) {
  const suggestions = [];
  const cols     = Object.keys(roles);
  const dateCols = cols.filter(c => roles[c] === 'date');
  const numCols  = cols.filter(c => roles[c] === 'numeric');
  const catCols  = cols.filter(c => roles[c] === 'category');
  const [dateCol, numCol, catCol] = [dateCols[0], numCols[0], catCols[0]];

  if (dateCol && numCol)
    suggestions.push({ type:'area',   xKey:dateCol, yKey:numCol,  title:`${numCol} theo Thời gian`, groupKey:null, agg:'sum' });
  if (catCol && numCol) {
    suggestions.push({ type:'bar',    xKey:catCol,  yKey:numCol,  title:`${numCol} theo ${catCol}`, groupKey:null, agg:'sum' });
    suggestions.push({ type:'donut',  xKey:catCol,  yKey:numCol,  title:`Phân phối ${catCol}`,      groupKey:null, agg:'sum' });
  }
  if (numCols.length >= 2)
    suggestions.push({ type:'scatter', xKey:numCols[0], yKey:numCols[1], title:`${numCols[0]} vs ${numCols[1]}`, groupKey:null, agg:'sum' });
  if (!dateCol && catCol && numCol && numCols.length >= 2)
    suggestions.push({ type:'line',   xKey:catCol,  yKey:numCols[0], title:`Xu hướng ${numCols[0]}`, groupKey:null, agg:'avg' });
  if (!suggestions.length && catCol)
    suggestions.push({ type:'pie',    xKey:catCol,  yKey:numCol || null, title:`Thống kê ${catCol}`, groupKey:null, agg:'count' });

  return suggestions.slice(0, 4);
}
