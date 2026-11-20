/**
 * MediTrack - Alerts & Clinical Notifications Module
 * Tracks expired medicine, near-expiry, low-stock, and out-of-stock critical notices.
 */

let allAlerts = [];
let currentCategoryFilter = 'All';

async function loadAlerts() {
  const tbody = document.getElementById('alertsTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-teal"></div></td></tr>`;
  }

  try {
    allAlerts = await api.getAlerts();
    updateAlertCategoryCounts();
    renderAlertsTable();
  } catch (error) {
    console.error("Failed to load alerts:", error);
    showToast("Failed to fetch alerts.", "danger");
  }
}

function updateAlertCategoryCounts() {
  const expired = allAlerts.filter(a => a.type === 'EXPIRED').length;
  const nearExpiry = allAlerts.filter(a => a.type === 'NEAR_EXPIRY').length;
  const lowStock = allAlerts.filter(a => a.type === 'LOW_STOCK').length;
  const outOfStock = allAlerts.filter(a => a.type === 'OUT_OF_STOCK').length;
  const totalActive = allAlerts.filter(a => a.status === 'Active').length;

  if (document.getElementById('countAllAlerts')) document.getElementById('countAllAlerts').textContent = allAlerts.length;
  if (document.getElementById('countExpiredAlerts')) document.getElementById('countExpiredAlerts').textContent = expired;
  if (document.getElementById('countNearExpiryAlerts')) document.getElementById('countNearExpiryAlerts').textContent = nearExpiry;
  if (document.getElementById('countLowStockAlerts')) document.getElementById('countLowStockAlerts').textContent = lowStock;
  if (document.getElementById('countOutOfStockAlerts')) document.getElementById('countOutOfStockAlerts').textContent = outOfStock;

  // Header notification bell badge
  const headerBadge = document.getElementById('headerAlertCount');
  if (headerBadge) {
    headerBadge.textContent = totalActive;
    headerBadge.style.display = totalActive > 0 ? 'inline-flex' : 'none';
  }
}

