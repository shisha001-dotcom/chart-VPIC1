/* =============================================
   DATA.JS — Excel Parsing & Data Management
   ============================================= */

let _rawData = [];
let _columns = [];
let _detectedRoles = {};
let _currentSheetName = '';

// ── Parse Excel File ──────────────────────────
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        resolve({ 
          rows: json, 
          sheetName: sheetName,
          totalSheets: wb.SheetNames.length 
        });
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Load & Analyze Data ───────────────────────
function loadData(rows) {
  _rawData = rows;
  _columns = rows.length ? Object.keys(rows[0]) : [];
  _detectedRoles = {};
  
  _columns.forEach(col => {
    const hintRole = detectColumnRole(col);
    if (hintRole) {
      _detectedRoles[col] = hintRole;
    } else if (isDateColumn(rows, col)) {
      _detectedRoles[col] = 'date';
    } else {
      _detectedRoles[col] = isNumericColumn(rows, col) ? 'numeric' : 'category';
    }
  });
  
  return { columns: _columns, roles: _detectedRoles };
}

// ── Data Accessors ───────────────────────────
function getRawData() { return _rawData; }
function getColumns() { return _columns; }
function getRoles() { return _detectedRoles; }
function getSheetName() { return _currentSheetName; }
function setSheetName(name) { _currentSheetName = name; }

// ── Aggregation ──────────────────────────────
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

  const xCategories = Object.keys(grouped).sort();
  const groupNames = [...new Set(
    data.map(r => groupKey ? String(r[groupKey] ?? 'Other').trim() : '__single__')
  )];

  const series = groupNames.map(g => {
    const seriesData = xCategories.map(x => {
      const vals = grouped[x]?.[g] || [];
      return applyAgg(vals, method);
    });
    return { 
      name: g === '__single__' ? yKey : g, 
      data: seriesData 
    };
  });

  return { categories: xCategories, series };
}

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

// ── Category Distribution ─────────────────────
function countByCategory(data, catKey, valueKey, method = 'sum') {
  const map = {};
  data.forEach(row => {
    const cat = String(row[catKey] ?? '—').trim();
    if (!map[cat]) map[cat] = [];
    const v = valueKey ? (Number(row[valueKey]) || 0) : 1;
    map[cat].push(v);
  });
  
  const labels = Object.keys(map);
  const values = labels.map(l => applyAgg(map[l], method));
  
  // Sort by value descending
  const sorted = labels.map((l, i) => ({ label: l, value: values[i] }))
    .sort((a, b) => b.value - a.value);
  
  return { 
    labels: sorted.map(s => s.label), 
    values: sorted.map(s => s.value) 
  };
}

// ── KPI Computation ──────────────────────────
function computeKPIs(data, roles) {
  const kpis = [];

  kpis.push({ 
    label: 'Total Records', 
    value: data.length.toLocaleString(), 
    sub: 'rows loaded', 
    color: '#4f8ef7',
    icon: '📊'
  });

  const numericCols = Object.entries(roles)
    .filter(([, r]) => r === 'numeric')
    .map(([c]) => c)
    .slice(0, 3);

  const colors = ['#6ee7b7','#fbbf24','#f472b6'];
  const icons = ['💰', '📈', '🎯'];
  
  numericCols.forEach((col, i) => {
    const vals = data.map(r => Number(r[col]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    
    kpis.push({
      label: col,
      value: formatNumber(sum),
      sub: `Avg: ${formatNumber(avg)}`,
      color: colors[i],
      icon: icons[i]
    });
  });

  const catCols = Object.entries(roles)
    .filter(([, r]) => r === 'category')
    .map(([c]) => c);
  
  catCols.slice(0, 2).forEach((col, i) => {
    const unique = new Set(data.map(r => r[col])).size;
    kpis.push({ 
      label: `${col} (unique)`, 
      value: unique, 
      sub: 'distinct values', 
      color: ['#a78bfa', '#38bdf8'][i],
      icon: ['🏷', '🔖'][i]
    });
  });

  return kpis.slice(0, 6);
}

// ── Auto-detect Best Charts ──────────────────
function autoDetectCharts(data, roles) {
  const suggestions = [];
  const cols = Object.keys(roles);
  const dateCols = cols.filter(c => roles[c] === 'date');
  const numCols = cols.filter(c => roles[c] === 'numeric');
  const catCols = cols.filter(c => roles[c] === 'category');

  const dateCol = dateCols[0];
  const numCol = numCols[0];
  const catCol = catCols[0];
  const numCol2 = numCols[1];

  // Time-series
  if (dateCol && numCol) {
    suggestions.push({ 
      type: 'area', 
      xKey: dateCol, 
      yKey: numCol, 
      title: `${numCol} over Time`,
      groupKey: null,
      agg: 'sum'
    });
  }

  // Category comparisons
  if (catCol && numCol) {
    suggestions.push({ 
      type: 'bar', 
      xKey: catCol, 
      yKey: numCol, 
      title: `${numCol} by ${catCol}`,
      groupKey: null,
      agg: 'sum'
    });
    
    suggestions.push({ 
      type: 'donut', 
      xKey: catCol, 
      yKey: numCol, 
      title: `${catCol} Distribution`,
      groupKey: null,
      agg: 'sum'
    });
  }

  // Scatter plot
  if (numCols.length >= 2) {
    suggestions.push({ 
      type: 'scatter', 
      xKey: numCols[0], 
      yKey: numCols[1], 
      title: `${numCols[0]} vs ${numCols[1]}`,
      groupKey: null,
      agg: 'sum'
    });
  }

  // Category-only pie
  if (catCol && !numCol) {
    suggestions.push({ 
      type: 'pie', 
      xKey: catCol, 
      yKey: null, 
      title: `${catCol} Count`,
      groupKey: null,
      agg: 'count'
    });
  }

  return suggestions.slice(0, 4);
}

// ── Data Validation ──────────────────────────
function validateChartData(xKey, yKey, data) {
  if (!xKey) return { valid: false, error: 'X axis not selected' };
  if (!yKey && ![null, ''].includes(yKey)) return { valid: false, error: 'Y axis not selected' };
  if (!data || !data.length) return { valid: false, error: 'No data available' };
  return { valid: true };
}
