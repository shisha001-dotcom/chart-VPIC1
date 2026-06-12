/* =============================================
   SHEET PICKER — Chọn trang tính & nhận diện bảng
   Phụ thuộc: utils.js, data.js

   Flow:
     openSheetPicker(wb)
       → người dùng chọn sheet
       → detectTablesInSheet(wb, sheetName)
           → tìm tất cả bảng dữ liệu trong sheet
       → nếu 1 bảng  → dùng luôn
       → nếu nhiều bảng → mở TablePicker cho người dùng chọn
       → callback onTableSelected(rows, sheetName, tableInfo)

   Để mở rộng:
   - Tinh chỉnh ngưỡng nhận diện: sửa MIN_COLS, MIN_ROWS,
     MIN_NUMERIC_RATIO trong DETECT_CONFIG
   - Thay đổi UI preview: sửa buildTablePreviewHTML()
   ============================================= */

// ── Cấu hình nhận diện bảng ────────────────────
const DETECT_CONFIG = {
  MIN_COLS:          2,    // tối thiểu số cột để coi là bảng
  MIN_ROWS:          2,    // tối thiểu số dòng data (không kể header)
  MIN_FILL_RATIO:    0.4,  // tối thiểu 40% ô trong vùng phải có giá trị
  GAP_ROWS:          2,    // số dòng trống liên tiếp = kết thúc bảng
  GAP_COLS:          2,    // số cột trống liên tiếp = kết thúc bảng
  PREVIEW_ROWS:      5,    // số dòng hiển thị preview
  HEADER_SKIP_MAX:   10,   // tối đa bao nhiêu dòng đầu bỏ qua khi tìm header
};

// ── State ──────────────────────────────────────
let _onTableSelected = null; // callback(rows, sheetName, tableInfo)
let _currentWb       = null;
let _detectedTables  = [];

// ── Public API ─────────────────────────────────

/**
 * Mở Sheet Picker modal
 * @param {object}   wb          - XLSX workbook object
 * @param {function} onSelected  - callback(rows, sheetName, tableInfo)
 */
function openSheetPicker(wb, onSelected) {
  _currentWb       = wb;
  _onTableSelected = onSelected;
  _renderSheetPickerModal(wb);
  document.getElementById('spOverlay').classList.add('show');
}

function closeSheetPicker() {
  document.getElementById('spOverlay').classList.remove('show');
}

// ── Table detection engine ─────────────────────

/**
 * Đọc raw cell matrix từ sheet (không dùng sheet_to_json)
 * Trả về { matrix, rowCount, colCount }
 */
function _getSheetMatrix(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet || !sheet['!ref']) return { matrix: [], rowCount: 0, colCount: 0 };

  const range    = XLSX.utils.decode_range(sheet['!ref']);
  const rowCount = range.e.r - range.s.r + 1;
  const colCount = range.e.c - range.s.c + 1;
  const matrix   = [];

  for (let r = 0; r < rowCount; r++) {
    const row = [];
    for (let c = 0; c < colCount; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
      const cell     = sheet[cellAddr];
      row.push(cell ? (cell.v !== undefined ? cell.v : null) : null);
    }
    matrix.push(row);
  }
  return { matrix, rowCount, colCount };
}

/**
 * Kiểm tra một dòng có "trống" không
 * (trống = tất cả ô null/undefined/empty string)
 */
function _isEmptyRow(row) {
  return row.every(v => v === null || v === undefined || v === '');
}

/**
 * Kiểm tra một cột có "trống" không trong vùng [rStart, rEnd]
 */
function _isEmptyCol(matrix, col, rStart, rEnd) {
  for (let r = rStart; r <= rEnd; r++) {
    const v = matrix[r]?.[col];
    if (v !== null && v !== undefined && v !== '') return false;
  }
  return true;
}

/**
 * Tính tỉ lệ ô có giá trị trong vùng
 */
function _fillRatio(matrix, rStart, rEnd, cStart, cEnd) {
  let total = 0, filled = 0;
  for (let r = rStart; r <= rEnd; r++) {
    for (let c = cStart; c <= cEnd; c++) {
      total++;
      const v = matrix[r]?.[c];
      if (v !== null && v !== undefined && v !== '') filled++;
    }
  }
  return total ? filled / total : 0;
}

