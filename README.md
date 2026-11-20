# 🏥 MediTrack
### Smart Pharmacy Inventory & Medicine Expiry Management System

## 📌 About the Project
MediTrack is a healthcare inventory management system designed to manage medicine stock, monitor expiry dates, prevent wastage, and improve medicine availability.

## 🔍 Problem Statement
Poor inventory management leads to expired medicines, stock shortages, financial losses, and difficulty in finding available medicines.

MediTrack solves these problems through automated expiry tracking, FEFO-based dispensing, stock alerts, and public medicine availability search.

## ✨ Key Features
- 🛡️ Automated medicine expiry monitoring.
- ⚡ FEFO-based medicine dispensing.
- 📊 Interactive analytics dashboard.
- 🔔 Low-stock and expiry alerts.
- 🔍 Public medicine availability search.
- 👥 Role-based access control (Admin, Pharmacist, Staff).
- 📄 CSV and print reports.

## 💻 Technology Stack

**Frontend:** HTML, CSS, Bootstrap 5, JavaScript, Chart.js

**Backend:** Python, Flask, Flask-SQLAlchemy

**Database:** MySQL / SQLite

**Libraries:** Pandas, Scikit-learn, APScheduler, Pytest

## 🏗️ System Architecture

```text
Frontend (HTML, CSS, JavaScript)
              |
              ▼
       Flask REST API
              |
       ┌──────┼──────┐
       ▼      ▼      ▼
      RBAC   FEFO   Alerts
              |
              ▼
       SQLAlchemy ORM
              |
              ▼
       MySQL / SQLite
```

## 🗄️ Database
The system uses 8 normalized relational tables:

- Pharmacies
- Users
- Medicines
- Suppliers
- Batches
- Stock Transactions
- Alerts
- Audit Logs

---

⭐ *MediTrack – Making Medicine Management Smarter!*
