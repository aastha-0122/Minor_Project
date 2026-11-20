/**
 * MediTrack - Medicine Management Module
 * Handles search, category filtering, add/edit/view modals, deletion, and pagination
 */

let allMedicines = [];
let filteredMedicines = [];
let currentPage = 1;
const itemsPerPage = 8;
let currentEditMedicineId = null;

async function loadMedicines() {
  const tbody = document.getElementById('medicinesTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-teal"></div></td></tr>`;
  }

  try {
    allMedicines = await api.getMedicines();
    populateCategoryFilter();
    applyFilters();
  } catch (error) {
    console.error("Failed to load medicines:", error);
    showToast("Failed to retrieve medicine catalog.", "danger");
  }
}

function populateCategoryFilter() {
  const categorySelect = document.getElementById('categoryFilter');
  if (!categorySelect) return;

  const categories = Array.from(new Set(allMedicines.map(m => m.category).filter(Boolean))).sort();
  const currentVal = categorySelect.value;

  categorySelect.innerHTML = `<option value="All">All Categories (${allMedicines.length})</option>` +
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

  if (currentVal) categorySelect.value = currentVal;
}

function applyFilters() {
  const searchTerm = (document.getElementById('medicineSearchInput')?.value || '').toLowerCase().trim();
  const selectedCategory = document.getElementById('categoryFilter')?.value || 'All';
  const selectedStatus = document.getElementById('statusFilter')?.value || 'All';

  filteredMedicines = allMedicines.filter(med => {
    const matchesSearch = 
      med.name.toLowerCase().includes(searchTerm) ||
      (med.genericName && med.genericName.toLowerCase().includes(searchTerm)) ||
      (med.manufacturer && med.manufacturer.toLowerCase().includes(searchTerm)) ||
      med.id.toLowerCase().includes(searchTerm);

    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || med.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('medicinesTableBody');
  if (!tbody) return;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredMedicines.slice(startIndex, startIndex + itemsPerPage);

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-5 text-slate-400">
          <i class="bi bi-search display-6 d-block mb-2"></i>
          No medicines matching your search criteria.
        </td>
      </tr>
    `;
    renderPagination(0);
    return;
  }

  tbody.innerHTML = pageItems.map(med => {
    let statusBadge = '';
    if (med.status === 'In Stock') {
      statusBadge = '<span class="badge badge-valid"><span class="status-dot success"></span>In Stock</span>';
    } else if (med.status === 'Low Stock') {
      statusBadge = '<span class="badge badge-low-stock"><span class="status-dot warning"></span>Low Stock</span>';
    } else {
      statusBadge = '<span class="badge badge-out-of-stock"><span class="status-dot danger"></span>Out of Stock</span>';
    }

    return `
      <tr>
        <td><span class="badge bg-slate-100 text-slate-800 fw-bold font-monospace">${med.id}</span></td>
        <td>
          <div class="fw-bold text-slate-800">${med.name}</div>
          <div class="small text-slate-400">${med.dosageForm || 'Formulation'}</div>
        </td>
        <td class="text-slate-600">${med.genericName || '-'}</td>
        <td><span class="badge bg-light text-dark border">${med.category || 'General'}</span></td>
        <td class="fw-medium">${med.strength || '-'}</td>
        <td class="small text-slate-600">${med.manufacturer || '-'}</td>
        <td class="text-center">
          <span class="fw-semibold text-slate-700">${med.minStock || 0}</span>
          <div class="small text-slate-400">Units</div>
        </td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" title="View Details" onclick="viewMedicineDetails('${med.id}')">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-primary" title="Edit Medicine" onclick="openEditModal('${med.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" title="Delete Medicine" onclick="confirmDeleteMedicine('${med.id}', '${med.name}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination(filteredMedicines.length);
}

function renderPagination(totalItems) {
  const container = document.getElementById('tablePagination');
  const countDisplay = document.getElementById('tableItemCount');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (countDisplay) {
    countDisplay.textContent = `Showing ${startItem} to ${endItem} of ${totalItems} medicines`;
  }

  let html = `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <button class="page-link" onclick="changePage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>
    </li>
  `;

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
      html += `
        <li class="page-item ${p === currentPage ? 'active' : ''}">
          <button class="page-link" onclick="changePage(${p})">${p}</button>
        </li>
      `;
    } else if (p === currentPage - 2 || p === currentPage + 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <button class="page-link" onclick="changePage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>
    </li>
  `;

  container.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderTable();
}

// --------------------------------------------------------------------------
// MODAL ACTIONS: VIEW, ADD, EDIT, DELETE
// --------------------------------------------------------------------------

async function viewMedicineDetails(id) {
  const med = await api.getMedicineById(id);
  if (!med) return;

  const batches = (await api.getBatches()).filter(b => b.medicineId === id);

  document.getElementById('viewMedId').textContent = med.id;
  document.getElementById('viewMedName').textContent = med.name;
  document.getElementById('viewMedGeneric').textContent = med.genericName || 'N/A';
  document.getElementById('viewMedCategory').textContent = med.category || 'General';
  document.getElementById('viewMedStrength').textContent = med.strength || 'N/A';
  document.getElementById('viewMedDosage').textContent = med.dosageForm || 'Tablet/Capsule';
  document.getElementById('viewMedManufacturer').textContent = med.manufacturer || 'N/A';
  document.getElementById('viewMedMinStock').textContent = `${med.minStock || 0} Units`;
  document.getElementById('viewMedCurrentStock').textContent = `${med.totalStock || 0} Units`;
  document.getElementById('viewMedStorage').textContent = med.storage || 'Room temperature';
  document.getElementById('viewMedRx').textContent = med.prescriptionRequired ? 'Yes (Prescription Required)' : 'No (Over-the-Counter)';
  document.getElementById('viewMedDescription').textContent = med.description || 'No detailed clinical description provided.';

  // Render associated batches
  const batchesContainer = document.getElementById('viewMedBatches');
  if (batchesContainer) {
    if (batches.length === 0) {
      batchesContainer.innerHTML = `<div class="p-3 text-muted text-center">No batches recorded for this medicine.</div>`;
    } else {
      batchesContainer.innerHTML = batches.map(b => `
        <div class="d-flex align-items-center justify-content-between p-2 border-bottom">
          <div>
            <div class="fw-semibold font-monospace">${b.batchNumber}</div>
            <div class="small text-muted">Expiry: ${formatDate(b.expiryDate)} &bull; ${b.pharmacy}</div>
          </div>
          <div class="text-end">
            <span class="badge ${b.badgeClass}">${b.expiryStatus}</span>
            <div class="small fw-bold mt-1">${b.quantity} Units</div>
          </div>
        </div>
      `).join('');
    }
  }

  const modalEl = document.getElementById('viewMedicineModal');
  if (modalEl) {
    new bootstrap.Modal(modalEl).show();
  }
}

function openEditModal(id) {
  const med = allMedicines.find(m => m.id === id);
  if (!med) return;

  currentEditMedicineId = id;
  document.getElementById('editMedId').value = med.id;
  document.getElementById('editMedName').value = med.name;
  document.getElementById('editMedGeneric').value = med.genericName || '';
  document.getElementById('editMedCategory').value = med.category || '';
  document.getElementById('editMedStrength').value = med.strength || '';
  document.getElementById('editMedManufacturer').value = med.manufacturer || '';
  document.getElementById('editMedMinStock').value = med.minStock || 50;
  document.getElementById('editMedDosageForm').value = med.dosageForm || 'Tablet';
  document.getElementById('editMedDescription').value = med.description || '';

  const modalEl = document.getElementById('editMedicineModal');
  if (modalEl) {
    new bootstrap.Modal(modalEl).show();
  }
}

function confirmDeleteMedicine(id, name) {
  showConfirm("Delete Medicine", `Are you sure you want to remove "${name}" (${id}) from the medicine database?`, async () => {
    try {
      await api.deleteMedicine(id);
      showToast(`Medicine "${name}" deleted successfully.`, "success");
      await loadMedicines();
    } catch (e) {
      showToast("Error deleting medicine.", "danger");
    }
  });
}

// Setup form handlers for Add and Edit
function initMedicineForms() {
  // Add Medicine Form (Modal or Dedicated Page)
  const addForm = document.getElementById('addMedicineForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!addForm.checkValidity()) {
        e.stopPropagation();
        addForm.classList.add('was-validated');
        return;
      }

      const medData = {
        name: document.getElementById('addMedName').value.trim(),
        genericName: document.getElementById('addMedGeneric').value.trim(),
        category: document.getElementById('addMedCategory').value.trim(),
        strength: document.getElementById('addMedStrength').value.trim(),
        dosageForm: document.getElementById('addMedDosageForm').value,
        manufacturer: document.getElementById('addMedManufacturer').value.trim(),
        minStock: Number(document.getElementById('addMedMinStock').value),
        description: document.getElementById('addMedDescription')?.value.trim() || '',
        storage: document.getElementById('addMedStorage')?.value || 'Room Temperature (15-25°C)',
        prescriptionRequired: document.getElementById('addMedRx')?.checked || false
      };

      try {
        const created = await api.createMedicine(medData);
        showToast(`Medicine "${created.name}" created successfully.`, "success");
        addForm.reset();
        addForm.classList.remove('was-validated');

        // Close modal if in modal
        const modalEl = document.getElementById('addMedicineModal');
        if (modalEl) {
          bootstrap.Modal.getInstance(modalEl)?.hide();
        }

        // If on standalone add-medicine.html page, redirect to medicines.html
        if (window.location.pathname.endsWith('add-medicine.html')) {
          setTimeout(() => {
            window.location.href = 'medicines.html';
          }, 1000);
        } else {
          await loadMedicines();
        }
      } catch (err) {
        showToast(`Failed to add medicine: ${err.message}`, "danger");
      }
    });
  }

  // Edit Medicine Form
  const editForm = document.getElementById('editMedicineForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!editForm.checkValidity()) {
        e.stopPropagation();
        editForm.classList.add('was-validated');
        return;
      }

      const updateData = {
        name: document.getElementById('editMedName').value.trim(),
        genericName: document.getElementById('editMedGeneric').value.trim(),
        category: document.getElementById('editMedCategory').value.trim(),
        strength: document.getElementById('editMedStrength').value.trim(),
        dosageForm: document.getElementById('editMedDosageForm').value,
        manufacturer: document.getElementById('editMedManufacturer').value.trim(),
        minStock: Number(document.getElementById('editMedMinStock').value),
        description: document.getElementById('editMedDescription').value.trim()
      };

      try {
        await api.updateMedicine(currentEditMedicineId, updateData);
        showToast("Medicine updated successfully.", "success");
        const modalEl = document.getElementById('editMedicineModal');
        if (modalEl) {
          bootstrap.Modal.getInstance(modalEl)?.hide();
        }
        await loadMedicines();
      } catch (err) {
        showToast(`Failed to update medicine: ${err.message}`, "danger");
      }
    });
  }

  // Filter triggers
  document.getElementById('medicineSearchInput')?.addEventListener('input', applyFilters);
  document.getElementById('categoryFilter')?.addEventListener('change', applyFilters);
  document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    if (document.getElementById('medicineSearchInput')) document.getElementById('medicineSearchInput').value = '';
    if (document.getElementById('categoryFilter')) document.getElementById('categoryFilter').value = 'All';
    if (document.getElementById('statusFilter')) document.getElementById('statusFilter').value = 'All';
    applyFilters();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('medicinesTableBody')) {
    loadMedicines();
  }
  initMedicineForms();
});
