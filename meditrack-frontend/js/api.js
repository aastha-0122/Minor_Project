/**
 * MediTrack - Core API Service & Mock Data Manager
 * Handles REST API communication with Flask backend and provides
 * seamless LocalStorage-persisted mock mode for standalone frontend testing.
 */

const CONFIG = {
  // Toggle between Mock Mode (true) and Live Flask API (false)
  USE_MOCK_DATA: localStorage.getItem('meditrack_use_mock') !== null 
    ? localStorage.getItem('meditrack_use_mock') === 'true' 
    : true,
  API_BASE_URL: localStorage.getItem('meditrack_api_url') || 'http://127.0.0.1:5000/api',
  AUTH_TOKEN_KEY: 'meditrack_auth_token',
  CURRENT_USER_KEY: 'meditrack_current_user'
};

// Initial Seed Data for Realistic Healthcare Environment
const SEED_DATA = {
  medicines: [
    {
      id: "MED-1001",
      name: "Amoxicillin Trihydrate",
      genericName: "Amoxicillin",
      category: "Antibiotics",
      strength: "500 mg",
      dosageForm: "Capsule",
      manufacturer: "GlaxoSmithKline Pharma",
      description: "Broad-spectrum bactericidal penicillin antibiotic for bacterial infections.",
      minStock: 150,
      unit: "Box (100 caps)",
      storage: "Room Temperature (15-25°C)",
      prescriptionRequired: true,
      createdAt: "2026-01-10"
    },
    {
      id: "MED-1002",
      name: "Metformin Hydrochloride",
      genericName: "Metformin",
      category: "Antidiabetics",
      strength: "500 mg",
      dosageForm: "Tablet",
      manufacturer: "Sun Pharma Laboratories",
      description: "First-line medication for the treatment of type 2 diabetes.",
      minStock: 200,
      unit: "Strip (10 tabs)",
      storage: "Dry place below 30°C",
      prescriptionRequired: true,
      createdAt: "2026-01-12"
    },
    {
      id: "MED-1003",
      name: "Paracetamol (Dolo)",
      genericName: "Acetaminophen",
      category: "Analgesics & Antipyretics",
      strength: "650 mg",
      dosageForm: "Tablet",
      manufacturer: "Micro Labs Ltd",
      description: "Analgesic and antipyretic for relief of mild to moderate pain and fever.",
      minStock: 300,
      unit: "Strip (15 tabs)",
      storage: "Store below 25°C",
      prescriptionRequired: false,
      createdAt: "2026-01-15"
    },
    {
      id: "MED-1004",
      name: "Atorvastatin Calcium",
      genericName: "Atorvastatin",
      category: "Cardiovascular",
      strength: "20 mg",
      dosageForm: "Tablet",
      manufacturer: "Cipla Health Care",
      description: "Statin medication used to prevent cardiovascular disease and treat abnormal lipid levels.",
      minStock: 100,
      unit: "Strip (10 tabs)",
      storage: "Store at 20-25°C",
      prescriptionRequired: true,
      createdAt: "2026-01-18"
    },
    {
      id: "MED-1005",
      name: "Azithromycin Dihydrate",
      genericName: "Azithromycin",
      category: "Antibiotics",
      strength: "500 mg",
      dosageForm: "Tablet",
      manufacturer: "Pfizer India Ltd",
      description: "Macrolide antibiotic for respiratory, skin, ear, and sexually transmitted infections.",
      minStock: 80,
      unit: "Strip (3 tabs)",
      storage: "Protect from light and moisture",
      prescriptionRequired: true,
      createdAt: "2026-01-20"
    },
    {
      id: "MED-1006",
      name: "Pantoprazole Gastro-resistant",
      genericName: "Pantoprazole",
      category: "Gastrointestinal",
      strength: "40 mg",
      dosageForm: "Tablet",
      manufacturer: "Alkem Laboratories",
      description: "Proton-pump inhibitor for gastroesophageal reflux disease and peptic ulcers.",
      minStock: 120,
      unit: "Strip (10 tabs)",
      storage: "Store below 25°C",
      prescriptionRequired: true,
      createdAt: "2026-01-22"
    },
    {
      id: "MED-1007",
      name: "Insulin Glargine Solostar",
      genericName: "Insulin Glargine",
      category: "Antidiabetics",
      strength: "100 IU/mL",
      dosageForm: "Injection Cartridge",
      manufacturer: "Sanofi India",
      description: "Long-acting insulin analogue given once daily for glycemic control.",
      minStock: 40,
      unit: "Pen (3 mL)",
      storage: "Refrigerated (2-8°C) - Do not freeze",
      prescriptionRequired: true,
      createdAt: "2026-01-25"
    },
    {
      id: "MED-1008",
      name: "Cetirizine Hydrochloride",
      genericName: "Cetirizine",
      category: "Antihistamines",
      strength: "10 mg",
      dosageForm: "Tablet",
      manufacturer: "Dr. Reddy's Laboratories",
      description: "Second-generation antihistamine used to treat allergic rhinitis and urticaria.",
      minStock: 150,
      unit: "Strip (10 tabs)",
      storage: "Room Temperature",
      prescriptionRequired: false,
      createdAt: "2026-01-28"
    },
    {
      id: "MED-1009",
      name: "Salbutamol Inhaler (Asthalin)",
      genericName: "Salbutamol",
      category: "Respiratory",
      strength: "100 mcg/dose",
      dosageForm: "Inhaler (CFC-free)",
      manufacturer: "Cipla Health Care",
      description: "Short-acting beta-2 adrenergic agonist for asthma bronchodilation.",
      minStock: 50,
      unit: "Canister (200 doses)",
      storage: "Store below 30°C, avoid direct sunlight",
      prescriptionRequired: true,
      createdAt: "2026-02-01"
    },
    {
      id: "MED-1010",
      name: "Ciprofloxacin Eye Drops",
      genericName: "Ciprofloxacin",
      category: "Ophthalmic",
      strength: "0.3% w/v",
      dosageForm: "Eye Drops",
      manufacturer: "FDC Limited",
      description: "Fluoroquinolone ophthalmic antibiotic for bacterial eye infections.",
      minStock: 60,
      unit: "Vial (5 mL)",
      storage: "Store below 25°C",
      prescriptionRequired: true,
      createdAt: "2026-02-05"
    }
  ],

  batches: [
    {
      id: "BAT-501",
      batchNumber: "AMX-2024-B1",
      medicineId: "MED-1001",
      medicineName: "Amoxicillin Trihydrate",
      pharmacy: "Central Hospital Pharmacy",
      mfgDate: "2024-08-10",
      expiryDate: "2026-08-15", // Expired
      quantity: 45,
      purchasePrice: 12.50,
      supplier: "MedSupply Healthcare Logistics"
    },
    {
      id: "BAT-502",
      batchNumber: "AMX-2025-A2",
      medicineId: "MED-1001",
      medicineName: "Amoxicillin Trihydrate",
      pharmacy: "Central Hospital Pharmacy",
      mfgDate: "2025-03-01",
      expiryDate: "2027-03-01", // Valid
      quantity: 260,
      purchasePrice: 11.80,
      supplier: "Apollo Wholesale Pharma"
    },
    {
      id: "BAT-503",
      batchNumber: "MET-2024-C9",
      medicineId: "MED-1002",
      medicineName: "Metformin Hydrochloride",
      pharmacy: "East Wing Dispensary",
      mfgDate: "2024-11-01",
      expiryDate: "2026-10-22", // Near Expiry (<30 days)
      quantity: 75,
      purchasePrice: 4.20,
      supplier: "Sun Pharma Direct"
    },
    {
      id: "BAT-504",
      batchNumber: "MET-2025-B4",
      medicineId: "MED-1002",
      medicineName: "Metformin Hydrochloride",
      pharmacy: "Central Hospital Pharmacy",
      mfgDate: "2025-05-15",
      expiryDate: "2027-05-15", // Valid
      quantity: 420,
      purchasePrice: 4.00,
      supplier: "Sun Pharma Direct"
    },
    {
      id: "BAT-505",
      batchNumber: "DOLO-2024-09",
      medicineId: "MED-1003",
      medicineName: "Paracetamol (Dolo)",
      pharmacy: "Central Hospital Pharmacy",
      mfgDate: "2024-09-15",
      expiryDate: "2026-09-10", // Expired
      quantity: 30,
      purchasePrice: 2.10,
      supplier: "Apex Medical Distributors"
    },
    {
      id: "BAT-506",
      batchNumber: "DOLO-2025-01",
      medicineId: "MED-1003",
      medicineName: "Paracetamol (Dolo)",
      pharmacy: "North Outpatient Clinic",
      mfgDate: "2025-01-10",
      expiryDate: "2027-01-10", // Valid
      quantity: 850,
      purchasePrice: 1.95,
      supplier: "Apex Medical Distributors"
    },
    {
      id: "BAT-507",
      batchNumber: "ATV-2024-H8",
      medicineId: "MED-1004",
      medicineName: "Atorvastatin Calcium",
      pharmacy: "Central Hospital Pharmacy",
      mfgDate: "2024-12-05",
      expiryDate: "2026-11-15", // Upcoming Expiry (approx 42 days)
      quantity: 35, // Low stock trigger
      purchasePrice: 8.50,
      supplier: "Cipla Distribution Hub"
    },
    {
      id: "BAT-508",
      batchNumber: "AZI-2025-K3",
      medicineId: "MED-1005",
      medicineName: "Azithromycin Dihydrate",
      pharmacy: "East Wing Dispensary",
      mfgDate: "2025-04-01",
      expiryDate: "2027-04-01", // Valid
      quantity: 110,
      purchasePrice: 15.00,
      supplier: "Pfizer Logistics"
    },
    {
      id: "BAT-509",
      batchNumber: "PAN-2024-P4",
      medicineId: "MED-1006",
      medicineName: "Pantoprazole Gastro-resistant",
      pharmacy: "Central Hospital Pharmacy",
      mfgDate: "2024-10-10",
      expiryDate: "2026-10-29", // Near Expiry (approx 25 days)
      quantity: 50,
      purchasePrice: 6.30,
      supplier: "Alkem Direct"
    },
    {
      id: "BAT-510",
      batchNumber: "INS-2025-08",
      medicineId: "MED-1007",
      medicineName: "Insulin Glargine Solostar",
      pharmacy: "Central Hospital Pharmacy",
      mfgDate: "2025-08-01",
      expiryDate: "2027-02-01", // Valid
      quantity: 18, // Low stock!
      purchasePrice: 95.00,
      supplier: "ColdChain Pharma Logistics"
    },
    {
      id: "BAT-511",
      batchNumber: "CET-2025-02",
      medicineId: "MED-1008",
      medicineName: "Cetirizine Hydrochloride",
      pharmacy: "North Outpatient Clinic",
      mfgDate: "2025-02-14",
      expiryDate: "2027-08-14", // Valid
      quantity: 340,
      purchasePrice: 1.50,
      supplier: "Dr. Reddy's Stockist"
    },
    {
      id: "BAT-512",
      batchNumber: "ASTH-2024-L1",
      medicineId: "MED-1009",
      medicineName: "Salbutamol Inhaler (Asthalin)",
      pharmacy: "Central Hospital Pharmacy",
      mfgDate: "2024-07-20",
      expiryDate: "2026-07-20", // Expired
      quantity: 12,
      purchasePrice: 18.00,
      supplier: "Cipla Distribution Hub"
    },
    {
      id: "BAT-513",
      batchNumber: "CIP-2025-99",
      medicineId: "MED-1010",
      medicineName: "Ciprofloxacin Eye Drops",
      pharmacy: "North Outpatient Clinic",
      mfgDate: "2025-01-20",
      expiryDate: "2026-12-15", // Upcoming Expiry (approx 72 days)
      quantity: 45,
      purchasePrice: 5.80,
      supplier: "FDC Regional Depot"
    }
  ],

  transactions: [
    {
      id: "TXN-8801",
      medicineId: "MED-1001",
      medicineName: "Amoxicillin Trihydrate",
      batchNumber: "AMX-2025-A2",
      type: "RECEIVE",
      quantity: 300,
      date: "2026-09-28 09:45:00",
      user: "Dr. Rajesh Sharma",
      remarks: "Routine quarterly PO-8849 delivery from Apollo Wholesale",
      referenceNo: "INV-99210"
    },
    {
      id: "TXN-8802",
      medicineId: "MED-1001",
      medicineName: "Amoxicillin Trihydrate",
      batchNumber: "AMX-2025-A2",
      type: "DISPENSE",
      quantity: 40,
      date: "2026-09-29 11:20:00",
      user: "Ananya Patel (Pharm)",
      remarks: "Dispensed for IPD Ward 3 post-op patients",
      referenceNo: "RX-44102"
    },
    {
      id: "TXN-8803",
      medicineId: "MED-1003",
      medicineName: "Paracetamol (Dolo)",
      batchNumber: "DOLO-2025-01",
      type: "DISPENSE",
      quantity: 50,
      date: "2026-09-30 14:10:00",
      user: "Sunil Verma",
      remarks: "General OPD dispensary consumption",
      referenceNo: "RX-44118"
    },
    {
      id: "TXN-8804",
      medicineId: "MED-1007",
      medicineName: "Insulin Glargine Solostar",
      batchNumber: "INS-2025-08",
      type: "DISPENSE",
      quantity: 6,
      date: "2026-10-01 10:15:00",
      user: "Dr. Rajesh Sharma",
      remarks: "Endocrinology department urgent reservation",
      referenceNo: "RX-44201"
    },
    {
      id: "TXN-8805",
      medicineId: "MED-1001",
      medicineName: "Amoxicillin Trihydrate",
      batchNumber: "AMX-2024-B1",
      type: "ADJUSTMENT",
      quantity: -5,
      date: "2026-10-02 16:30:00",
      user: "Ananya Patel (Pharm)",
      remarks: "Quarantined damaged packaging during monthly QA audit",
      referenceNo: "ADJ-102"
    },
    {
      id: "TXN-8806",
      medicineId: "MED-1002",
      medicineName: "Metformin Hydrochloride",
      batchNumber: "MET-2025-B4",
      type: "RECEIVE",
      quantity: 420,
      date: "2026-10-03 08:30:00",
      user: "Dr. Rajesh Sharma",
      remarks: "Replenished central depot buffer stock",
      referenceNo: "INV-99452"
    }
  ],

  alerts: [
    {
      id: "ALT-301",
      medicineId: "MED-1001",
      medicineName: "Amoxicillin Trihydrate",
      batchNumber: "AMX-2024-B1",
      type: "EXPIRED",
      severity: "critical",
      quantity: 45,
      expiryDate: "2026-08-15",
      date: "2026-08-16 00:00:00",
      status: "Active",
      actionSuggested: "Quarantine batch immediately & initiate bio-hazard safe disposal."
    },
    {
      id: "ALT-302",
      medicineId: "MED-1003",
      medicineName: "Paracetamol (Dolo)",
      batchNumber: "DOLO-2024-09",
      type: "EXPIRED",
      severity: "critical",
      quantity: 30,
      expiryDate: "2026-09-10",
      date: "2026-09-11 00:00:00",
      status: "Active",
      actionSuggested: "Quarantine batch and notify pharmacy supervisor."
    },
    {
      id: "ALT-303",
      medicineId: "MED-1009",
      medicineName: "Salbutamol Inhaler (Asthalin)",
      batchNumber: "ASTH-2024-L1",
      type: "EXPIRED",
      severity: "critical",
      quantity: 12,
      expiryDate: "2026-07-20",
      date: "2026-07-21 00:00:00",
      status: "Acknowledged",
      actionSuggested: "Pending vendor credit note and disposal certificate."
    },
    {
      id: "ALT-304",
      medicineId: "MED-1002",
      medicineName: "Metformin Hydrochloride",
      batchNumber: "MET-2024-C9",
      type: "NEAR_EXPIRY",
      severity: "warning",
      quantity: 75,
      expiryDate: "2026-10-22",
      date: "2026-09-22 08:00:00",
      status: "Active",
      actionSuggested: "Prioritize FEFO (First-Expired First-Out) dispensing."
    },
    {
      id: "ALT-305",
      medicineId: "MED-1006",
      medicineName: "Pantoprazole Gastro-resistant",
      batchNumber: "PAN-2024-P4",
      type: "NEAR_EXPIRY",
      severity: "warning",
      quantity: 50,
      expiryDate: "2026-10-29",
      date: "2026-09-29 08:00:00",
      status: "Active",
      actionSuggested: "Dispatch to high-turnover inpatient wards."
    },
    {
      id: "ALT-306",
      medicineId: "MED-1007",
      medicineName: "Insulin Glargine Solostar",
      batchNumber: "INS-2025-08",
      type: "LOW_STOCK",
      severity: "warning",
      quantity: 18,
      expiryDate: "2027-02-01",
      date: "2026-10-01 10:20:00",
      status: "Active",
      actionSuggested: "Stock is 18 / Min 40. Reorder emergency cold-chain quota."
    },
    {
      id: "ALT-307",
      medicineId: "MED-1004",
      medicineName: "Atorvastatin Calcium",
      batchNumber: "ATV-2024-H8",
      type: "LOW_STOCK",
      severity: "warning",
      quantity: 35,
      expiryDate: "2026-11-15",
      date: "2026-10-02 12:00:00",
      status: "Active",
      actionSuggested: "Stock is 35 / Min 100. Place purchase indent with Cipla."
    }
  ],

  availability: [
    {
      id: "AV-01",
      medicineName: "Amoxicillin 500mg Capsule",
      genericName: "Amoxicillin",
      strength: "500 mg",
      pharmacyName: "MediTrack Central Hospital Pharmacy",
      city: "Mumbai",
      pincode: "400001",
      status: "Available",
      approxQuantity: "250+ units",
      contactPhone: "+91 22 2456 7890",
      address: "Ground Floor, South Wing, Fort, Mumbai",
      operatingHours: "24/7 Open",
      lastUpdated: "10 mins ago"
    },
    {
      id: "AV-02",
      medicineName: "Amoxicillin 500mg Capsule",
      genericName: "Amoxicillin",
      strength: "500 mg",
      pharmacyName: "Lifeline Care Chemist",
      city: "Mumbai",
      pincode: "400012",
      status: "Limited Stock",
      approxQuantity: "18 units",
      contactPhone: "+91 22 2411 3344",
      address: "Shop 4, Parel T.T. Circle, Mumbai",
      operatingHours: "8:00 AM - 11:00 PM",
      lastUpdated: "35 mins ago"
    },
    {
      id: "AV-03",
      medicineName: "Paracetamol 650mg Tablet",
      genericName: "Acetaminophen",
      strength: "650 mg",
      pharmacyName: "MediTrack Central Hospital Pharmacy",
      city: "Mumbai",
      pincode: "400001",
      status: "Available",
      approxQuantity: "500+ units",
      contactPhone: "+91 22 2456 7890",
      address: "Ground Floor, South Wing, Fort, Mumbai",
      operatingHours: "24/7 Open",
      lastUpdated: "5 mins ago"
    },
    {
      id: "AV-04",
      medicineName: "Insulin Glargine Solostar",
      genericName: "Insulin Glargine",
      strength: "100 IU/mL",
      pharmacyName: "Metro Diabetes & Endocrine Hub",
      city: "Delhi",
      pincode: "110001",
      status: "Limited Stock",
      approxQuantity: "6 pens",
      contactPhone: "+91 11 2334 5566",
      address: "Connaught Place, Block C, New Delhi",
      operatingHours: "9:00 AM - 9:00 PM",
      lastUpdated: "1 hour ago"
    },
    {
      id: "AV-05",
      medicineName: "Insulin Glargine Solostar",
      genericName: "Insulin Glargine",
      strength: "100 IU/mL",
      pharmacyName: "South Delhi Community Pharmacy",
      city: "Delhi",
      pincode: "110016",
      status: "Out of Stock",
      approxQuantity: "0 units (Expected in 24h)",
      contactPhone: "+91 11 2656 7890",
      address: "Hauz Khas Market, New Delhi",
      operatingHours: "8:30 AM - 10:30 PM",
      lastUpdated: "2 hours ago"
    },
    {
      id: "AV-06",
      medicineName: "Metformin 500mg Tablet",
      genericName: "Metformin",
      strength: "500 mg",
      pharmacyName: "Apollo MedPlus Koramangala",
      city: "Bengaluru",
      pincode: "560034",
      status: "Available",
      approxQuantity: "300+ units",
      contactPhone: "+91 80 2553 1122",
      address: "80 Feet Rd, 4th Block, Koramangala, Bengaluru",
      operatingHours: "24/7 Open",
      lastUpdated: "15 mins ago"
    },
    {
      id: "AV-07",
      medicineName: "Salbutamol Inhaler (Asthalin)",
      genericName: "Salbutamol",
      strength: "100 mcg",
      pharmacyName: "Indiranagar PulmoCare Pharmacy",
      city: "Bengaluru",
      pincode: "560038",
      status: "Available",
      approxQuantity: "45 units",
      contactPhone: "+91 80 2521 8899",
      address: "100ft Road, Indiranagar, Bengaluru",
      operatingHours: "8:00 AM - 11:00 PM",
      lastUpdated: "40 mins ago"
    },
    {
      id: "AV-08",
      medicineName: "Azithromycin 500mg Tablet",
      genericName: "Azithromycin",
      strength: "500 mg",
      pharmacyName: "HealthFirst Chemist",
      city: "Pune",
      pincode: "411004",
      status: "Available",
      approxQuantity: "80 units",
      contactPhone: "+91 20 2567 1144",
      address: "FC Road, Deccan Gymkhana, Pune",
      operatingHours: "8:00 AM - 10:00 PM",
      lastUpdated: "25 mins ago"
    }
  ],

  users: [
    {
      id: "USR-01",
      name: "Dr. Rajesh Sharma",
      email: "dr.sharma@meditrack.org",
      role: "Admin",
      pharmacy: "Central Hospital Pharmacy",
      status: "Active",
      lastLogin: "2026-10-04 10:45 AM"
    },
    {
      id: "USR-02",
      name: "Ananya Patel, M.Pharm",
      email: "ananya.patel@meditrack.org",
      role: "Pharmacist",
      pharmacy: "East Wing Dispensary",
      status: "Active",
      lastLogin: "2026-10-04 09:15 AM"
    },
    {
      id: "USR-03",
      name: "Sunil Verma",
      email: "sunil.verma@meditrack.org",
      role: "Staff",
      pharmacy: "Central Hospital Pharmacy",
      status: "Active",
      lastLogin: "2026-10-03 04:30 PM"
    },
    {
      id: "USR-04",
      name: "Dr. Priya Sengupta",
      email: "priya.s@meditrack.org",
      role: "Admin",
      pharmacy: "North Outpatient Clinic",
      status: "Active",
      lastLogin: "2026-10-02 11:20 AM"
    },
    {
      id: "USR-05",
      name: "Rohan Deshmukh",
      email: "rohan.d@meditrack.org",
      role: "Staff",
      pharmacy: "East Wing Dispensary",
      status: "Inactive",
      lastLogin: "2026-09-20 02:10 PM"
    }
  ],

  settings: {
    profile: {
      name: "Dr. Rajesh Sharma",
      email: "dr.sharma@meditrack.org",
      phone: "+91 98200 12345",
      role: "Chief Pharmacy Administrator",
      pharmacy: "Central Hospital Pharmacy, Mumbai",
      licenseNumber: "MH-PH-2018-98441"
    },
    thresholds: {
      nearExpiryDays: 30,
      upcomingExpiryDays: 90,
      lowStockDefault: 100,
      criticalPercentage: 20
    },
    notifications: {
      emailAlerts: true,
      browserAlerts: true,
      dailyDigest: true,
      smsCriticalOnly: false
    }
  }
};

