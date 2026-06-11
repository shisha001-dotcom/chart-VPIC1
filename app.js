/* =============================================
   APP — Entry point
   Thứ tự load (trong index.html):
     js/config.js → js/utils.js → js/data.js
     → js/charts.js → js/dashboard.js → js/ui.js
     → app.js

   Để thêm module mới:
   1. Tạo file js/ten-module.js
   2. Thêm <script src="js/ten-module.js"> vào
      index.html trước app.js
   3. Gọi setupXxx() ở dưới đây
   ============================================= */

(function init() {
  setupNavigation();
  setupSidebar();
  setupFileUpload();
  setupChartBuilder();
  setupTable();
  setupExportModal();
})();