/**
 * Từ một điểm bắt đầu (rStart, cStart), mở rộng để tìm biên của bảng.
 * Kết thúc khi gặp GAP_ROWS dòng trống liên tiếp hoặc hết sheet.
 */
function _expandTable(matrix, rStart, cStart, rowCount, colCount) {
  // Tìm biên dưới
  let rEnd         = rStart;
  let emptyStreak  = 0;
  for (let r = rStart; r < rowCount; r++) {
    const rowSlice = matrix[r].slice(cStart);
    if (_isEmptyRow(rowSlice)) {
      emptyStreak++;
      if (emptyStreak >= DETECT_CONFIG.GAP_ROWS) break;
    } else {
      emptyStreak = 0;
      rEnd = r;
    }
  }

  // Tìm biên phải
  let cEnd = cStart;
  for (let c = cStart; c < colCount; c++) {
    if (!_isEmptyCol(matrix, c, rStart, rEnd)) {
      cEnd = c;
    } else {
      // Cho phép GAP_COLS cột trống liên tiếp
      let gapCount = 0;
      for (let gc = c; gc < Math.min(c + DETECT_CONFIG.GAP_COLS, colCount); gc++) {
        if (_isEmptyCol(matrix, gc, rStart, rEnd)) gapCount++;
      }
      if (gapCount >= DETECT_CONFIG.GAP_COLS) break;
    }
  }

  return { rStart, rEnd, cStart, cEnd };
}

/**
 * Tìm dòng header trong vùng bảng:
 * Header thường là dòng đầu tiên có nhiều ô text liên tiếp.
 */
function _findHeaderRow(matrix, rStart, rEnd, cStart, cEnd) {
  const maxScan = Math.min(rStart + DETECT_CONFIG.HEADER_SKIP_MAX, rEnd);
  for (let r = rStart; r <= maxScan; r++) {
    const row          = matrix[r].slice(cStart, cEnd + 1);
    const nonEmpty     = row.filter(v => v !== null && v !== undefined && v !== '');
    const textCount    = nonEmpty.filter(v => typeof v === 'string').length;
    const fillRatioRow = nonEmpty.length / row.length;

    // Header: fill > 50% và đa số là string
    if (fillRatioRow >= 0.5 && textCount / Math.max(nonEmpty.length, 1) >= 0.5) {
      return r;
    }
  }
  return rStart; // fallback
}

/**
 * Chuyển vùng bảng thành mảng object [{col: value}]
 */
function _regionToRows(matrix, region) {
  const { rStart, rEnd, cStart, cEnd } = region;
  const headerRow = _findHeaderRow(matrix, rStart, rEnd, cStart, cEnd);

  // Lấy tên cột từ header row, đảm bảo không trùng
  const headers = [];
  const usedNames = {};
  for (let c = cStart; c <= cEnd; c++) {
    let name = String(matrix[headerRow]?.[c] ?? '').trim() || `Col${c - cStart + 1}`;
    if (usedNames[name]) {
      usedNames[name]++;
      name = `${name}_${usedNames[name]}`;
    } else {
      usedNames[name] = 1;
    }
    headers.push(name);
  }

  // Convert data rows
  const rows = [];
  for (let r = headerRow + 1; r <= rEnd; r++) {
    const row = matrix[r];
    if (_isEmptyRow(row.slice(cStart, cEnd + 1))) continue;
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[cStart + i] ?? '';
    });
    rows.push(obj);
  }

  return { headers, rows, headerRow };
}

/**
 * Hàm chính: quét toàn bộ sheet, trả về danh sách bảng tìm được
 * Mỗi bảng: { id, label, rows, headers, rowCount, colCount, region, fillRatio }
 */
