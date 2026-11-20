# MediTrack – Smart Medicine Availability and Expiry Tracking System (Backend)

Enterprise Healthcare Inventory & Expiry Surveillance REST API built with **Python 3, Flask, Flask-SQLAlchemy, MySQL, Pandas, Scikit-learn, and APScheduler**.

---

## 📁 1. Backend Project Architecture

```
MediTrack/
│
├── app.py                      # Flask Application Factory, Error Handlers, and Entry Point
├── config.py                   # Development, Testing & Production configurations
├── extensions.py               # Central registry for db, login_manager, cors, scheduler
├── requirements.txt            # Python dependencies (Flask, SQLAlchemy, PyMySQL, Pandas, etc.)
├── .env.example                # Sample environment variables template
├── .gitignore                  # Git ignore rules for Python, SQLite, environment files
├── README.md                   # Complete backend architecture & API reference manual
│
├── models/
│   ├── __init__.py             # Exports all database entity models
│   ├── pharmacy.py             # Pharmacy facilities & geographic location coordinates
│   ├── user.py                 # Healthcare staff users with password hashing & roles (Admin, Pharmacist, Staff)
│   ├── supplier.py             # Pharmaceutical stockists & distributor entities
│   ├── medicine.py             # Formulary catalog items & non-expired valid stock calculation
│   ├── batch.py                # Batch tracking, manufacturing/expiry dates & days-to-expiry calculation
│   ├── transaction.py          # Stock transaction ledger (RECEIVE, DISPENSE, ADJUSTMENT, RETURN, EXPIRED)
│   ├── alert.py                # Clinical notifications (LOW_STOCK, NEAR_EXPIRY, EXPIRED, OUT_OF_STOCK)
│   └── audit_log.py            # Regulatory audit trail for all system modifications
│
├── routes/
│   ├── __init__.py             # Blueprint registration & frontend convenience aliases
│   ├── auth.py                 # User authentication (Login, Logout, Current User, Role Guards)
│   ├── dashboard.py            # Aggregate KPIs, valid stock counters, recent transactions & alerts
│   ├── medicines.py            # Medicine formulary CRUD with search, category filtering & pagination
│   ├── batches.py              # Batch lifecycle endpoints & delete protection against historical transactions
│   ├── inventory.py            # Stock Inward (Receive), FEFO Outward (Dispense), and Audit Adjustments
│   ├── availability.py         # Public medicine search (privacy-compliant, non-expired stock only)
│   ├── alerts.py               # Alert retrieval, status updates (Acknowledge/Resolve), and manual scans
│   ├── reports.py              # Stock valuation audits, expiry losses, consumption analysis & forecasts
│   └── users.py                # Staff user directory, account creation, and activation/deactivation
│
├── services/
│   ├── __init__.py             # Exports all service domain logic
│   ├── expiry_service.py       # Expiry status classification & scheduled background scans
│   ├── inventory_service.py    # First Expiry, First Out (FEFO) dispensing & stock adjustment engine
│   ├── alert_service.py        # Low-stock/out-of-stock boundary evaluation without duplicate alerts
│   └── analytics_service.py    # Pandas aggregation, velocity analysis & Scikit-learn demand forecasting
│
├── database/
│   ├── schema.sql              # MySQL DDL relational database schema with foreign keys and indexes
│   └── seed_data.py            # Automated seed script with 3 pharmacies, 10 medicines, batches & users
│
└── tests/
    ├── __init__.py             # Test package initialization
    ├── test_auth.py            # Authentication, role access, deactivated user tests
    ├── test_medicines.py       # Medicine formulary, duplicate entry & availability lookup tests
    ├── test_inventory.py       # Stock receiving, FEFO algorithm, expired dispense blocking tests
    └── test_expiry.py          # Expiry horizon classification, low-stock triggers & pharmacy isolation tests
```

---

## 🗄️ 2. Database Schema (MySQL)

Database name: `meditrack`

The system defines 8 relational tables with foreign keys and indexes:

1. **`pharmacies`**: `id`, `name`, `address`, `city`, `state`, `pincode`, `latitude`, `longitude`, `contact`, `is_active`, `created_at`
2. **`users`**: `id`, `name`, `email` (unique), `password_hash`, `role` (`admin`, `pharmacist`, `staff`), `pharmacy_id` (FK &rarr; `pharmacies.id`), `is_active`, `created_at`
3. **`medicines`**: `id`, `name`, `generic_name`, `category`, `strength`, `manufacturer`, `description`, `minimum_stock`, `created_at`, `updated_at`
4. **`suppliers`**: `id`, `name`, `contact`, `email`, `address`, `created_at`
5. **`batches`**: `id`, `medicine_id` (FK &rarr; `medicines.id`), `pharmacy_id` (FK &rarr; `pharmacies.id`), `supplier_id` (FK &rarr; `suppliers.id`), `batch_number`, `manufacturing_date`, `expiry_date`, `quantity`, `purchase_price`, `created_at`, `updated_at`
6. **`stock_transactions`**: `id`, `batch_id` (FK &rarr; `batches.id`), `pharmacy_id` (FK &rarr; `pharmacies.id`), `user_id` (FK &rarr; `users.id`), `transaction_type` (`RECEIVE`, `DISPENSE`, `ADJUSTMENT`, `RETURN`, `EXPIRED`), `quantity`, `remarks`, `created_at`
7. **`alerts`**: `id`, `pharmacy_id` (FK &rarr; `pharmacies.id`), `batch_id` (FK &rarr; `batches.id`), `medicine_id` (FK &rarr; `medicines.id`), `alert_type` (`LOW_STOCK`, `NEAR_EXPIRY`, `EXPIRED`, `OUT_OF_STOCK`), `message`, `is_read`, `created_at`
8. **`audit_logs`**: `id`, `user_id` (FK &rarr; `users.id`), `action`, `entity_type`, `entity_id`, `details`, `created_at`

---

## ⚡ 3. Core Business Logic & Rules

### 1. First Expiry, First Out (FEFO) Dispensing
When dispensing a medicine:
1. Queries valid batches for the requested pharmacy and medicine.
2. Strictly excludes expired batches (`expiry_date <= today`) and zero-stock batches (`quantity <= 0`).
3. Sorts remaining batches ascending by earliest `expiry_date`.
4. Depletes stock from the earliest expiring batch first.
5. If one batch does not satisfy the total requested quantity, continues with the next earliest batch.
6. Records each resulting transaction in `stock_transactions`.
7. Never creates negative inventory or dispenses expired stock.

### 2. Expiry Surveillance Service
Classifies batches into 4 status windows:
- **Expired**: `days_remaining < 0`
- **Near Expiry**: `0 <= days_remaining <= 30` (configurable)
- **Upcoming Expiry**: `31 <= days_remaining <= 90` (configurable)
- **Valid**: `days_remaining > 90`

An automated **APScheduler** background worker runs daily scans across all batches and raises alerts if no duplicate active alert exists.

### 3. Low-Stock & Out-of-Stock Logic
- Calculates eligible available stock (strictly excluding expired batches).
- If `valid_stock == 0`: Triggers an `OUT_OF_STOCK` alert.
- If `0 < valid_stock <= minimum_stock`: Triggers a `LOW_STOCK` alert.
- Avoids duplicate active/unread alerts for the same pharmacy and medicine.

### 4. Privacy-Preserving Public Availability
- `GET /api/availability?medicine=...&city=...&pincode=...`
- Returns verified availability ranges (`50+ units`, `20+ units`, `Limited Stock`, `Out of Stock`).
- Never exposes supplier prices, profit margins, internal batch codes, or staff personal data.

---

## 🚀 4. Step-by-Step Installation & Running Instructions

### Step 1: Install Python Dependencies
```powershell
cd "D:\Minor project\MediTrack"
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Ensure your MySQL connection string is set in `.env`:
```env
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/meditrack
# Or SQLite option:
# DATABASE_URL=sqlite:///meditrack.db
```

### Step 3: Initialize Database & Seed Demo Data
You can seed the database directly by running:
```powershell
python database/seed_data.py
```

### Step 4: Run the Backend Flask Server
```powershell
python app.py
```
The server will start at **`http://127.0.0.1:5000`**.

### Step 5: Run Automated Unit Tests (15 Test Cases)
```powershell
pytest
```

---

## 🔑 5. Pre-Seeded Test Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Admin** | `dr.sharma@meditrack.org` | `admin123` | Full system control, formulary management, users, audits |
| **Pharmacist** | `ananya.patel@meditrack.org` | `pharma123` | Stock Inward, FEFO Dispensing, Batch tracking, Alerts |
| **Staff** | `sunil.verma@meditrack.org` | `staff123` | General dispensing, catalog view, inward receiving |

---

## 📖 6. Complete REST API Specification

### Response Formats

#### Success Response:
```json
{
  "success": true,
  "message": "Medicine registered successfully.",
  "data": { ... }
}
```

#### Error Response:
```json
{
  "success": false,
  "message": "Insufficient unexpired stock available.",
  "error_code": "INSUFFICIENT_STOCK"
}
```

