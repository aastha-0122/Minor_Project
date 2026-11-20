/**
 * MediTrack - Inventory & Stock Transactions Module
 * Manages Stock In (Receive), Stock Out (Dispense), Stock Adjustment,
 * strict quantity validation against live batch reserves, and Transaction History.
 */

let allTransactions = [];
let availableBatches = [];

async function loadInventoryData() {
  try {
    availableBatches = await api.getBatches();
    allTransactions = await api.getTransactions();
    populateBatchSelectors();
    renderTransactionsTable(allTransactions);
    updateInventorySummary();
  } catch (error) {
    console.error("Failed to load inventory:", error);
    showToast("Failed to load inventory transactions.", "danger");
  }
}

function updateInventorySummary() {
  const totalReceived = allTransactions
    .filter(t => t.type === 'RECEIVE')
    .reduce((sum, t) => sum + Number(t.quantity), 0);

  const totalDispensed = allTransactions
    .filter(t => t.type === 'DISPENSE')
    .reduce((sum, t) => sum + Number(t.quantity), 0);

  const totalAdjustments = allTransactions
    .filter(t => t.type === 'ADJUSTMENT')
    .length;

  if (document.getElementById('statTotalReceived')) {
    document.getElementById('statTotalReceived').textContent = totalReceived.toLocaleString();
  }
  if (document.getElementById('statTotalDispensed')) {
    document.getElementById('statTotalDispensed').textContent = totalDispensed.toLocaleString();
  }
  if (document.getElementById('statTotalAdjustments')) {
    document.getElementById('statTotalAdjustments').textContent = totalAdjustments.toLocaleString();
  }
}

function populateBatchSelectors() {
  const receiveSelect = document.getElementById('receiveBatchSelect');
  const dispenseSelect = document.getElementById('dispenseBatchSelect');
  const adjustSelect = document.getElementById('adjustBatchSelect');

  const options = '<option value="" disabled selected>-- Select Batch --</option>' +
    availableBatches.map(b => `
      <option value="${b.batchNumber}" data-qty="${b.quantity}" data-med="${b.medicineName}" data-medid="${b.medicineId}" data-status="${b.expiryStatus}">
        ${b.batchNumber} - ${b.medicineName} (Avail: ${b.quantity} &bull; ${b.expiryStatus})
      </option>
    `).join('');

  if (receiveSelect) receiveSelect.innerHTML = options;
  if (dispenseSelect) dispenseSelect.innerHTML = options;
  if (adjustSelect) adjustSelect.innerHTML = options;
}

function handleBatchSelectionChange(selectEl, infoContainerId, qtyInputId, isDispense = false) {
  const selected = selectEl.options[selectEl.selectedIndex];
  const infoEl = document.getElementById(infoContainerId);
  const qtyInput = document.getElementById(qtyInputId);

  if (!selected || !selected.value) {
    if (infoEl) infoEl.classList.add('d-none');
    return;
  }

  const avail = Number(selected.getAttribute('data-qty')) || 0;
  const med = selected.getAttribute('data-med');
  const status = selected.getAttribute('data-status');

  if (infoEl) {
    infoEl.classList.remove('d-none');
    infoEl.innerHTML = `
      <div class="d-flex align-items-center justify-content-between p-2 rounded bg-light border">
        <div>
          <span class="fw-semibold text-slate-800">${med}</span>
          <div class="small text-slate-500">Status: <span class="fw-medium">${status}</span></div>
        </div>
        <div class="text-end">
          <div class="small text-slate-400">Current In Stock</div>
          <span class="fs-6 fw-bold ${avail < 20 ? 'text-danger' : 'text-teal'}">${avail} units</span>
        </div>
      </div>
    `;
  }

  if (isDispense && qtyInput) {
    qtyInput.max = avail;
    if (status === 'Expired') {
      showToast("WARNING: Selected batch is EXPIRED! Regulatory guidelines forbid dispensing expired stock.", "danger");
    }
  }
}

