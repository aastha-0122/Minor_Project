/**
 * MediTrack - User Management Module
 * Manages healthcare staff, pharmacists, administrators, and role permissions.
 */

let allUsers = [];
let currentEditUserId = null;

async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-teal"></div></td></tr>`;
  }

  try {
    allUsers = await api.getUsers();
    updateUserMetrics();
    renderUsersTable();
  } catch (error) {
    console.error("Failed to load users:", error);
    showToast("Failed to fetch user directory.", "danger");
  }
}

function updateUserMetrics() {
  const total = allUsers.length;
  const admins = allUsers.filter(u => u.role === 'Admin').length;
  const pharmacists = allUsers.filter(u => u.role === 'Pharmacist').length;
  const staff = allUsers.filter(u => u.role === 'Staff').length;

  if (document.getElementById('totalUsersCount')) document.getElementById('totalUsersCount').textContent = total;
  if (document.getElementById('totalAdminsCount')) document.getElementById('totalAdminsCount').textContent = admins;
  if (document.getElementById('totalPharmacistsCount')) document.getElementById('totalPharmacistsCount').textContent = pharmacists;
  if (document.getElementById('totalStaffCount')) document.getElementById('totalStaffCount').textContent = staff;
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const searchTerm = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('userRoleFilter')?.value || 'All';
  const statusFilter = document.getElementById('userStatusFilter')?.value || 'All';

  const filtered = allUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm) ||
      (u.pharmacy && u.pharmacy.toLowerCase().includes(searchTerm));

    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-slate-400">No users found matching search criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    let roleBadge = '';
    if (u.role === 'Admin') {
      roleBadge = '<span class="badge bg-purple-subtle text-purple border" style="background:#f3e8ff; color:#7e22ce;"><i class="bi bi-shield-lock-fill me-1"></i>Admin</span>';
    } else if (u.role === 'Pharmacist') {
      roleBadge = '<span class="badge bg-teal-subtle text-teal border"><i class="bi bi-person-badge-fill me-1"></i>Pharmacist</span>';
    } else {
      roleBadge = '<span class="badge bg-slate-100 text-slate-700 border"><i class="bi bi-person-fill me-1"></i>Staff</span>';
    }

    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    const isActive = u.status === 'Active';

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <div class="user-avatar" style="width:36px; height:36px; font-size:0.85rem; background: ${u.role === 'Admin' ? '#7e22ce' : '#0d9488'};">
              ${initials}
            </div>
            <div>
              <div class="fw-bold text-slate-800">${u.name}</div>
              <div class="small text-slate-400">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${roleBadge}</td>
        <td class="text-slate-700">${u.pharmacy || 'Central Hospital Pharmacy'}</td>
        <td>
          <span class="badge ${isActive ? 'badge-valid' : 'badge-out-of-stock'}">
            <span class="status-dot ${isActive ? 'success' : 'danger'}"></span>${u.status}
          </span>
        </td>
        <td class="small text-slate-500">${u.lastLogin || 'Never'}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" title="Edit User" onclick="openEditUserModal('${u.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}" 
              title="${isActive ? 'Deactivate User' : 'Activate User'}" 
              onclick="toggleUserStatus('${u.id}', '${u.name}', '${u.status}')">
              <i class="bi ${isActive ? 'bi-person-x' : 'bi-person-check'}"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddUserModal() {
  const form = document.getElementById('addUserForm');
  if (form) form.reset();
  const modalEl = document.getElementById('addUserModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

function openEditUserModal(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  currentEditUserId = id;
  document.getElementById('editUserId').value = user.id;
  document.getElementById('editUserName').value = user.name;
  document.getElementById('editUserEmail').value = user.email;
  document.getElementById('editUserRole').value = user.role;
  document.getElementById('editUserPharmacy').value = user.pharmacy || 'Central Hospital Pharmacy';
  document.getElementById('editUserStatus').value = user.status;

  const modalEl = document.getElementById('editUserModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

function toggleUserStatus(id, name, currentStatus) {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  const actionText = newStatus === 'Active' ? 'activate' : 'deactivate';

  showConfirm(`${newStatus === 'Active' ? 'Activate' : 'Deactivate'} User`, `Are you sure you want to ${actionText} ${name}'s system access?`, async () => {
    try {
      await api.updateUser(id, { status: newStatus });
      showToast(`User ${name} has been ${actionText}d.`, "info");
      await loadUsers();
    } catch (e) {
      showToast("Error updating user status.", "danger");
    }
  });
}

function initUsersUI() {
  const addForm = document.getElementById('addUserForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!addForm.checkValidity()) {
        e.stopPropagation();
        addForm.classList.add('was-validated');
        return;
      }

      const userData = {
        name: document.getElementById('addUserName').value.trim(),
        email: document.getElementById('addUserEmail').value.trim(),
        role: document.getElementById('addUserRole').value,
        pharmacy: document.getElementById('addUserPharmacy').value,
        status: document.getElementById('addUserStatus').value
      };

      try {
        await api.createUser(userData);
        showToast(`User ${userData.name} created successfully.`, "success");
        const modalEl = document.getElementById('addUserModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        addForm.reset();
        addForm.classList.remove('was-validated');
        await loadUsers();
      } catch (err) {
        showToast(err.message, "danger");
      }
    });
  }

  const editForm = document.getElementById('editUserForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!editForm.checkValidity()) {
        e.stopPropagation();
        editForm.classList.add('was-validated');
        return;
      }

      const updateData = {
        name: document.getElementById('editUserName').value.trim(),
        email: document.getElementById('editUserEmail').value.trim(),
        role: document.getElementById('editUserRole').value,
        pharmacy: document.getElementById('editUserPharmacy').value,
        status: document.getElementById('editUserStatus').value
      };

      try {
        await api.updateUser(currentEditUserId, updateData);
        showToast(`User ${updateData.name} updated successfully.`, "success");
        const modalEl = document.getElementById('editUserModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        await loadUsers();
      } catch (err) {
        showToast(err.message, "danger");
      }
    });
  }

  document.getElementById('userSearchInput')?.addEventListener('input', renderUsersTable);
  document.getElementById('userRoleFilter')?.addEventListener('change', renderUsersTable);
  document.getElementById('userStatusFilter')?.addEventListener('change', renderUsersTable);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('usersTableBody')) {
    initUsersUI();
    loadUsers();
  }
});