function detectTablesInSheet(wb, sheetName) {
  const { matrix, rowCount, colCount } = _getSheetMatrix(wb, sheetName);
  if (!rowCount || !colCount) return [];

  const visited = Array.from({ length: rowCount }, () => new Array(colCount).fill(false));
  const tables  = [];

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (visited[r][c]) continue;
      const v = matrix[r]?.[c];
      if (v === null || v === undefined || v === '') continue;

      // Tìm vùng bảng bắt đầu từ (r, c)
      const region   = _expandTable(matrix, r, c, rowCount, colCount);
      const { rStart, rEnd, cStart, cEnd } = region;

      // Đánh dấu đã xét
      for (let rr = rStart; rr <= rEnd; rr++)
        for (let cc = cStart; cc <= cEnd; cc++)
          visited[rr][cc] = true;

      // Lọc vùng quá nhỏ
      const numCols = cEnd - cStart + 1;
      const numRows = rEnd - rStart + 1;
      if (numCols < DETECT_CONFIG.MIN_COLS || numRows < DETECT_CONFIG.MIN_ROWS + 1) continue;

      // Lọc vùng quá thưa
      const ratio = _fillRatio(matrix, rStart, rEnd, cStart, cEnd);
      if (ratio < DETECT_CONFIG.MIN_FILL_RATIO) continue;

      const { headers, rows } = _regionToRows(matrix, region);
      if (rows.length < DETECT_CONFIG.MIN_ROWS) continue;

      tables.push({
        id:        tables.length,
        label:     `Bảng ${tables.length + 1}`,
        headers,
        rows,
        rowCount:  rows.length,
        colCount:  headers.length,
        region,
        fillRatio: ratio,
        sheetName,
      });
    }
  }

  // Sắp theo size (lớn nhất lên đầu)
  tables.sort((a, b) => (b.rowCount * b.colCount) - (a.rowCount * a.colCount));

  // Đặt label lại sau khi sort
  tables.forEach((t, i) => { t.id = i; t.label = `Bảng ${i + 1}`; });

  return tables;
}

// ── UI: Sheet Picker Modal ─────────────────────