function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('transactionsTableBody');
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-slate-400">
          <i class="bi bi-clock-history display-6 d-block mb-2"></i>
          No transactions recorded matching the criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = transactions.map(txn => {
    let typeBadge = '';
    if (txn.type === 'RECEIVE') {
      typeBadge = '<span class="badge bg-teal-subtle text-teal fw-bold px-2 py-1"><i class="bi bi-arrow-down-left me-1"></i>RECEIVE</span>';
    } else if (txn.type === 'DISPENSE') {
      typeBadge = '<span class="badge bg-primary-subtle text-primary fw-bold px-2 py-1"><i class="bi bi-arrow-up-right me-1"></i>DISPENSE</span>';
    } else {
      typeBadge = '<span class="badge bg-warning-subtle text-warning-emphasis fw-bold px-2 py-1"><i class="bi bi-sliders me-1"></i>ADJUST</span>';
    }

    return `
      <tr>
        <td><span class="badge bg-slate-100 text-slate-800 font-monospace">${txn.id}</span></td>
        <td>
          <div class="fw-bold text-slate-800">${txn.medicineName}</div>
          <div class="small text-slate-400">Ref: ${txn.referenceNo || '-'}</div>
        </td>
        <td><strong class="font-monospace text-slate-700">${txn.batchNumber}</strong></td>
        <td>${typeBadge}</td>
        <td class="fw-bold fs-6 ${txn.type === 'DISPENSE' ? 'text-danger' : 'text-success'}">
          ${txn.type === 'DISPENSE' ? '-' : '+'}${Math.abs(txn.quantity)}
        </td>
        <td class="small text-slate-600">${txn.date}</td>
        <td class="small text-slate-700 font-medium">${txn.user}</td>
        <td class="small text-slate-500 text-truncate" style="max-width: 220px;" title="${txn.remarks}">
          ${txn.remarks || '-'}
        </td>
      </tr>
    `;
  }).join('');
}

function filterTransactions() {
  const searchTerm = (document.getElementById('txnSearchInput')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('txnTypeFilter')?.value || 'All';

  const filtered = allTransactions.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm) ||
      t.medicineName.toLowerCase().includes(searchTerm) ||
      t.batchNumber.toLowerCase().includes(searchTerm) ||
      (t.user && t.user.toLowerCase().includes(searchTerm)) ||
      (t.referenceNo && t.referenceNo.toLowerCase().includes(searchTerm));

    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  renderTransactionsTable(filtered);
}

