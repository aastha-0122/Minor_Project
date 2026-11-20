"""
MediTrack - Database Seed & Demo Data Populator
Populates 3 pharmacies, 10 medicines, suppliers, varied batches (Valid, Expiring, Expired),
stock transactions, alerts, and role-based test users.
ALL DATA GENERATED IS DEMONSTRATION / TEST DATA FOR HEALTHCARE AUDITING.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import datetime, date, timedelta
from extensions import db
from models.pharmacy import Pharmacy
from models.user import User
from models.supplier import Supplier
from models.medicine import Medicine
from models.batch import Batch
from models.transaction import StockTransaction
from models.alert import Alert
from models.audit_log import AuditLog

def seed_database():
    """Execute complete database seeding with realistic healthcare records"""
    print("--- [MediTrack Seed] Starting Database Population ---")

    # Clear existing data safely
    db.session.query(AuditLog).delete()
    db.session.query(Alert).delete()
    db.session.query(StockTransaction).delete()
    db.session.query(Batch).delete()
    db.session.query(Supplier).delete()
    db.session.query(Medicine).delete()
    db.session.query(User).delete()
    db.session.query(Pharmacy).delete()
    db.session.commit()

    # 1. PHARMACIES (3 Facilities)
    p1 = Pharmacy(
        name="Central Hospital Pharmacy",
        address="Ground Floor, South Wing, Fort",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        latitude=18.9322,
        longitude=72.8347,
        contact="+91 22 2456 7890",
        is_active=True
    )
    p2 = Pharmacy(
        name="East Wing Dispensary",
        address="Shop 4, Parel T.T. Circle",
        city="Mumbai",
        state="Maharashtra",
        pincode="400012",
        latitude=19.0028,
        longitude=72.8441,
        contact="+91 22 2411 3344",
        is_active=True
    )
    p3 = Pharmacy(
        name="North Outpatient Clinic",
        address="Block C, Connaught Place",
        city="Delhi",
        state="Delhi",
        pincode="110001",
        latitude=28.6315,
        longitude=77.2167,
        contact="+91 11 2334 5566",
        is_active=True
    )
    db.session.add_all([p1, p2, p3])
    db.session.flush()

    # 2. USERS (Admin, Pharmacist, Staff)
    u_admin = User(
        name="Dr. Rajesh Sharma",
        email="dr.sharma@meditrack.org",
        role="admin",
        pharmacy_id=p1.id,
        is_active=True
    )
    u_admin.set_password("admin123")

    u_pharm = User(
        name="Ananya Patel, M.Pharm",
        email="ananya.patel@meditrack.org",
        role="pharmacist",
        pharmacy_id=p2.id,
        is_active=True
    )
    u_pharm.set_password("pharma123")

    u_staff = User(
        name="Sunil Verma",
        email="sunil.verma@meditrack.org",
        role="staff",
        pharmacy_id=p1.id,
        is_active=True
    )
    u_staff.set_password("staff123")

    u_deactivated = User(
        name="Rohan Deshmukh",
        email="rohan.d@meditrack.org",
        role="staff",
        pharmacy_id=p2.id,
        is_active=False
    )
    u_deactivated.set_password("staff123")

    db.session.add_all([u_admin, u_pharm, u_staff, u_deactivated])
    db.session.flush()

    # 3. SUPPLIERS
    s1 = Supplier(name="Apollo Wholesale Pharma", contact="+91 22 4000 1100", email="orders@apollowholesale.com", address="Bhiwandi Pharma Hub, Maharashtra")
    s2 = Supplier(name="Sun Pharma Direct", contact="+91 22 6645 5656", email="supply@sunpharma.com", address="Goregaon East, Mumbai")
    s3 = Supplier(name="Apex Medical Distributors", contact="+91 11 2890 3344", email="sales@apexmed.com", address="Okhla Industrial Area, Delhi")
    s4 = Supplier(name="Cipla Distribution Hub", contact="+91 22 2482 6000", email="central@cipla.com", address="Mumbai Central, Mumbai")
    s5 = Supplier(name="Pfizer Logistics Depot", contact="+91 22 6693 2000", email="distribution@pfizer.com", address="Bandra Kurla Complex, Mumbai")
    db.session.add_all([s1, s2, s3, s4, s5])
    db.session.flush()

    # 4. MEDICINES (10 Formulary Products)
    m1 = Medicine(name="Amoxicillin Trihydrate", generic_name="Amoxicillin", category="Antibiotics", strength="500 mg", manufacturer="GlaxoSmithKline", minimum_stock=150)
    m2 = Medicine(name="Metformin Hydrochloride", generic_name="Metformin", category="Antidiabetics", strength="500 mg", manufacturer="Sun Pharma", minimum_stock=200)
    m3 = Medicine(name="Paracetamol (Dolo)", generic_name="Acetaminophen", category="Analgesics & Antipyretics", strength="650 mg", manufacturer="Micro Labs Ltd", minimum_stock=300)
    m4 = Medicine(name="Atorvastatin Calcium", generic_name="Atorvastatin", category="Cardiovascular", strength="20 mg", manufacturer="Cipla", minimum_stock=100)
    m5 = Medicine(name="Azithromycin Dihydrate", generic_name="Azithromycin", category="Antibiotics", strength="500 mg", manufacturer="Pfizer", minimum_stock=80)
    m6 = Medicine(name="Pantoprazole Gastro-resistant", generic_name="Pantoprazole", category="Gastrointestinal", strength="40 mg", manufacturer="Alkem Labs", minimum_stock=120)
    m7 = Medicine(name="Insulin Glargine Solostar", generic_name="Insulin Glargine", category="Antidiabetics", strength="100 IU/mL", manufacturer="Sanofi", minimum_stock=40)
    m8 = Medicine(name="Cetirizine Hydrochloride", generic_name="Cetirizine", category="Antihistamines", strength="10 mg", manufacturer="Dr. Reddy's", minimum_stock=150)
    m9 = Medicine(name="Salbutamol Inhaler (Asthalin)", generic_name="Salbutamol", category="Respiratory", strength="100 mcg", manufacturer="Cipla", minimum_stock=50)
    m10 = Medicine(name="Ciprofloxacin Eye Drops", generic_name="Ciprofloxacin", category="Ophthalmic", strength="0.3% w/v", manufacturer="FDC Ltd", minimum_stock=60)
    db.session.add_all([m1, m2, m3, m4, m5, m6, m7, m8, m9, m10])
    db.session.flush()

    today = date.today()

    # 5. BATCHES (Varied Horizons: Expired, Near Expiry, Upcoming, Valid)
    # Expired batches (< 0 days)
    b_exp1 = Batch(
        medicine_id=m1.id, pharmacy_id=p1.id, supplier_id=s1.id,
        batch_number="AMX-2024-B1", manufacturing_date=today - timedelta(days=730),
        expiry_date=today - timedelta(days=45), quantity=45, purchase_price=12.50
    )
    b_exp2 = Batch(
        medicine_id=m3.id, pharmacy_id=p1.id, supplier_id=s3.id,
        batch_number="DOLO-2024-09", manufacturing_date=today - timedelta(days=700),
        expiry_date=today - timedelta(days=20), quantity=30, purchase_price=2.10
    )
    b_exp3 = Batch(
        medicine_id=m9.id, pharmacy_id=p1.id, supplier_id=s4.id,
        batch_number="ASTH-2024-L1", manufacturing_date=today - timedelta(days=750),
        expiry_date=today - timedelta(days=60), quantity=12, purchase_price=18.00
    )

    # Near Expiry batches (<= 30 days)
    b_near1 = Batch(
        medicine_id=m2.id, pharmacy_id=p2.id, supplier_id=s2.id,
        batch_number="MET-2024-C9", manufacturing_date=today - timedelta(days=600),
        expiry_date=today + timedelta(days=18), quantity=75, purchase_price=4.20
    )
    b_near2 = Batch(
        medicine_id=m6.id, pharmacy_id=p1.id, supplier_id=s1.id,
        batch_number="PAN-2024-P4", manufacturing_date=today - timedelta(days=600),
        expiry_date=today + timedelta(days=25), quantity=50, purchase_price=6.30
    )

    # Upcoming Expiry batches (31 to 90 days)
    b_up1 = Batch(
        medicine_id=m4.id, pharmacy_id=p1.id, supplier_id=s4.id,
        batch_number="ATV-2024-H8", manufacturing_date=today - timedelta(days=500),
        expiry_date=today + timedelta(days=42), quantity=35, purchase_price=8.50  # Low stock example!
    )
    b_up2 = Batch(
        medicine_id=m10.id, pharmacy_id=p3.id, supplier_id=s3.id,
        batch_number="CIP-2025-99", manufacturing_date=today - timedelta(days=450),
        expiry_date=today + timedelta(days=72), quantity=45, purchase_price=5.80
    )

    # Valid Long-Term batches (> 90 days)
    b_val1 = Batch(
        medicine_id=m1.id, pharmacy_id=p1.id, supplier_id=s1.id,
        batch_number="AMX-2025-A2", manufacturing_date=today - timedelta(days=180),
        expiry_date=today + timedelta(days=365), quantity=260, purchase_price=11.80
    )
    b_val2 = Batch(
        medicine_id=m2.id, pharmacy_id=p1.id, supplier_id=s2.id,
        batch_number="MET-2025-B4", manufacturing_date=today - timedelta(days=120),
        expiry_date=today + timedelta(days=400), quantity=420, purchase_price=4.00
    )
    b_val3 = Batch(
        medicine_id=m3.id, pharmacy_id=p3.id, supplier_id=s3.id,
        batch_number="DOLO-2025-01", manufacturing_date=today - timedelta(days=90),
        expiry_date=today + timedelta(days=500), quantity=850, purchase_price=1.95
    )
    b_val4 = Batch(
        medicine_id=m5.id, pharmacy_id=p2.id, supplier_id=s5.id,
        batch_number="AZI-2025-K3", manufacturing_date=today - timedelta(days=60),
        expiry_date=today + timedelta(days=450), quantity=110, purchase_price=15.00
    )
    b_val5 = Batch(
        medicine_id=m7.id, pharmacy_id=p1.id, supplier_id=s1.id,
        batch_number="INS-2025-08", manufacturing_date=today - timedelta(days=30),
        expiry_date=today + timedelta(days=280), quantity=18, purchase_price=95.00  # Low stock!
    )
    b_val6 = Batch(
        medicine_id=m8.id, pharmacy_id=p3.id, supplier_id=s2.id,
        batch_number="CET-2025-02", manufacturing_date=today - timedelta(days=40),
        expiry_date=today + timedelta(days=350), quantity=340, purchase_price=1.50
    )

    all_batches = [b_exp1, b_exp2, b_exp3, b_near1, b_near2, b_up1, b_up2, b_val1, b_val2, b_val3, b_val4, b_val5, b_val6]
    db.session.add_all(all_batches)
    db.session.flush()

    # 6. STOCK TRANSACTIONS
    t1 = StockTransaction(batch_id=b_val1.id, pharmacy_id=p1.id, user_id=u_admin.id, transaction_type='RECEIVE', quantity=300, remarks="Quarterly PO-8849 delivery from Apollo", created_at=datetime.utcnow() - timedelta(days=6))
    t2 = StockTransaction(batch_id=b_val1.id, pharmacy_id=p1.id, user_id=u_pharm.id, transaction_type='DISPENSE', quantity=40, remarks="Dispensed for IPD post-op patient ward", created_at=datetime.utcnow() - timedelta(days=5))
    t3 = StockTransaction(batch_id=b_val3.id, pharmacy_id=p3.id, user_id=u_staff.id, transaction_type='DISPENSE', quantity=50, remarks="General OPD dispensary consumption", created_at=datetime.utcnow() - timedelta(days=4))
    t4 = StockTransaction(batch_id=b_val5.id, pharmacy_id=p1.id, user_id=u_admin.id, transaction_type='DISPENSE', quantity=6, remarks="Endocrinology dept urgent reservation", created_at=datetime.utcnow() - timedelta(days=3))
    t5 = StockTransaction(batch_id=b_exp1.id, pharmacy_id=p1.id, user_id=u_pharm.id, transaction_type='ADJUSTMENT', quantity=-5, remarks="Quarantined damaged packaging during QA audit", created_at=datetime.utcnow() - timedelta(days=2))
    t6 = StockTransaction(batch_id=b_val2.id, pharmacy_id=p1.id, user_id=u_admin.id, transaction_type='RECEIVE', quantity=420, remarks="Replenished central depot buffer stock", created_at=datetime.utcnow() - timedelta(days=1))
    db.session.add_all([t1, t2, t3, t4, t5, t6])
    db.session.flush()

    # 7. CLINICAL ALERTS
    a1 = Alert(pharmacy_id=p1.id, batch_id=b_exp1.id, medicine_id=m1.id, alert_type="EXPIRED", message=f"CRITICAL: Batch {b_exp1.batch_number} has EXPIRED. Quarantine immediately.", is_read=False)
    a2 = Alert(pharmacy_id=p1.id, batch_id=b_exp2.id, medicine_id=m3.id, alert_type="EXPIRED", message=f"CRITICAL: Batch {b_exp2.batch_number} has EXPIRED. Bio-hazard safe disposal required.", is_read=False)
    a3 = Alert(pharmacy_id=p2.id, batch_id=b_near1.id, medicine_id=m2.id, alert_type="NEAR_EXPIRY", message=f"WARNING: Batch {b_near1.batch_number} expires in 18 days. Prioritize FEFO dispensing.", is_read=False)
    a4 = Alert(pharmacy_id=p1.id, batch_id=b_val5.id, medicine_id=m7.id, alert_type="LOW_STOCK", message=f"REORDER NOTICE: {m7.name} stock ({b_val5.quantity} units) is below safety minimum ({m7.minimum_stock} units).", is_read=False)
    a5 = Alert(pharmacy_id=p1.id, batch_id=b_up1.id, medicine_id=m4.id, alert_type="LOW_STOCK", message=f"REORDER NOTICE: {m4.name} stock ({b_up1.quantity} units) is below minimum ({m4.minimum_stock} units).", is_read=False)
    db.session.add_all([a1, a2, a3, a4, a5])

    # 8. AUDIT LOGS
    l1 = AuditLog(user_id=u_admin.id, action="INITIALIZE_SEED", entity_type="System", entity_id="ALL", details="Demo healthcare inventory database initialized with realistic records.")
    db.session.add(l1)

    db.session.commit()
    print("--- [MediTrack Seed] Population Completed Successfully! ---")
    print("Test User Credentials:")
    print("  * Admin:      dr.sharma@meditrack.org   / admin123")
    print("  * Pharmacist: ananya.patel@meditrack.org / pharma123")
    print("  * Staff:      sunil.verma@meditrack.org  / staff123")

if __name__ == '__main__':
    from app import create_app
    app = create_app('development')
    with app.app_context():
        db.create_all()
        seed_database()
