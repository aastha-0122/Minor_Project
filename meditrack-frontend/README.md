# MediTrack – Smart Medicine Availability and Expiry Tracking System
### Professional Healthcare Inventory & Expiry Surveillance Frontend

MediTrack is a production-grade, responsive healthcare web application tailored for hospital dispensaries, pharmacy chains, and clinical supply chains. It delivers real-time batch lifecycle surveillance, First-Expired First-Out (FEFO) dispensing enforcement, automated low-stock warnings, public medicine availability lookups, and visual analytics.

---

## 📁 1. Complete Folder Structure

```
meditrack-frontend/
│
├── index.html              # Public landing page with live availability quick search & portal navigation
├── login.html              # Professional login with role autofill, validation & password recovery
├── dashboard.html          # Clinical executive dashboard with 6 stat cards, 4 Chart.js charts & live feeds
├── medicines.html          # Medicine formulary catalog with search, category filtering & CRUD modals
├── add-medicine.html       # Dedicated medicine registration page with client-side validation
├── batches.html            # Batch management, days-to-expiry calculations & quarantine actions
├── inventory.html          # Stock Inward, Dispense (with strict limit guards) & Audit Adjustments
├── availability.html       # Public citizen/network medicine locator (without exposing private costs)
├── alerts.html             # Multi-category clinical alerts (Expired, Near-Expiry, Low-Stock, Out-of-Stock)
├── reports.html            # Analytics dashboard with valuation audits, consumption charts & CSV exports
├── users.html              # Staff directory with role management (Admin, Pharmacist, Staff)
├── settings.html           # Expiry windows, low-stock thresholds & Flask REST API configuration
│
├── css/
│   ├── style.css           # Healthcare teal theme, cards, tables, badges, pulse dots & utilities
│   └── responsive.css      # Mobile drawer, adaptive breakpoints & print styling for audits
│
├── js/
│   ├── api.js              # Universal REST API client with LocalStorage-persisted mock mode & toast UI
│   ├── auth.js             # Role-based sessions, route guards & user badge synchronization
│   ├── dashboard.js        # KPI counters, 4 Chart.js charts & recent activity feeds
│   ├── medicines.js        # Medicine formulary filtering, pagination & CRUD modals
│   ├── batches.js          # Days remaining calculation, expiry status badges & batch forms
│   ├── inventory.js        # Stock Receive, Dispense (limit validation) & Adjustment transactions
│   ├── availability.js     # Public medicine lookup by name, city, and PIN code
│   ├── alerts.js           # Expiry and stockout notification workflows & acknowledge triggers
│   ├── reports.js          # Consumption comparisons, valuation audits & CSV/Print export handlers
│   └── users.js            # User management, role badges & status activation toggles
│
└── assets/
    └── images/
        └── logo.svg        # MediTrack medical pulse vector brand icon
```

---

## 🚀 2. Instructions to Run the Frontend

Because the frontend is constructed exclusively with **HTML5, CSS3, Bootstrap 5, Vanilla JavaScript, and Chart.js**, no build steps (`npm run build`, Webpack, or Vite) are required.

### Option A: Using Python (Recommended)
Open PowerShell or Terminal in the `meditrack-frontend` directory:
```powershell
cd "D:\Minor project\meditrack-frontend"
python -m http.server 3000
```
Open your browser and navigate to:
```
http://localhost:3000
```