// --------------------------------------------------------------------------
// INVENTORY FORMS INITIALIZATION & STRICT VALIDATION
// --------------------------------------------------------------------------
function initInventoryForms() {
  // Batch selection listener for Dispense
  const dispenseBatchSelect = document.getElementById('dispenseBatchSelect');
  if (dispenseBatchSelect) {
    dispenseBatchSelect.addEventListener('change', () => {
      handleBatchSelectionChange(dispenseBatchSelect, 'dispenseBatchInfo', 'dispenseQuantity', true);
    });
  }

  // Batch selection listener for Receive
  const receiveBatchSelect = document.getElementById('receiveBatchSelect');
  if (receiveBatchSelect) {
    receiveBatchSelect.addEventListener('change', () => {
      handleBatchSelectionChange(receiveBatchSelect, 'receiveBatchInfo', 'receiveQuantity', false);
    });
  }

  // Batch selection listener for Adjust
  const adjustBatchSelect = document.getElementById('adjustBatchSelect');
  if (adjustBatchSelect) {
    adjustBatchSelect.addEventListener('change', () => {
      handleBatchSelectionChange(adjustBatchSelect, 'adjustBatchInfo', 'adjustQuantity', false);
    });
  }

  // Form: Receive Stock
  const receiveForm = document.getElementById('receiveStockForm');
  if (receiveForm) {
    receiveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const batchNo = receiveBatchSelect.value;
      const qty = Number(document.getElementById('receiveQuantity').value);
      const supplier = document.getElementById('receiveSupplier')?.value.trim();
      const invoice = document.getElementById('receiveInvoice')?.value.trim();
      const remarks = document.getElementById('receiveRemarks')?.value.trim();

      if (!batchNo) {
        showToast("Please select a target batch.", "warning");
        return;
      }
      if (isNaN(qty) || qty <= 0) {
        showToast("Please enter a valid positive quantity to receive.", "danger");
        return;
      }

      const selected = receiveBatchSelect.options[receiveBatchSelect.selectedIndex];
      const medName = selected.getAttribute('data-med');
      const medId = selected.getAttribute('data-medid');

      try {
        await api.createTransaction({
          medicineId: medId,
          medicineName: medName,
          batchNumber: batchNo,
          type: "RECEIVE",
          quantity: qty,
          user: auth.getUser()?.name || "Dr. Rajesh Sharma",
          remarks: remarks ? `${remarks} (Inv: ${invoice || 'N/A'})` : `Stock replenishment by ${supplier || 'Vendor'}`,
          referenceNo: invoice || `RCV-${Date.now().toString().slice(-5)}`
        });

        showToast(`Successfully received ${qty} units for batch ${batchNo}.`, "success");
        receiveForm.reset();
        document.getElementById('receiveBatchInfo')?.classList.add('d-none');
        await loadInventoryData();
      } catch (err) {
        showToast(err.message, "danger");
      }
    });
  }

  // Form: Dispense Stock (Strict Quantity Check)
  const dispenseForm = document.getElementById('dispenseStockForm');
  if (dispenseForm) {
    dispenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const batchNo = dispenseBatchSelect.value;
      const qty = Number(document.getElementById('dispenseQuantity').value);
      const patientId = document.getElementById('dispensePatientId')?.value.trim();
      const rxNumber = document.getElementById('dispenseRxNumber')?.value.trim();
      const remarks = document.getElementById('dispenseRemarks')?.value.trim();

      if (!batchNo) {
        showToast("Please select a batch to dispense from.", "warning");
        return;
      }

      const selected = dispenseBatchSelect.options[dispenseBatchSelect.selectedIndex];
      const avail = Number(selected.getAttribute('data-qty')) || 0;
      const medName = selected.getAttribute('data-med');
      const medId = selected.getAttribute('data-medid');
      const status = selected.getAttribute('data-status');

      if (isNaN(qty) || qty <= 0) {
        showToast("Dispense quantity must be greater than zero.", "danger");
        return;
      }

      if (qty > avail) {
        showToast(`Cannot dispense ${qty} units. Only ${avail} units are available in batch ${batchNo}.`, "danger");
        return;
      }

      if (status === 'Expired') {
        showConfirm("Dispensing Warning", "This batch is flagged as EXPIRED. Are you sure an emergency authorization has been granted?", async () => {
          proceedDispense(medId, medName, batchNo, qty, patientId, rxNumber, remarks);
        });
        return;
      }

      proceedDispense(medId, medName, batchNo, qty, patientId, rxNumber, remarks);
    });
  }

  // Form: Adjust Stock
  const adjustForm = document.getElementById('adjustStockForm');
  if (adjustForm) {
    adjustForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const batchNo = adjustBatchSelect.value;
      const qtyChange = Number(document.getElementById('adjustQuantity').value);
      const reason = document.getElementById('adjustReason').value;
      const remarks = document.getElementById('adjustRemarks')?.value.trim();

      if (!batchNo) {
        showToast("Please select a batch for adjustment.", "warning");
        return;
      }
      if (isNaN(qtyChange) || qtyChange === 0) {
        showToast("Adjustment quantity must not be zero.", "danger");
        return;
      }

      const selected = adjustBatchSelect.options[adjustBatchSelect.selectedIndex];
      const medName = selected.getAttribute('data-med');
      const medId = selected.getAttribute('data-medid');

      try {
        await api.createTransaction({
          medicineId: medId,
          medicineName: medName,
          batchNumber: batchNo,
          type: "ADJUSTMENT",
          quantity: qtyChange,
          user: auth.getUser()?.name || "Dr. Rajesh Sharma",
          remarks: `[${reason}] ${remarks || 'Reconciliation adjustment'}`,
          referenceNo: `ADJ-${Date.now().toString().slice(-4)}`
        });

        showToast(`Stock adjustment of ${qtyChange} units recorded for ${batchNo}.`, "success");
        adjustForm.reset();
        document.getElementById('adjustBatchInfo')?.classList.add('d-none');
        await loadInventoryData();
      } catch (err) {
        showToast(err.message, "danger");
      }
    });
  }

  // Filter handlers
  document.getElementById('txnSearchInput')?.addEventListener('input', filterTransactions);
  document.getElementById('txnTypeFilter')?.addEventListener('change', filterTransactions);
}

async function proceedDispense(medId, medName, batchNo, qty, patientId, rxNumber, remarks) {
  try {
    await api.createTransaction({
      medicineId: medId,
      medicineName: medName,
      batchNumber: batchNo,
      type: "DISPENSE",
      quantity: qty,
      user: auth.getUser()?.name || "Dr. Rajesh Sharma",
      remarks: remarks ? `${remarks} (Rx: ${rxNumber || 'N/A'}, Pt: ${patientId || 'General'})` : `Dispensed for prescription ${rxNumber || 'N/A'}`,
      referenceNo: rxNumber || `DIS-${Date.now().toString().slice(-5)}`
    });

    showToast(`Successfully dispensed ${qty} units of ${medName}.`, "success");
    document.getElementById('dispenseStockForm').reset();
    document.getElementById('dispenseBatchInfo')?.classList.add('d-none');
    await loadInventoryData();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('transactionsTableBody')) {
    loadInventoryData();
  }
  initInventoryForms();
});
