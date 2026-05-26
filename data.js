/* =============================================
   DATA.JS — Excel Parsing, Aggregation, Analysis
   ============================================= */

let _rawData = [];
let _columns = [];
let _detectedRoles = {};

// ── Parse Excel ──────────────────────────────
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        resolve({ rows: json, sheetName: wb.SheetNames[0] });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Store & Analyse ───────────────────────────
function loadData(rows) {
  _rawData = rows;
  _columns = rows.length ? Object.keys(rows[0]) : [];
  _detectedRoles = {};
  _columns.forEach(col => {
    const hintRole = detectColumnRole(col);
    if (hintRole) {
      _detectedRoles[col] = hintRole;
    } else {
      _detectedRoles[col] = isNumericColumn(rows, col) ? 'numeric' : 'category';
    }
  });
  return { columns: _columns, roles: _detectedRoles };
}

function getRawData() { return _rawData; }
function getColumns() { return _columns; }
function getRoles()   { return _detectedRoles; }

// ── Aggregation ───────────────────────────────
function aggregate(data, xKey, yKey, groupKey, method) {
  if (!xKey || !yKey) return null;

  const grouped = {};

  data.forEach(row => {
    const x = String(row[xKey] ?? '—');
    const y = Number(row[yKey]) || 0;
    const g = groupKey ? String(row[groupKey] ?? 'Other') : '__single__';

    if (!grouped[x]) grouped[x] = {};
    if (!grouped[x][g]) grouped[x][g] = [];
    grouped[x][g].push(y);
  });

  const xCategories = Object.keys(grouped);
  const groupNames = [...new Set(
    data.map(r => groupKey ? String(r[groupKey] ?? 'Other') : '__single__')
  )];

  const series = groupNames.map(g => {
    const seriesData = xCategories.map(x => {
      const vals = grouped[x]?.[g] || [];
      return applyAgg(vals, method);
    });
    return { name: g === '__single__' ? yKey : g, data: seriesData };
  });

  return { categories: xCategories, series };
}

function applyAgg(vals, method) {
  if (!vals.length) return 0;
  switch (method) {
    case 'sum':   return vals.reduce((a, b) => a + b, 0);
    case 'count': return vals.length;
    case 'avg':   return vals.reduce((a, b) => a + b, 0) / vals.length;
    case 'max':   return Math.max(...vals);
    case 'min':   return Math.min(...vals);
    default:      return vals.reduce((a, b) => a + b, 0);
  }
}

// ── Category distribution (for pie/donut/treemap) ─
function countByCategory(data, catKey, valueKey, method) {
  const map = {};
  data.forEach(row => {
    const cat = String(row[catKey] ?? '—');
    if (!map[cat]) map[cat] = [];
    const v = valueKey ? (Number(row[valueKey]) || 0) : 1;
    map[cat].push(v);
  });
  const labels = Object.keys(map);
  const values = labels.map(l => applyAgg(map[l], method || 'sum'));
  return { labels, values };
}

// ── KPI Analysis ──────────────────────────────
function computeKPIs(data, roles) {
  const kpis = [];

  // Row count
  kpis.push({ label: 'Total Rows', value: data.length.toLocaleString(), sub: 'records loaded', color: '#4f8ef7' });

  // Numeric columns → sum/avg
  const numericCols = Object.entries(roles)
    .filter(([, r]) => r === 'numeric')
    .map(([c]) => c)
    .slice(0, 3);

  numericCols.forEach((col, i) => {
    const vals = data.map(r => Number(r[col]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const colors = ['#6ee7b7','#fbbf24','#f472b6'];
    kpis.push({
      label: col,
      value: formatNumber(sum),
      sub: `Avg: ${formatNumber(sum / data.length)}`,
      color: colors[i],
    });
  });

  // Category column → unique count
  const catCol = Object.entries(roles).find(([, r]) => r === 'category')?.[0];
  if (catCol) {
    const unique = new Set(data.map(r => r[catCol])).size;
    kpis.push({ label: `${catCol} (unique)`, value: unique, sub: 'distinct values', color: '#a78bfa' });
  }

  return kpis;
}

// ── Auto-detect best charts ───────────────────
function autoDetectCharts(data, roles) {
  const suggestions = [];
  const cols = Object.keys(roles);
  const dateCols   = cols.filter(c => roles[c] === 'date');
  const numCols    = cols.filter(c => roles[c] === 'numeric');
  const catCols    = cols.filter(c => roles[c] === 'category');

  const dateCol  = dateCols[0];
  const numCol   = numCols[0];
  const catCol   = catCols[0];

  if (dateCol && numCol) {
    suggestions.push({ type: 'area', xKey: dateCol, yKey: numCol, title: `${numCol} over ${dateCol}` });
  }
  if (catCol && numCol) {
    suggestions.push({ type: 'bar',  xKey: catCol, yKey: numCol, title: `${numCol} by ${catCol}` });
    suggestions.push({ type: 'donut', xKey: catCol, yKey: numCol, title: `${catCol} Distribution` });
  }
  if (numCols.length >= 2) {
    suggestions.push({ type: 'scatter', xKey: numCols[0], yKey: numCols[1], title: `${numCols[0]} vs ${numCols[1]}` });
  }
  if (catCol && !numCol) {
    suggestions.push({ type: 'pie', xKey: catCol, yKey: null, title: `${catCol} Distribution` });
  }

  return suggestions.slice(0, 4);
}

// ── Helpers ───────────────────────────────────
function formatNumber(n) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number(n.toFixed(2)).toLocaleString();
}
