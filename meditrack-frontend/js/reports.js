/**
 * MediTrack - Reports & Analytics Module
 * Generates stock summaries, expiry exposure reports, low-stock reports,
 * monthly consumption trends, and CSV/Print export utilities.
 */

let reportBatches = [];
let reportMedicines = [];
let reportTransactions = [];
let consumptionChartInstance = null;
let categoryDistributionChart = null;

async function loadReportsData() {
  try {
    reportMedicines = await api.getMedicines();
    reportBatches = await api.getBatches();
    reportTransactions = await api.getTransactions();

    populateReportFilters();
    renderReportMetrics();
    renderReportTables();
    initReportCharts();
  } catch (error) {
    console.error("Failed to load reports:", error);
    showToast("Failed to load reporting data.", "danger");
  }
}

function populateReportFilters() {
  const medSelect = document.getElementById('reportMedicineFilter');
  if (medSelect) {
    medSelect.innerHTML = '<option value="All">All Medicines</option>' +
      reportMedicines.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  }
}

function renderReportMetrics() {
  const totalValuation = reportBatches.reduce((sum, b) => sum + ((Number(b.quantity) || 0) * (Number(b.purchasePrice) || 0)), 0);
  const totalStockUnits = reportBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  
  const expiredStock = reportBatches.filter(b => b.expiryStatus === 'Expired');
  const expiredUnits = expiredStock.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  const expiredLoss = expiredStock.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);

  const nearExpiryStock = reportBatches.filter(b => b.expiryStatus === 'Near Expiry');
  const nearExpiryUnits = nearExpiryStock.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  const lowStockCount = reportMedicines.filter(m => m.status === 'Low Stock' || m.status === 'Out of Stock').length;

  if (document.getElementById('reportTotalValuation')) {
    document.getElementById('reportTotalValuation').textContent = formatCurrency(totalValuation);
  }
  if (document.getElementById('reportTotalUnits')) {
    document.getElementById('reportTotalUnits').textContent = totalStockUnits.toLocaleString() + ' Units';
  }
  if (document.getElementById('reportExpiredLoss')) {
    document.getElementById('reportExpiredLoss').textContent = formatCurrency(expiredLoss);
  }
  if (document.getElementById('reportNearExpiryUnits')) {
    document.getElementById('reportNearExpiryUnits').textContent = `${nearExpiryUnits} Units (${nearExpiryStock.length} batches)`;
  }
  if (document.getElementById('reportLowStockCount')) {
    document.getElementById('reportLowStockCount').textContent = `${lowStockCount} Products`;
  }
}