function renderAlertsTable() {
  const tbody = document.getElementById('alertsTableBody');
  if (!tbody) return;

  const searchTerm = (document.getElementById('alertSearchInput')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('alertStatusFilter')?.value || 'All';

  const filtered = allAlerts.filter(alert => {
    const matchesCategory = currentCategoryFilter === 'All' || alert.type === currentCategoryFilter;
    const matchesStatus = statusFilter === 'All' || alert.status === statusFilter;
    const matchesSearch = 
      alert.medicineName.toLowerCase().includes(searchTerm) ||
      (alert.batchNumber && alert.batchNumber.toLowerCase().includes(searchTerm)) ||
      (alert.actionSuggested && alert.actionSuggested.toLowerCase().includes(searchTerm));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-5 text-slate-400">
          <i class="bi bi-bell-slash display-6 d-block mb-2"></i>
          No alerts found under current filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(alert => {
    let typeBadge = '';
    let iconClass = '';

    if (alert.type === 'EXPIRED') {
      typeBadge = '<span class="badge badge-expired"><i class="bi bi-x-octagon me-1"></i>Expired</span>';
      iconClass = 'text-danger';
    } else if (alert.type === 'NEAR_EXPIRY') {
      typeBadge = '<span class="badge badge-near-expiry"><i class="bi bi-exclamation-triangle me-1"></i>Near Expiry</span>';
      iconClass = 'text-warning';
    } else if (alert.type === 'LOW_STOCK') {
      typeBadge = '<span class="badge badge-low-stock"><i class="bi bi-arrow-down-circle me-1"></i>Low Stock</span>';
      iconClass = 'text-warning';
    } else {
      typeBadge = '<span class="badge badge-out-of-stock"><i class="bi bi-slash-circle me-1"></i>Out of Stock</span>';
      iconClass = 'text-danger';
    }

    let statusClass = 'bg-secondary-subtle text-secondary';
    if (alert.status === 'Active') statusClass = 'bg-danger-subtle text-danger fw-bold';
    else if (alert.status === 'Acknowledged') statusClass = 'bg-warning-subtle text-warning-emphasis fw-bold';
    else if (alert.status === 'Resolved') statusClass = 'bg-success-subtle text-success fw-bold';

    return `
      <tr class="${alert.status === 'Active' ? 'table-warning-subtle' : ''}">
        <td><strong class="font-monospace text-slate-700">${alert.id}</strong></td>
        <td>
          <div class="fw-bold text-slate-800">${alert.medicineName}</div>
          <div class="small text-slate-500">${alert.actionSuggested || ''}</div>
        </td>
        <td><span class="font-monospace fw-medium">${alert.batchNumber || 'N/A'}</span></td>
        <td class="text-center">
          <span class="fw-bold ${alert.quantity === 0 ? 'text-danger' : 'text-slate-800'}">${alert.quantity}</span>
        </td>
        <td><span class="fw-medium">${formatDate(alert.expiryDate)}</span></td>
        <td>${typeBadge}</td>
        <td class="small text-slate-500">${formatDate(alert.date)}</td>
        <td><span class="badge ${statusClass} px-2 py-1">${alert.status}</span></td>
        <td class="text-end">
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
              Action
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
              ${alert.status !== 'Acknowledged' && alert.status !== 'Resolved' ? `
                <li><a class="dropdown-item" href="javascript:void(0)" onclick="updateAlertStatus('${alert.id}', 'Acknowledged')">
                  <i class="bi bi-check2 text-warning me-2"></i>Acknowledge
                </a></li>
              ` : ''}
              ${alert.status !== 'Resolved' ? `
                <li><a class="dropdown-item" href="javascript:void(0)" onclick="resolveAlert('${alert.id}', '${alert.type}')">
                  <i class="bi bi-check2-circle text-success me-2"></i>Mark as Resolved
                </a></li>
              ` : ''}
              ${alert.type === 'EXPIRED' ? `
                <li><a class="dropdown-item" href="javascript:void(0)" onclick="quarantineFromAlert('${alert.id}', '${alert.batchNumber}')">
                  <i class="bi bi-trash text-danger me-2"></i>Initiate Disposal
                </a></li>
              ` : ''}
              ${alert.type === 'LOW_STOCK' || alert.type === 'OUT_OF_STOCK' ? `
                <li><a class="dropdown-item" href="inventory.html">
                  <i class="bi bi-bag-plus text-teal me-2"></i>Order Stock
                </a></li>
              ` : ''}
            </ul>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateAlertStatus(id, newStatus) {
  try {
    await api.updateAlert(id, { status: newStatus });
    showToast(`Alert marked as ${newStatus}.`, "info");
    await loadAlerts();
  } catch (err) {
    showToast("Failed to update alert.", "danger");
  }
}

async function resolveAlert(id, type) {
  showConfirm("Resolve Alert", "Confirm that the necessary corrective action (quarantine, disposal, or reordering) has been completed?", async () => {
    try {
      await api.updateAlert(id, { status: 'Resolved' });
      showToast("Alert resolved successfully.", "success");
      await loadAlerts();
    } catch (e) {
      showToast("Failed to resolve alert.", "danger");
    }
  });
}

function quarantineFromAlert(id, batchNumber) {
  showConfirm("Quarantine & Disposal", `Initiate immediate disposal protocol for Expired Batch ${batchNumber}?`, async () => {
    try {
      await api.updateAlert(id, { status: 'Resolved' });
      showToast(`Batch ${batchNumber} disposal ticket filed with QA bio-safety team.`, "success");
      await loadAlerts();
    } catch (e) {
      showToast("Error processing disposal.", "danger");
    }
  });
}

function acknowledgeAllAlerts() {
  showConfirm("Acknowledge All Alerts", "Mark all active inventory alerts as acknowledged?", async () => {
    try {
      for (const alert of allAlerts) {
        if (alert.status === 'Active') {
          await api.updateAlert(alert.id, { status: 'Acknowledged' });
        }
      }
      showToast("All active alerts acknowledged.", "success");
      await loadAlerts();
    } catch (e) {
      showToast("Failed to update alerts.", "danger");
    }
  });
}

function initAlertsUI() {
  // Category tabs
  document.querySelectorAll('.alert-cat-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.alert-cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategoryFilter = tab.getAttribute('data-category');
      renderAlertsTable();
    });
  });

  document.getElementById('alertSearchInput')?.addEventListener('input', renderAlertsTable);
  document.getElementById('alertStatusFilter')?.addEventListener('change', renderAlertsTable);
  document.getElementById('acknowledgeAllBtn')?.addEventListener('click', acknowledgeAllAlerts);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('alertsTableBody')) {
    initAlertsUI();
    loadAlerts();
  }
});