// Initialize Storage with Seed Data if empty
function initializeStorage() {
  if (!localStorage.getItem('meditrack_medicines')) {
    localStorage.setItem('meditrack_medicines', JSON.stringify(SEED_DATA.medicines));
  }
  if (!localStorage.getItem('meditrack_batches')) {
    localStorage.setItem('meditrack_batches', JSON.stringify(SEED_DATA.batches));
  }
  if (!localStorage.getItem('meditrack_transactions')) {
    localStorage.setItem('meditrack_transactions', JSON.stringify(SEED_DATA.transactions));
  }
  if (!localStorage.getItem('meditrack_alerts')) {
    localStorage.setItem('meditrack_alerts', JSON.stringify(SEED_DATA.alerts));
  }
  if (!localStorage.getItem('meditrack_availability')) {
    localStorage.setItem('meditrack_availability', JSON.stringify(SEED_DATA.availability));
  }
  if (!localStorage.getItem('meditrack_users')) {
    localStorage.setItem('meditrack_users', JSON.stringify(SEED_DATA.users));
  }
  if (!localStorage.getItem('meditrack_settings')) {
    localStorage.setItem('meditrack_settings', JSON.stringify(SEED_DATA.settings));
  }
}
initializeStorage();

// Storage Helpers
function getStore(key) {
  try {
    return JSON.parse(localStorage.getItem('meditrack_' + key)) || [];
  } catch (e) {
    console.error("Storage parse error:", e);
    return [];
  }
}

