/**
 * MediTrack - Batches & Expiry Management Module
 * Calculates days to expiry, manages expiry statuses, filtering, and batch CRUD
 */

let allBatches = [];
let filteredBatches = [];
let currentEditBatchId = null;

async function loadBatches() {
  const tbody = document.getElementById('batchesTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-teal"></div></td></tr>`;
  }

  try {
    allBatches = await api.getBatches();
    await populateMedicineDropdowns();
    updateBatchCounters();
    applyBatchFilters();
  } catch (error) {
    console.error("Failed to load batches:", error);
    showToast("Failed to retrieve batch records.", "danger");
  }
}

function updateBatchCounters() {
  const total = allBatches.length;
  const valid = allBatches.filter(b => b.expiryStatus === 'Valid').length;
  const upcoming = allBatches.filter(b => b.expiryStatus === 'Upcoming Expiry').length;
  const near = allBatches.filter(b => b.expiryStatus === 'Near Expiry').length;
  const expired = allBatches.filter(b => b.expiryStatus === 'Expired').length;

  if (document.getElementById('totalBatchesCount')) document.getElementById('totalBatchesCount').textContent = total;
  if (document.getElementById('validBatchesCount')) document.getElementById('validBatchesCount').textContent = valid;
  if (document.getElementById('nearExpiryBatchesCount')) document.getElementById('nearExpiryBatchesCount').textContent = near;
  if (document.getElementById('expiredBatchesCount')) document.getElementById('expiredBatchesCount').textContent = expired;
}

