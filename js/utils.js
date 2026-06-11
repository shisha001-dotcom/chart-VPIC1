/* =============================================
   UTILS — Hàm tiện ích dùng chung
   Thêm helper mới vào đây, không phụ thuộc
   vào module khác ngoài DOM.
   ============================================= */

function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number(n.toFixed(2)).toLocaleString('vi-VN');
}

function roundNumber(num, dec = 2) {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

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