### Endpoints Table

| Category | Method | Endpoint | Query / Body | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | `{"email": "...", "password": "..."}` | Log in and receive session/token |
| **Auth** | `POST` | `/api/auth/logout` | None | Log out current user |
| **Auth** | `GET` | `/api/auth/me` | None | Get current user profile |
| **Dashboard** | `GET` | `/api/dashboard` | `?pharmacy_id=1` | Get aggregate KPI metrics and feeds |
| **Medicines** | `GET` | `/api/medicines` | `?q=...&category=...&status=...&page=1` | List medicines with pagination and search |
| **Medicines** | `GET` | `/api/medicines/<id>` | None | Get single medicine details + active batches |
| **Medicines** | `POST` | `/api/medicines` | `{"name":"...","genericName":"...","category":"...","strength":"...","minStock":50}` | Create medicine formulation |
| **Medicines** | `PUT` | `/api/medicines/<id>` | Updated fields | Update medicine parameters |
| **Medicines** | `DELETE`| `/api/medicines/<id>` | None | Delete medicine (blocked if active stock exists) |
| **Batches** | `GET` | `/api/batches` | `?pharmacy_id=1&status=Valid` | List batches with days to expiry |
| **Batches** | `GET` | `/api/batches/<id>` | None | Get single batch details |
| **Batches** | `POST` | `/api/batches` | `{"medicineId":1,"batchNumber":"AMX-2025","expiryDate":"2027-01-01","quantity":100}` | Register inward batch |
| **Batches** | `PUT` | `/api/batches/<id>` | Updated fields | Update batch details |
| **Batches** | `DELETE`| `/api/batches/<id>` | `?archive=true` | Delete batch (requires archive flag if txns exist) |
| **Inventory** | `POST` | `/api/inventory/receive` | `{"batchNumber":"...","medicineId":1,"quantity":100}` | Inward stock receipt |
| **Inventory** | `POST` | `/api/inventory/dispense` | `{"medicineId":1,"quantity":20,"pharmacyId":1}` | **FEFO** stock dispensing |
| **Inventory** | `POST` | `/api/inventory/adjustment` | `{"batchId":1,"quantity":-5,"reason":"Damaged"}` | Audit reconciliation |
| **Inventory** | `GET` | `/api/inventory/transactions` | `?type=DISPENSE&limit=50` | Audit transaction history ledger |
| **Availability**| `GET`| `/api/availability` | `?medicine=Paracetamol&city=Mumbai` | Public search for medicine stock |
| **Alerts** | `GET` | `/api/alerts` | `?status=Active&type=EXPIRED` | Get active/resolved clinical alerts |
| **Alerts** | `PATCH`| `/api/alerts/<id>` | `{"status": "Resolved"}` | Acknowledge/resolve an alert |
| **Alerts** | `POST`| `/api/alerts/scan` | None | Manually trigger expiry surveillance scan |
| **Reports** | `GET` | `/api/reports/stock` | `?pharmacy_id=1&category=All` | Stock valuation & category report |
| **Reports** | `GET` | `/api/reports/expiry` | `?pharmacy_id=1&days=30` | Expiry loss exposure audit |
| **Reports** | `GET` | `/api/reports/consumption`| `?pharmacy_id=1&days_back=90` | Consumption velocity & top medicines |
| **Reports** | `GET` | `/api/reports/forecast/<id>`| `?days=30` | Scikit-learn demand forecasting estimate |
| **Users** | `GET` | `/api/users` | `?role=pharmacist&status=active` | List staff directory |
| **Users** | `POST` | `/api/users` | `{"name":"...","email":"...","role":"pharmacist","password":"..."}` | Register staff account |
| **Users** | `PUT` | `/api/users/<id>` | Updated fields | Edit user account |
| **Users** | `PATCH`| `/api/users/<id>/status`| `{"status": "Active"}` | Activate/deactivate account |

---

## 🔗 7. Connecting Frontend to Backend

1. In the frontend at `D:\Minor project\meditrack-frontend`:
   - Open **Settings** (`settings.html`) &rarr; **Backend Integration** &rarr; Toggle **Mock Mode** to **OFF** &rarr; verify endpoint `http://127.0.0.1:5000/api`.
   - Or in `js/api.js`, set `USE_MOCK_DATA: false`.
2. Start the Flask backend: `python app.py` (running on `http://127.0.0.1:5000`).
3. Start the frontend: `python -m http.server 3000` (running on `http://localhost:3000`).
4. Log in using `dr.sharma@meditrack.org` / `admin123`.