function setStore(key, data) {
  localStorage.setItem('meditrack_' + key, JSON.stringify(data));
}

// Calculate days remaining from today (using fixed reference or client date)
function calculateDaysRemaining(expiryDateStr) {
  const today = new Date();
  const expDate = new Date(expiryDateStr);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Determine Expiry Status Badge & Label
function getExpiryStatus(expiryDateStr) {
  const days = calculateDaysRemaining(expiryDateStr);
  if (days < 0) {
    return { status: "Expired", badgeClass: "badge-expired", days };
  } else if (days <= 30) {
    return { status: "Near Expiry", badgeClass: "badge-near-expiry", days };
  } else if (days <= 90) {
    return { status: "Upcoming Expiry", badgeClass: "badge-upcoming", days };
  } else {
    return { status: "Valid", badgeClass: "badge-valid", days };
  }
}

/**
 * Universal MediTrack API Service
 */
const api = {
  // Config access
  isMock: () => CONFIG.USE_MOCK_DATA,
  setMock: (enabled) => {
    CONFIG.USE_MOCK_DATA = enabled;
    localStorage.setItem('meditrack_use_mock', enabled ? 'true' : 'false');
  },
  getApiBaseUrl: () => CONFIG.API_BASE_URL,
  setApiBaseUrl: (url) => {
    CONFIG.API_BASE_URL = url;
    localStorage.setItem('meditrack_api_url', url);
  },

  // Reset demo data to pristine state
  resetDemoData: () => {
    localStorage.setItem('meditrack_medicines', JSON.stringify(SEED_DATA.medicines));
    localStorage.setItem('meditrack_batches', JSON.stringify(SEED_DATA.batches));
    localStorage.setItem('meditrack_transactions', JSON.stringify(SEED_DATA.transactions));
    localStorage.setItem('meditrack_alerts', JSON.stringify(SEED_DATA.alerts));
    localStorage.setItem('meditrack_availability', JSON.stringify(SEED_DATA.availability));
    localStorage.setItem('meditrack_users', JSON.stringify(SEED_DATA.users));
    localStorage.setItem('meditrack_settings', JSON.stringify(SEED_DATA.settings));
  },

  // Generic fetch wrapper for backend communication
  async fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn(`API call ${endpoint} failed, falling back to mock mode:`, err.message);
      throw err;
    }
  },

  // --------------------------------------------------------------------------
  // MEDICINES API
  // --------------------------------------------------------------------------
  async getMedicines() {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/medicines');
      } catch (e) { /* fall back to mock */ }
    }
    const medicines = getStore('medicines');
    const batches = getStore('batches');
    
    // Enrich with computed total current stock and status
    return medicines.map(med => {
      const medBatches = batches.filter(b => b.medicineId === med.id);
      const totalStock = medBatches.reduce((sum, b) => {
        // Only count valid/unexpired stock toward healthy stock
        return sum + (Number(b.quantity) || 0);
      }, 0);

      let status = "In Stock";
      if (totalStock === 0) status = "Out of Stock";
      else if (totalStock <= (med.minStock || 50)) status = "Low Stock";

      return {
        ...med,
        totalStock,
        status,
        batchCount: medBatches.length
      };
    });
  },

  async getMedicineById(id) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth(`/medicines/${id}`);
      } catch (e) { /* fall back */ }
    }
    const medicines = await this.getMedicines();
    return medicines.find(m => m.id === id) || null;
  },

  async createMedicine(data) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/medicines', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch (e) { /* fall back */ }
    }
    const medicines = getStore('medicines');
    const newMed = {
      ...data,
      id: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
      minStock: Number(data.minStock) || 50,
      createdAt: new Date().toISOString().split('T')[0]
    };
    medicines.unshift(newMed);
    setStore('medicines', medicines);
    return newMed;
  },

  async updateMedicine(id, data) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth(`/medicines/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch (e) { /* fall back */ }
    }
    const medicines = getStore('medicines');
    const index = medicines.findIndex(m => m.id === id);
    if (index === -1) throw new Error("Medicine not found");
    medicines[index] = { ...medicines[index], ...data, minStock: Number(data.minStock) };
    setStore('medicines', medicines);
    return medicines[index];
  },

  async deleteMedicine(id) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth(`/medicines/${id}`, { method: 'DELETE' });
      } catch (e) { /* fall back */ }
    }
    const medicines = getStore('medicines').filter(m => m.id !== id);
    setStore('medicines', medicines);
    return { success: true };
  },

  // --------------------------------------------------------------------------
  // BATCHES & EXPIRY API
  // --------------------------------------------------------------------------
  async getBatches() {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/batches');
      } catch (e) { /* fall back */ }
    }
    const batches = getStore('batches');
    return batches.map(batch => {
      const expiryInfo = getExpiryStatus(batch.expiryDate);
      return {
        ...batch,
        daysRemaining: expiryInfo.days,
        expiryStatus: expiryInfo.status,
        badgeClass: expiryInfo.badgeClass
      };
    });
  },

  async createBatch(data) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/batches', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch (e) { /* fall back */ }
    }
    const batches = getStore('batches');
    const newBatch = {
      ...data,
      id: `BAT-${Math.floor(500 + Math.random() * 500)}`,
      quantity: Number(data.quantity) || 0,
      purchasePrice: Number(data.purchasePrice) || 0
    };
    batches.unshift(newBatch);
    setStore('batches', batches);

    // Record incoming stock transaction automatically
    this.createTransaction({
      medicineId: data.medicineId,
      medicineName: data.medicineName,
      batchNumber: data.batchNumber,
      type: "RECEIVE",
      quantity: Number(data.quantity),
      user: "Current Pharmacist",
      remarks: `Initial batch received from ${data.supplier || 'Vendor'}`,
      referenceNo: `PO-${Math.floor(10000 + Math.random() * 90000)}`
    });

    return newBatch;
  },

  async updateBatch(id, data) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth(`/batches/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch (e) { /* fall back */ }
    }
    const batches = getStore('batches');
    const index = batches.findIndex(b => b.id === id);
    if (index === -1) throw new Error("Batch not found");
    batches[index] = { 
      ...batches[index], 
      ...data,
      quantity: Number(data.quantity),
      purchasePrice: Number(data.purchasePrice)
    };
    setStore('batches', batches);
    return batches[index];
  },

  async deleteBatch(id) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth(`/batches/${id}`, { method: 'DELETE' });
      } catch (e) { /* fall back */ }
    }
    const batches = getStore('batches').filter(b => b.id !== id);
    setStore('batches', batches);
    return { success: true };
  },

  // --------------------------------------------------------------------------
  // INVENTORY & TRANSACTIONS API
  // --------------------------------------------------------------------------
  async getTransactions() {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/transactions');
      } catch (e) { /* fall back */ }
    }
    return getStore('transactions');
  },

  async createTransaction(data) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/transactions', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch (e) { /* fall back */ }
    }
    const transactions = getStore('transactions');
    const batches = getStore('batches');
    const targetBatch = batches.find(b => b.batchNumber === data.batchNumber);

    const changeQty = Number(data.quantity);
    if (isNaN(changeQty) || changeQty === 0) {
      throw new Error("Invalid quantity specified.");
    }

    if (targetBatch) {
      if (data.type === 'DISPENSE') {
        if (targetBatch.quantity < changeQty) {
          throw new Error(`Insufficient stock in Batch ${data.batchNumber}. Available: ${targetBatch.quantity}`);
        }
        targetBatch.quantity -= changeQty;
      } else if (data.type === 'RECEIVE') {
        targetBatch.quantity += changeQty;
      } else if (data.type === 'ADJUSTMENT') {
        targetBatch.quantity = Math.max(0, targetBatch.quantity + changeQty);
      }
      setStore('batches', batches);
    }

    const now = new Date();
    const dateFormatted = now.toISOString().replace('T', ' ').substring(0, 19);

    const newTxn = {
      id: `TXN-${Math.floor(8000 + Math.random() * 2000)}`,
      medicineId: data.medicineId || (targetBatch ? targetBatch.medicineId : "MED-GEN"),
      medicineName: data.medicineName || (targetBatch ? targetBatch.medicineName : "General Item"),
      batchNumber: data.batchNumber,
      type: data.type,
      quantity: Math.abs(changeQty),
      date: dateFormatted,
      user: data.user || "Dr. Rajesh Sharma",
      remarks: data.remarks || "Inventory transaction logged",
      referenceNo: data.referenceNo || `REF-${Math.floor(1000 + Math.random() * 9000)}`
    };

    transactions.unshift(newTxn);
    setStore('transactions', transactions);
    return newTxn;
  },

  // --------------------------------------------------------------------------
  // ALERTS API
  // --------------------------------------------------------------------------
  async getAlerts() {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/alerts');
      } catch (e) { /* fall back */ }
    }
    return getStore('alerts');
  },

  async updateAlert(id, updateData) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth(`/alerts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData)
        });
      } catch (e) { /* fall back */ }
    }
    const alerts = getStore('alerts');
    const index = alerts.findIndex(a => a.id === id);
    if (index !== -1) {
      alerts[index] = { ...alerts[index], ...updateData };
      setStore('alerts', alerts);
      return alerts[index];
    }
    throw new Error("Alert not found");
  },

  // --------------------------------------------------------------------------
  // AVAILABILITY (PUBLIC SEARCH) API
  // --------------------------------------------------------------------------
  async getAvailability(query = {}, city = '', pincode = '', statusFilter = 'All') {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        const params = new URLSearchParams({
          q: typeof query === 'string' ? query : (query.q || ''),
          city: city || (query.city || ''),
          pincode: pincode || (query.pincode || ''),
          status: statusFilter || (query.status || 'All')
        });
        return await this.fetchWithAuth(`/availability?${params.toString()}`);
      } catch (e) { /* fall back */ }
    }

    let results = getStore('availability');
    const qStr = (typeof query === 'string' ? query : (query.q || '')).toLowerCase().trim();
    const cStr = (city || (query.city || '')).toLowerCase().trim();
    const pStr = (pincode || (query.pincode || '')).trim();
    const sStr = statusFilter || (query.status || 'All');

    if (qStr) {
      results = results.filter(item => 
        item.medicineName.toLowerCase().includes(qStr) || 
        item.genericName.toLowerCase().includes(qStr)
      );
    }

    if (cStr) {
      results = results.filter(item => 
        item.city.toLowerCase().includes(cStr) || 
        item.pharmacyName.toLowerCase().includes(cStr)
      );
    }

    if (pStr) {
      results = results.filter(item => item.pincode.startsWith(pStr));
    }

    if (sStr && sStr !== 'All') {
      results = results.filter(item => item.status.toLowerCase() === sStr.toLowerCase());
    }

    return results;
  },

  // --------------------------------------------------------------------------
  // DASHBOARD STATISTICS
  // --------------------------------------------------------------------------
  async getDashboardStats() {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/dashboard/stats');
      } catch (e) { /* fall back */ }
    }

    const medicines = await this.getMedicines();
    const batches = await this.getBatches();
    const alerts = getStore('alerts');
    const transactions = getStore('transactions');

    const totalMedicines = medicines.length;
    const totalStock = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    const lowStockCount = medicines.filter(m => m.status === 'Low Stock').length;
    const outOfStockCount = medicines.filter(m => m.status === 'Out of Stock').length;
    const nearExpiryCount = batches.filter(b => b.expiryStatus === 'Near Expiry').length;
    const expiredCount = batches.filter(b => b.expiryStatus === 'Expired').length;

    return {
      metrics: {
        totalMedicines,
        totalStock,
        lowStock: lowStockCount,
        nearExpiry: nearExpiryCount,
        expired: expiredCount,
        outOfStock: outOfStockCount
      },
      recentAlerts: alerts.slice(0, 5),
      recentTransactions: transactions.slice(0, 5),
      recentlyAddedMedicines: medicines.slice(0, 4)
    };
  },

  // --------------------------------------------------------------------------
  // USERS API
  // --------------------------------------------------------------------------
  async getUsers() {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/users');
      } catch (e) { /* fall back */ }
    }
    return getStore('users');
  },

  async createUser(userData) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/users', {
          method: 'POST',
          body: JSON.stringify(userData)
        });
      } catch (e) { /* fall back */ }
    }
    const users = getStore('users');
    const newUser = {
      ...userData,
      id: `USR-${Math.floor(10 + Math.random() * 90)}`,
      status: userData.status || "Active",
      lastLogin: "Never"
    };
    users.unshift(newUser);
    setStore('users', users);
    return newUser;
  },

  async updateUser(id, userData) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth(`/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(userData)
        });
      } catch (e) { /* fall back */ }
    }
    const users = getStore('users');
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error("User not found");
    users[index] = { ...users[index], ...userData };
    setStore('users', users);
    return users[index];
  },

  // --------------------------------------------------------------------------
  // SETTINGS API
  // --------------------------------------------------------------------------
  async getSettings() {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/settings');
      } catch (e) { /* fall back */ }
    }
    return getStore('settings');
  },

  async saveSettings(settingsData) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        return await this.fetchWithAuth('/settings', {
          method: 'POST',
          body: JSON.stringify(settingsData)
        });
      } catch (e) { /* fall back */ }
    }
    const current = getStore('settings');
    const merged = { ...current, ...settingsData };
    setStore('settings', merged);
    return merged;
  }
};