async function populateMedicineDropdowns() {
  const medicines = await api.getMedicines();
  const addSelect = document.getElementById('addBatchMedicine');
  const editSelect = document.getElementById('editBatchMedicine');

  const options = '<option value="" disabled selected>-- Select Medicine --</option>' + 
    medicines.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name} (${m.strength || ''})</option>`).join('');

  if (addSelect) addSelect.innerHTML = options;
  if (editSelect) editSelect.innerHTML = options;
}

function applyBatchFilters() {
  const searchTerm = (document.getElementById('batchSearchInput')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('batchStatusFilter')?.value || 'All';
  const pharmacyFilter = document.getElementById('batchPharmacyFilter')?.value || 'All';

  filteredBatches = allBatches.filter(batch => {
    const matchesSearch = 
      batch.batchNumber.toLowerCase().includes(searchTerm) ||
      batch.medicineName.toLowerCase().includes(searchTerm) ||
      (batch.supplier && batch.supplier.toLowerCase().includes(searchTerm));

    const matchesStatus = statusFilter === 'All' || batch.expiryStatus === statusFilter;
    const matchesPharmacy = pharmacyFilter === 'All' || batch.pharmacy === pharmacyFilter;

    return matchesSearch && matchesStatus && matchesPharmacy;
  });

  renderBatchesTable();
}

function renderBatchesTable() {
  const tbody = document.getElementById('batchesTableBody');
  if (!tbody) return;

  if (filteredBatches.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-5 text-slate-400">
          <i class="bi bi-calendar-x display-6 d-block mb-2"></i>
          No batches found matching filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredBatches.map(batch => {
    let daysBadge = '';
    if (batch.daysRemaining < 0) {
      daysBadge = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Expired ${Math.abs(batch.daysRemaining)}d ago</span>`;
    } else if (batch.daysRemaining <= 30) {
      daysBadge = `<span class="text-warning fw-bold"><i class="bi bi-exclamation-triangle me-1"></i>${batch.daysRemaining} days left</span>`;
    } else if (batch.daysRemaining <= 90) {
      daysBadge = `<span class="text-warning-emphasis fw-medium"><i class="bi bi-clock me-1"></i>${batch.daysRemaining} days left</span>`;
    } else {
      daysBadge = `<span class="text-success fw-medium"><i class="bi bi-check-circle me-1"></i>${batch.daysRemaining} days left</span>`;
    }

    return `
      <tr>
        <td><strong class="font-monospace text-slate-800">${batch.batchNumber}</strong></td>
        <td>
          <div class="fw-semibold text-slate-800">${batch.medicineName}</div>
          <div class="small text-slate-400">Pharmacy: ${batch.pharmacy || 'Central'}</div>
        </td>
        <td class="text-center">
          <span class="badge ${batch.quantity <= 20 ? 'bg-danger-subtle text-danger' : 'bg-slate-100 text-slate-800'} fs-6 fw-bold">
            ${batch.quantity}
          </span>
        </td>
        <td>
          <div class="fw-medium text-slate-700">${formatDate(batch.expiryDate)}</div>
          <div class="small text-slate-400">Mfg: ${formatDate(batch.mfgDate)}</div>
        </td>
        <td>${daysBadge}</td>
        <td><span class="${batch.badgeClass}">${batch.expiryStatus}</span></td>
        <td class="small text-slate-600">${batch.supplier || 'Direct'}</td>
        <td class="fw-medium text-slate-700">${formatCurrency(batch.purchasePrice)}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" title="Edit Batch" onclick="openEditBatchModal('${batch.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-warning" title="Quarantine / Adjust" onclick="quarantineBatch('${batch.id}', '${batch.batchNumber}')">
              <i class="bi bi-shield-slash"></i>
            </button>
            <button class="btn btn-outline-danger" title="Delete Batch" onclick="deleteBatchRecord('${batch.id}', '${batch.batchNumber}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// MODAL & CRUD ACTIONS
// --------------------------------------------------------------------------

function openAddBatchModal() {
  const form = document.getElementById('addBatchForm');
  if (form) form.reset();

  // Set default manufacturing date to 6 months ago, expiry to 18 months ahead
  const now = new Date();
  const mfg = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const exp = new Date(now.getFullYear() + 1, now.getMonth() + 6, 1);

  if (document.getElementById('addBatchMfg')) {
    document.getElementById('addBatchMfg').value = mfg.toISOString().split('T')[0];
  }
  if (document.getElementById('addBatchExpiry')) {
    document.getElementById('addBatchExpiry').value = exp.toISOString().split('T')[0];
  }

  const modalEl = document.getElementById('addBatchModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

function openEditBatchModal(id) {
  const batch = allBatches.find(b => b.id === id);
  if (!batch) return;

  currentEditBatchId = id;
  document.getElementById('editBatchId').value = batch.id;
  document.getElementById('editBatchNumber').value = batch.batchNumber;
  document.getElementById('editBatchMedicine').value = batch.medicineId;
  document.getElementById('editBatchPharmacy').value = batch.pharmacy || 'Central Hospital Pharmacy';
  document.getElementById('editBatchMfg').value = batch.mfgDate;
  document.getElementById('editBatchExpiry').value = batch.expiryDate;
  document.getElementById('editBatchQuantity').value = batch.quantity;
  document.getElementById('editBatchPrice').value = batch.purchasePrice;
  document.getElementById('editBatchSupplier').value = batch.supplier || '';

  const modalEl = document.getElementById('editBatchModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

function quarantineBatch(id, batchNumber) {
  showConfirm("Quarantine Batch", `Are you sure you want to flag Batch ${batchNumber} for clinical quarantine and removal from active inventory?`, async () => {
    try {
      await api.createTransaction({
        batchNumber: batchNumber,
        type: 'ADJUSTMENT',
        quantity: 0,
        remarks: `Quarantined Batch ${batchNumber} due to quality inspection`,
        user: auth.getUser()?.name || "Dr. Rajesh Sharma"
      });
      showToast(`Batch ${batchNumber} marked for quarantine inspection.`, "warning");
      await loadBatches();
    } catch (e) {
      showToast(e.message, "danger");
    }
  });
}

function deleteBatchRecord(id, batchNumber) {
  showConfirm("Delete Batch", `Delete batch ${batchNumber}? This cannot be undone.`, async () => {
    try {
      await api.deleteBatch(id);
      showToast(`Batch ${batchNumber} removed from inventory.`, "success");
      await loadBatches();
    } catch (e) {
      showToast("Failed to delete batch.", "danger");
    }
  });
}

function initBatchForms() {
  const addForm = document.getElementById('addBatchForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!addForm.checkValidity()) {
        e.stopPropagation();
        addForm.classList.add('was-validated');
        return;
      }

      const medSelect = document.getElementById('addBatchMedicine');
      const selectedOption = medSelect.options[medSelect.selectedIndex];
      const medicineName = selectedOption.getAttribute('data-name') || selectedOption.text;

      const batchData = {
        medicineId: medSelect.value,
        medicineName: medicineName,
        batchNumber: document.getElementById('addBatchNumber').value.trim().toUpperCase(),
        pharmacy: document.getElementById('addBatchPharmacy').value,
        mfgDate: document.getElementById('addBatchMfg').value,
        expiryDate: document.getElementById('addBatchExpiry').value,
        quantity: Number(document.getElementById('addBatchQuantity').value),
        purchasePrice: Number(document.getElementById('addBatchPrice').value),
        supplier: document.getElementById('addBatchSupplier').value.trim()
      };

      try {
        await api.createBatch(batchData);
        showToast(`Batch ${batchData.batchNumber} added successfully.`, "success");
        const modalEl = document.getElementById('addBatchModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        addForm.reset();
        addForm.classList.remove('was-validated');
        await loadBatches();
      } catch (err) {
        showToast(err.message, "danger");
      }
    });
  }

  const editForm = document.getElementById('editBatchForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!editForm.checkValidity()) {
        e.stopPropagation();
        editForm.classList.add('was-validated');
        return;
      }

      const medSelect = document.getElementById('editBatchMedicine');
      const selectedOption = medSelect.options[medSelect.selectedIndex];
      const medicineName = selectedOption.getAttribute('data-name') || selectedOption.text;

      const batchData = {
        medicineId: medSelect.value,
        medicineName: medicineName,
        batchNumber: document.getElementById('editBatchNumber').value.trim().toUpperCase(),
        pharmacy: document.getElementById('editBatchPharmacy').value,
        mfgDate: document.getElementById('editBatchMfg').value,
        expiryDate: document.getElementById('editBatchExpiry').value,
        quantity: Number(document.getElementById('editBatchQuantity').value),
        purchasePrice: Number(document.getElementById('editBatchPrice').value),
        supplier: document.getElementById('editBatchSupplier').value.trim()
      };

      try {
        await api.updateBatch(currentEditBatchId, batchData);
        showToast(`Batch ${batchData.batchNumber} updated successfully.`, "success");
        const modalEl = document.getElementById('editBatchModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        await loadBatches();
      } catch (err) {
        showToast(err.message, "danger");
      }
    });
  }

  document.getElementById('batchSearchInput')?.addEventListener('input', applyBatchFilters);
  document.getElementById('batchStatusFilter')?.addEventListener('change', applyBatchFilters);
  document.getElementById('batchPharmacyFilter')?.addEventListener('change', applyBatchFilters);
  document.getElementById('resetBatchFiltersBtn')?.addEventListener('click', () => {
    if (document.getElementById('batchSearchInput')) document.getElementById('batchSearchInput').value = '';
    if (document.getElementById('batchStatusFilter')) document.getElementById('batchStatusFilter').value = 'All';
    if (document.getElementById('batchPharmacyFilter')) document.getElementById('batchPharmacyFilter').value = 'All';
    applyBatchFilters();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('batchesTableBody')) {
    loadBatches();
  }
  initBatchForms();
});