function _renderSheetPickerModal(wb) {
  const old = document.getElementById('spOverlay');
  if (old) old.remove();

  const sheetNames = wb.SheetNames;

  const overlay = document.createElement('div');
  overlay.id        = 'spOverlay';
  overlay.className = 'sp-overlay';
  overlay.innerHTML = `
    <div class="sp-modal">
      <div class="sp-header">
        <div class="sp-title">🗂 Chọn sheet / bảng dữ liệu</div>
        <button class="sp-close" id="spClose">✕</button>
      </div>
      <div class="sp-body">

        <!-- Step 1: Sheet list -->
        <div class="sp-step" id="spStep1">
          <div class="sp-step-label">Chọn trang tính — nhấn tên sheet để load ngay, hoặc nhấn "Chọn bảng" để lọc</div>
          <div class="sp-sheet-list" id="spSheetList"></div>
        </div>

        <!-- Step 2: Table picker -->
        <div class="sp-step" id="spStep2" style="display:none">
          <div class="sp-step-label">
            <span id="spStep2SheetName"></span>
            <button class="sp-back-btn" id="spBack">← Quay lại</button>
          </div>
          <div class="sp-table-list" id="spTableList"></div>
        </div>

      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Render sheet list
  const listEl = overlay.querySelector('#spSheetList');
  sheetNames.forEach(name => {
    const item = document.createElement('div');
    item.className = 'sp-sheet-item';

    // Tên sheet + badge dòng
    const nameEl = document.createElement('div');
    nameEl.className = 'sp-sheet-name';
    nameEl.textContent = name;

    try {
      const sheet = wb.Sheets[name];
      if (sheet && sheet['!ref']) {
        const range  = XLSX.utils.decode_range(sheet['!ref']);
        const badge  = document.createElement('span');
        badge.className   = 'sp-sheet-badge';
        badge.textContent = `${range.e.r - range.s.r + 1} dòng × ${range.e.c - range.s.c + 1} cột`;
        nameEl.appendChild(badge);
      }
    } catch(e) {}

    // Nút actions
    const actions = document.createElement('div');
    actions.className = 'sp-sheet-actions';

    const btnLoad = document.createElement('button');
    btnLoad.className   = 'sp-btn-load';
    btnLoad.textContent = '⚡ Load ngay';
    btnLoad.title       = 'Tự động nhận diện và load bảng lớn nhất';
    btnLoad.addEventListener('click', e => {
      e.stopPropagation();
      closeSheetPicker();
      _autoLoadSheet(_currentWb, name);
    });

    const btnPick = document.createElement('button');
    btnPick.className   = 'sp-btn-pick';
    btnPick.textContent = '🔍 Chọn bảng';
    btnPick.title       = 'Xem và chọn bảng cụ thể trong sheet này';
    btnPick.addEventListener('click', e => {
      e.stopPropagation();
      _onSheetSelected(name);
    });

    actions.append(btnLoad, btnPick);
    item.append(nameEl, actions);
    listEl.appendChild(item);
  });

  // Đóng
  overlay.querySelector('#spClose').addEventListener('click', closeSheetPicker);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSheetPicker(); });
  overlay.querySelector('#spBack').addEventListener('click', () => {
    overlay.querySelector('#spStep2').style.display = 'none';
    overlay.querySelector('#spStep1').style.display = 'block';
  });
}

function _onSheetSelected(sheetName) {
  showSpinner(true);
  setTimeout(() => {
    try {
      _detectedTables = detectTablesInSheet(_currentWb, sheetName);
      showSpinner(false);

      if (_detectedTables.length === 0) {
        showToast('Không tìm thấy bảng dữ liệu trong sheet này', 'error');
        return;
      }

      if (_detectedTables.length === 1) {
        closeSheetPicker();
        _onTableSelected?.(_detectedTables[0].rows, sheetName, _detectedTables[0]);
        return;
      }

      // Cập nhật label step 2
      const labelEl = document.getElementById('spStep2SheetName');
      if (labelEl) labelEl.textContent = `"${sheetName}" — chọn bảng muốn dùng`;

      _renderTablePicker(_detectedTables, sheetName);
    } catch(err) {
      showSpinner(false);
      showToast('Lỗi phân tích sheet: ' + err.message, 'error');
      console.error(err);
    }
  }, 30);
}

function _renderTablePicker(tables, sheetName) {
  const overlay = document.getElementById('spOverlay');
  overlay.querySelector('#spStep1').style.display = 'none';

  const step2  = overlay.querySelector('#spStep2');
  const listEl = overlay.querySelector('#spTableList');
  listEl.innerHTML = '';

  tables.forEach(tbl => {
    const card = document.createElement('div');
    card.className = 'sp-table-card';

    // Header info
    const meta = document.createElement('div');
    meta.className = 'sp-table-meta';
    meta.innerHTML = `
      <span class="sp-table-label">${tbl.label}</span>
      <span class="sp-table-stats">${tbl.rowCount} dòng × ${tbl.colCount} cột</span>
      <span class="sp-table-ratio">Độ đầy: ${Math.round(tbl.fillRatio * 100)}%</span>`;

    // Preview bảng
    const preview = document.createElement('div');
    preview.className = 'sp-table-preview';
    preview.innerHTML = _buildTablePreviewHTML(tbl);

    // Nút chọn
    const btn = document.createElement('button');
    btn.className   = 'sp-select-btn';
    btn.textContent = `✓ Dùng ${tbl.label}`;
    btn.addEventListener('click', () => {
      closeSheetPicker();
      _onTableSelected?.(tbl.rows, sheetName, tbl);
    });

    card.append(meta, preview, btn);
    listEl.appendChild(card);
  });

  step2.style.display = 'block';
}

function _buildTablePreviewHTML(tbl) {
  const previewRows = tbl.rows.slice(0, DETECT_CONFIG.PREVIEW_ROWS);
  const cols        = tbl.headers;

  let html = '<table class="sp-preview-table"><thead><tr>';
  cols.forEach(h => { html += `<th>${_esc(String(h))}</th>`; });
  html += '</tr></thead><tbody>';

  previewRows.forEach(row => {
    html += '<tr>';
    cols.forEach(h => { html += `<td>${_esc(String(row[h] ?? ''))}</td>`; });
    html += '</tr>';
  });

  if (tbl.rows.length > DETECT_CONFIG.PREVIEW_ROWS) {
    html += `<tr><td colspan="${cols.length}" class="sp-more-rows">… còn ${tbl.rows.length - DETECT_CONFIG.PREVIEW_ROWS} dòng nữa</td></tr>`;
  }

  html += '</tbody></table>';
  return html;
}

function _esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Setup (gọi từ app.js) ──────────────────────
function setupSheetPicker() {
  // Không cần làm gì thêm — openSheetPicker() được gọi từ ui.js
}
