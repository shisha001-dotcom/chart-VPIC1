/* =============================================
   UTILS.JS — Utility Functions
   ============================================= */

function formatNumber(n) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number(n.toFixed(2)).toLocaleString();
}

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function showSpinner(show = true) {
  const spinner = document.getElementById('spinner');
  if (show) {
    spinner.classList.add('show');
  } else {
    spinner.classList.remove('show');
  }
}

async function downloadPNG(elementId, filename = 'chart.png') {
  try {
    showSpinner(true);
    const element = document.getElementById(elementId);
    const canvas = await html2canvas(element, {
      backgroundColor: '#0d0f12',
      scale: 2,
      logging: false,
    });
    
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
    
    showToast('✓ Chart exported successfully!', 'success');
  } catch (err) {
    console.error('Export error:', err);
    showToast('Error exporting chart', 'error');
  } finally {
    showSpinner(false);
  }
}

function exportChartSVG(chartId, filename = 'chart.svg') {
  try {
    const chartElement = document.querySelector(`#${chartId} .apexcharts-svg`);
    if (!chartElement) throw new Error('Chart not found');
    
    const svgData = new XMLSerializer().serializeToString(chartElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = chartElement.clientWidth;
    canvas.height = chartElement.clientHeight;
    
    img.onload = function() {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = filename;
      link.click();
      showToast('✓ Chart exported!', 'success');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  } catch (err) {
    console.error('SVG export error:', err);
    showToast('Error exporting chart', 'error');
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function generateRandomId() {
  return Math.random().toString(36).substr(2, 9);
}

function getContrastColor(hexColor) {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#000000' : '#ffffff';
}

function roundNumber(num, decimals = 2) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