### Option B: Using VS Code Live Server
1. Open the folder `D:\Minor project\meditrack-frontend` in Visual Studio Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` or `login.html` and click **"Open with Live Server"**.

### Option C: Using Node.js `npx serve`
```powershell
cd "D:\Minor project\meditrack-frontend"
npx serve -l 3000
```

### Option D: Direct Browser Preview
You can directly double-click `index.html` or `login.html` in Windows Explorer to open it in Chrome, Edge, or Firefox. All fonts, Bootstrap 5, Bootstrap Icons, and Chart.js libraries load seamlessly from verified CDNs.

---

## 🔑 3. Demo Credentials (One-Click Auto-Fill Available)

On `login.html`, click any of the quick demo buttons to pre-populate credentials:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Admin** | `dr.sharma@meditrack.org` | `admin123` | Full access to formulary, users, thresholds, audits |
| **Pharmacist** | `ananya.patel@meditrack.org` | `pharma123` | Stock in/out, batch tracking, dispensing, alerts |
| **Staff** | `sunil.verma@meditrack.org` | `staff123` | Inward receipt, general dispensing, catalog lookup |

---

## 🔌 4. API Endpoints Expected from Flask Backend

The frontend `js/api.js` client communicates with standard RESTful endpoints formatted in JSON.

### Authentication & Sessions
| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate healthcare user | `{"email": "...", "password": "..."}` |
| `POST` | `/api/auth/logout` | Terminate session / invalidate token | None (Bearer token in header) |

### Medicines Formulary
| Method | Endpoint | Description | Request / Response Format |
|---|---|---|---|
| `GET` | `/api/medicines` | Retrieve all medicine formulations | Returns array of medicines with live stock |
| `GET` | `/api/medicines/<id>` | Retrieve specific medicine details | Returns single medicine object |
| `POST` | `/api/medicines` | Create new medicine in formulary | `{"name":"...","genericName":"...","category":"...","strength":"...","dosageForm":"...","manufacturer":"...","minStock":100}` |
| `PUT` | `/api/medicines/<id>` | Update medicine parameters | Updated medicine payload |
| `DELETE` | `/api/medicines/<id>` | Delete medicine from catalog | Returns `{"success": true}` |

### Batches & Expiry Management
| Method | Endpoint | Description | Request / Response Format |
|---|---|---|---|
| `GET` | `/api/batches` | Retrieve all batches with expiry dates | Returns list with `expiryDate`, `mfgDate`, `quantity` |
| `POST` | `/api/batches` | Register new inward batch | `{"medicineId":"...","batchNumber":"...","pharmacy":"...","mfgDate":"...","expiryDate":"...","quantity":100,"purchasePrice":12.50,"supplier":"..."}` |
| `PUT` | `/api/batches/<id>` | Update batch details | Updated batch payload |
| `DELETE` | `/api/batches/<id>` | Remove batch from active records | Returns `{"success": true}` |

### Inventory & Stock Operations
| Method | Endpoint | Description | Request / Response Format |
|---|---|---|---|
| `GET` | `/api/transactions` | Retrieve transaction audit history | Returns list of IN, OUT, and ADJUSTMENT logs |
| `POST` | `/api/transactions` | Post new stock transaction | `{"batchNumber":"...","type":"RECEIVE"|"DISPENSE"|"ADJUSTMENT","quantity":20,"user":"...","remarks":"...","referenceNo":"..."}` |

### Alerts & Surveillance
| Method | Endpoint | Description | Request / Response Format |
|---|---|---|---|
| `GET` | `/api/alerts` | Retrieve active & acknowledged alerts | Returns list of `EXPIRED`, `NEAR_EXPIRY`, `LOW_STOCK` |
| `PATCH` | `/api/alerts/<id>` | Update alert status | `{"status": "Acknowledged" | "Resolved"}` |

### Public Medicine Availability
| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/availability` | Public search for medicine stock | `?q=Amoxicillin&city=Mumbai&pincode=400001&status=Available` |

### Dashboard KPIs & Analytics
| Method | Endpoint | Description | Response Format |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregated counters & top medicines | `{"metrics": {...}, "recentAlerts": [...], "recentTransactions": [...]}` |

### User Management
| Method | Endpoint | Description | Request / Response Format |
|---|---|---|---|
| `GET` | `/api/users` | List staff accounts | Returns array of users |
| `POST` | `/api/users` | Register new user | `{"name":"...","email":"...","role":"Pharmacist","pharmacy":"...","status":"Active"}` |
| `PUT` | `/api/users/<id>` | Update role or active status | Updated user payload |

### System Settings
| Method | Endpoint | Description | Request / Response Format |
|---|---|---|---|
| `GET` | `/api/settings` | Retrieve clinical thresholds | Returns thresholds & profile |
| `POST` | `/api/settings` | Update thresholds & preferences | `{"thresholds": {"nearExpiryDays": 30, ...}}` |

---

## 🔗 5. How to Connect the Frontend to the Flask Backend

MediTrack features a built-in **Dual Architecture**:
1. **Mock Data Mode (Default)**: Runs completely in browser memory and persists to `localStorage`. You can add batches, dispense stock, trigger low-stock alerts, and modify settings without launching a Python server.
2. **Live Flask REST API Mode**: Forwards all requests via standard asynchronous `fetch()` to your Flask server with JWT authorization headers.

### Step 1: Enable Live API Mode in Frontend
You can switch modes via the UI or by editing `js/api.js`:
- **Via the UI**: Navigate to **Settings** (`settings.html`) &rarr; click the **"Backend Integration"** tab &rarr; toggle **"Use Standalone Mock Data Mode"** to **OFF** &rarr; verify the endpoint URL `http://127.0.0.1:5000/api` &rarr; click **Save Backend Settings**.
- **Via Code (`js/api.js`)**:
  ```javascript
  const CONFIG = {
    USE_MOCK_DATA: false, // Set to false to force live backend communication
    API_BASE_URL: 'http://127.0.0.1:5000/api',
    // ...
  };
  ```

### Step 2: Flask Backend Setup (Python)
Make sure `flask` and `flask-cors` are installed on your Flask backend:
```bash
pip install flask flask-cors
```

Create a minimal `app.py` in your Flask project:
```python
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)

# IMPORTANT: Enable CORS so your frontend can communicate across ports
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    return jsonify({
        "metrics": {
            "totalMedicines": 10,
            "totalStock": 2185,
            "lowStock": 2,
            "nearExpiry": 2,
            "expired": 3,
            "outOfStock": 0
        },
        "recentAlerts": [],
        "recentTransactions": [],
        "recentlyAddedMedicines": []
    })

@app.route('/api/medicines', methods=['GET', 'POST'])
def handle_medicines():
    if request.method == 'GET':
        # Query your SQLite/PostgreSQL/MySQL database
        return jsonify([])
    elif request.method == 'POST':
        data = request.get_json()
        # Save to database
        return jsonify(data), 201

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
```

Run your Flask backend:
```bash
python app.py
```
Your MediTrack frontend is now synchronized with your live Flask REST API!