// --------------------------------------------------------------------------
// UI NOTIFICATIONS & HELPERS
// --------------------------------------------------------------------------

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container-custom';
    document.body.appendChild(container);
  }

  const iconMap = {
    success: 'bi-check-circle-fill text-success',
    warning: 'bi-exclamation-triangle-fill text-warning',
    danger: 'bi-x-circle-fill text-danger',
    info: 'bi-info-circle-fill text-info'
  };

  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  toast.innerHTML = `
    <i class="bi ${iconMap[type] || iconMap.info} fs-5"></i>
    <div class="flex-grow-1">
      <div class="small fw-semibold text-slate-800">${message}</div>
    </div>
    <button type="button" class="btn-close btn-close-sm" style="font-size: 0.75rem;" onclick="this.parentElement.remove()"></button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showConfirm(title, message, onConfirmCallback) {
  let modalEl = document.getElementById('globalConfirmModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'globalConfirmModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold text-slate-800" id="globalConfirmTitle">Confirm Action</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-slate-600 py-3" id="globalConfirmBody">
            Are you sure you want to proceed?
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="globalConfirmBtn">Confirm</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  document.getElementById('globalConfirmTitle').textContent = title;
  document.getElementById('globalConfirmBody').textContent = message;

  const confirmBtn = document.getElementById('globalConfirmBtn');
  const bsModal = new bootstrap.Modal(modalEl);

  // Replace button to clear previous listeners
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener('click', () => {
    bsModal.hide();
    if (typeof onConfirmCallback === 'function') {
      onConfirmCallback();
    }
  });

  bsModal.show();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// Mobile Sidebar toggler helper for all pages
function initMobileSidebar() {
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      backdrop.classList.toggle('show');
    });

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('show');
      backdrop.classList.remove('show');
    });

    // Close on link click on mobile
    sidebar.querySelectorAll('.sidebar-item').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 992) {
          sidebar.classList.remove('show');
          backdrop.classList.remove('show');
        }
      });
    });
  }

  // Update current user info in sidebar if logged in
  const currentUser = JSON.parse(localStorage.getItem(CONFIG.CURRENT_USER_KEY) || 'null');
  if (currentUser) {
    const nameEls = document.querySelectorAll('.user-name-display');
    const roleEls = document.querySelectorAll('.user-role-display');
    nameEls.forEach(el => el.textContent = currentUser.name);
    roleEls.forEach(el => el.textContent = currentUser.role);
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  initMobileSidebar();
});