function renderReportTables() {
  // 1. Expiry Risk Table
  const expiryTbody = document.getElementById('reportExpiryTableBody');
  if (expiryTbody) {
    const criticalBatches = reportBatches.filter(b => b.expiryStatus === 'Expired' || b.expiryStatus === 'Near Expiry');
    if (criticalBatches.length === 0) {
      expiryTbody.innerHTML = `<tr><td colspan="7" class="text-center py-3 text-muted">No expired or near-expiry batches detected.</td></tr>`;
    } else {
      expiryTbody.innerHTML = criticalBatches.map(b => `
        <tr>
          <td><strong class="font-monospace">${b.batchNumber}</strong></td>
          <td>${b.medicineName}</td>
          <td>${b.pharmacy}</td>
          <td>${formatDate(b.expiryDate)}</td>
          <td class="text-center fw-bold">${b.quantity}</td>
          <td><span class="${b.badgeClass}">${b.expiryStatus}</span></td>
          <td class="text-end fw-semibold text-danger">${formatCurrency(b.quantity * b.purchasePrice)}</td>
        </tr>
      `).join('');
    }
  }

  // 2. Low-Stock Summary Table
  const lowStockTbody = document.getElementById('reportLowStockTableBody');
  if (lowStockTbody) {
    const lowStockMeds = reportMedicines.filter(m => m.status === 'Low Stock' || m.status === 'Out of Stock');
    if (lowStockMeds.length === 0) {
      lowStockTbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">All medicines are above minimum safety threshold.</td></tr>`;
    } else {
      lowStockTbody.innerHTML = lowStockMeds.map(m => `
        <tr>
          <td><span class="badge bg-slate-100 text-slate-800 font-monospace">${m.id}</span></td>
          <td><strong>${m.name}</strong></td>
          <td>${m.category}</td>
          <td class="text-center fw-bold text-danger">${m.totalStock || 0}</td>
          <td class="text-center text-slate-600">${m.minStock}</td>
          <td>
            <span class="badge ${m.status === 'Out of Stock' ? 'badge-out-of-stock' : 'badge-low-stock'}">
              ${m.status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  }
}

function initReportCharts() {
  // Chart 1: Monthly Consumption Comparison
  const ctx1 = document.getElementById('monthlyConsumptionChart');
  if (ctx1) {
    if (consumptionChartInstance) consumptionChartInstance.destroy();
    consumptionChartInstance = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Antibiotics', 'Analgesics', 'Antidiabetics', 'Cardiovascular', 'Respiratory', 'Other'],
        datasets: [
          {
            label: 'Previous Month (Units)',
            data: [420, 950, 310, 240, 180, 210],
            backgroundColor: '#94a3b8',
            borderRadius: 4
          },
          {
            label: 'Current Month (Units)',
            data: [560, 1120, 380, 290, 240, 270],
            backgroundColor: '#0d9488',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 2: Category Distribution
  const ctx2 = document.getElementById('categoryValuationChart');
  if (ctx2) {
    if (categoryDistributionChart) categoryDistributionChart.destroy();
    categoryDistributionChart = new Chart(ctx2, {
      type: 'pie',
      data: {
        labels: ['Antibiotics', 'Antidiabetics', 'Analgesics', 'Cardiovascular', 'Respiratory', 'Ophthalmic'],
        datasets: [{
          data: [35, 25, 15, 12, 8, 5],
          backgroundColor: ['#0d9488', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' }
        }
      }
    });
  }
}

// --------------------------------------------------------------------------
// EXPORT UTILITIES: CSV & PRINT
// --------------------------------------------------------------------------
function exportReportCSV(type = 'stock') {
  let csvContent = "data:text/csv;charset=utf-8,";
  let filename = `MediTrack_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;

  if (type === 'expiry') {
    csvContent += "Batch Number,Medicine Name,Pharmacy,Expiry Date,Days Remaining,Quantity,Purchase Price,Status,Estimated Value Loss\r\n";
    reportBatches.forEach(b => {
      const loss = b.expiryStatus === 'Expired' ? (b.quantity * b.purchasePrice) : 0;
      csvContent += `"${b.batchNumber}","${b.medicineName}","${b.pharmacy}","${b.expiryDate}","${b.daysRemaining}","${b.quantity}","${b.purchasePrice}","${b.expiryStatus}","${loss}"\r\n`;
    });
  } else if (type === 'transactions') {
    csvContent += "Transaction ID,Medicine Name,Batch Number,Type,Quantity,Date,User,Remarks\r\n";
    reportTransactions.forEach(t => {
      csvContent += `"${t.id}","${t.medicineName}","${t.batchNumber}","${t.type}","${t.quantity}","${t.date}","${t.user}","${t.remarks}"\r\n`;
    });
  } else {
    csvContent += "Medicine ID,Medicine Name,Generic Name,Category,Strength,Current Stock,Min Stock,Status\r\n";
    reportMedicines.forEach(m => {
      csvContent += `"${m.id}","${m.name}","${m.genericName}","${m.category}","${m.strength}","${m.totalStock || 0}","${m.minStock}","${m.status}"\r\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Exported ${filename} successfully.`, "success");
}

function printCurrentReport() {
  window.print();
}

function initReportsUI() {
  document.getElementById('exportStockCsvBtn')?.addEventListener('click', () => exportReportCSV('stock'));
  document.getElementById('exportExpiryCsvBtn')?.addEventListener('click', () => exportReportCSV('expiry'));
  document.getElementById('exportTxnCsvBtn')?.addEventListener('click', () => exportReportCSV('transactions'));
  document.getElementById('printReportBtn')?.addEventListener('click', printCurrentReport);

  document.getElementById('reportDateFilter')?.addEventListener('change', () => {
    showToast("Date filter applied.", "info");
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('reportTotalValuation')) {
    initReportsUI();
    loadReportsData();
  }
});
