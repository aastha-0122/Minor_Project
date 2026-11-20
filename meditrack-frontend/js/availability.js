/**
 * MediTrack - Public Medicine Availability Module
 * Provides citizen and healthcare network search for nearby medicine availability
 * without exposing internal margins or sensitive supply chain data.
 */

let availabilityResults = [];

async function performAvailabilitySearch() {
  const medicineName = document.getElementById('searchMedicineInput')?.value || '';
  const city = document.getElementById('searchCityInput')?.value || '';
  const pincode = document.getElementById('searchPincodeInput')?.value || '';
  const activeFilterBtn = document.querySelector('.filter-status-btn.active');
  const statusFilter = activeFilterBtn ? activeFilterBtn.getAttribute('data-status') : 'All';

  const resultsContainer = document.getElementById('availabilityResultsContainer');
  const countDisplay = document.getElementById('resultsCountBadge');

  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-teal" role="status"></div>
        <div class="text-slate-500 mt-2">Searching live pharmacy inventories...</div>
      </div>
    `;
  }

  try {
    availabilityResults = await api.getAvailability(medicineName, city, pincode, statusFilter);
    renderAvailabilityResults(availabilityResults);
    if (countDisplay) {
      countDisplay.textContent = `${availabilityResults.length} Pharmacies Found`;
    }
  } catch (error) {
    console.error("Availability search error:", error);
    showToast("Error searching medicine availability.", "danger");
  }
}

function renderAvailabilityResults(items) {
  const container = document.getElementById('availabilityResultsContainer');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="card card-custom p-5">
          <i class="bi bi-geo-alt-fill display-4 text-slate-300 d-block mb-3"></i>
          <h5 class="fw-bold text-slate-700">No Pharmacy Matches Found</h5>
          <p class="text-slate-500 max-w-md mx-auto mb-4">
            We couldn't find any pharmacy with this medicine in the specified area. Try broadening your location search or checking alternative brand names.
          </p>
          <div>
            <button class="btn btn-outline-teal" onclick="clearAvailabilityFilters()">
              <i class="bi bi-arrow-counterclockwise me-1"></i>Reset Search
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    let statusBadge = '';
    let cardBorder = '';
    if (item.status === 'Available') {
      statusBadge = '<span class="badge badge-valid"><span class="status-dot success"></span>Available</span>';
      cardBorder = 'border-start-success';
    } else if (item.status === 'Limited Stock') {
      statusBadge = '<span class="badge badge-near-expiry"><span class="status-dot warning"></span>Limited Stock</span>';
      cardBorder = 'border-start-warning';
    } else {
      statusBadge = '<span class="badge badge-expired"><span class="status-dot danger"></span>Out of Stock</span>';
      cardBorder = 'border-start-danger';
    }

    return `
      <div class="col-lg-6 col-md-12 mb-4">
        <div class="card card-custom h-100 p-4 ${cardBorder}" style="border-left-width: 5px !important;">
          <div class="d-flex align-items-start justify-content-between mb-3">
            <div>
              <h5 class="fw-bold text-slate-800 mb-1">${item.medicineName}</h5>
              <div class="text-slate-500 small">
                Generic: <span class="fw-semibold text-teal">${item.genericName}</span> &bull; 
                Strength: <span class="fw-semibold">${item.strength}</span>
              </div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div class="bg-light p-3 rounded-3 mb-3 border">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-hospital fs-5 text-teal"></i>
              <div class="fw-bold text-slate-800">${item.pharmacyName}</div>
            </div>
            <div class="small text-slate-600 mb-1">
              <i class="bi bi-geo-alt me-1 text-slate-400"></i>${item.address}, <strong>${item.city} - ${item.pincode}</strong>
            </div>
            <div class="small text-slate-600">
              <i class="bi bi-clock me-1 text-slate-400"></i>${item.operatingHours || 'Normal Hours'}
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between mt-auto pt-2 border-top">
            <div>
              <div class="small text-slate-400">Approx. Stock Availability</div>
              <div class="fw-bold text-slate-700">${item.approxQuantity}</div>
            </div>
            <div class="text-end">
              <div class="small text-slate-400">Last Verified</div>
              <div class="small fw-semibold text-slate-600">${item.lastUpdated}</div>
            </div>
          </div>

          <div class="d-flex gap-2 mt-3 pt-2">
            <a href="tel:${item.contactPhone}" class="btn btn-outline-teal btn-sm flex-grow-1">
              <i class="bi bi-telephone-fill me-1"></i>${item.contactPhone}
            </a>
            <button class="btn btn-teal btn-sm px-3" onclick="requestHoldModal('${item.medicineName}', '${item.pharmacyName}')">
              <i class="bi bi-bookmark-check me-1"></i>Directions / Hold
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function requestHoldModal(medName, pharmacyName) {
  showConfirm(
    "Pharmacy Inquiry / Reservation",
    `Contact ${pharmacyName} regarding available reserves of ${medName}? A reservation voucher can be held for up to 2 hours at the counter.`,
    () => {
      showToast(`Reservation request sent to ${pharmacyName}. Please present your ID and prescription upon arrival.`, "success");
    }
  );
}

function clearAvailabilityFilters() {
  if (document.getElementById('searchMedicineInput')) document.getElementById('searchMedicineInput').value = '';
  if (document.getElementById('searchCityInput')) document.getElementById('searchCityInput').value = '';
  if (document.getElementById('searchPincodeInput')) document.getElementById('searchPincodeInput').value = '';

  document.querySelectorAll('.filter-status-btn').forEach(b => {
    b.classList.remove('active', 'btn-teal');
    b.classList.add('btn-outline-secondary');
  });

  const allBtn = document.querySelector('.filter-status-btn[data-status="All"]');
  if (allBtn) {
    allBtn.classList.add('active', 'btn-teal');
    allBtn.classList.remove('btn-outline-secondary');
  }

  performAvailabilitySearch();
}

function initAvailabilityUI() {
  const searchBtn = document.getElementById('executeSearchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performAvailabilitySearch();
    });
  }

  // Real-time search on enter
  ['searchMedicineInput', 'searchCityInput', 'searchPincodeInput'].forEach(id => {
    document.getElementById(id)?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performAvailabilitySearch();
      }
    });
  });

  // Filter status pills
  document.querySelectorAll('.filter-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-status-btn').forEach(b => {
        b.classList.remove('active', 'btn-teal');
        b.classList.add('btn-outline-secondary');
      });
      btn.classList.add('active', 'btn-teal');
      btn.classList.remove('btn-outline-secondary');
      performAvailabilitySearch();
    });
  });

  // Initial search load
  performAvailabilitySearch();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('availabilityResultsContainer')) {
    initAvailabilityUI();
  }
});
