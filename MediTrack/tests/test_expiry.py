"""
MediTrack - Expiry & Alert Surveillance Tests
Tests expired batch detection, near-expiry warning windows, low-stock threshold triggers, and duplicate alert avoidance.
"""

from datetime import date, timedelta
import pytest
from app import create_app
from extensions import db
from models.pharmacy import Pharmacy
from models.medicine import Medicine
from models.batch import Batch
from models.alert import Alert
from services.expiry_service import ExpiryService
from services.alert_service import AlertService

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        p1 = Pharmacy(name="Pharmacy 1", city="Mumbai", pincode="400001", is_active=True)
        p2 = Pharmacy(name="Pharmacy 2", city="Pune", pincode="411001", is_active=True)
        m = Medicine(name="Metformin", category="Antidiabetics", minimum_stock=100)
        db.session.add_all([p1, p2, m])
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()


def test_expired_and_near_expiry_detection(client):
    """Test 6 & 7: Correct classification of Expired (<0d) and Near Expiry (<=30d) batches"""
    today = date.today()
    status_exp, days_exp = ExpiryService.calculate_status(today - timedelta(days=5))
    assert status_exp == "Expired"
    assert days_exp == -5

    status_near, days_near = ExpiryService.calculate_status(today + timedelta(days=20))
    assert status_near == "Near Expiry"
    assert days_near == 20

    status_up, days_up = ExpiryService.calculate_status(today + timedelta(days=60))
    assert status_up == "Upcoming Expiry"
    assert days_up == 60

    status_val, days_val = ExpiryService.calculate_status(today + timedelta(days=180))
    assert status_val == "Valid"
    assert days_val == 180


def test_low_stock_detection_and_alert_generation(client):
    """Test 8 & 15: Low-stock detection when valid stock is below minimum safety threshold"""
    with client.application.app_context():
        p = Pharmacy.query.first()
        m = Medicine.query.first()  # Minimum stock is 100

        # Add batch with only 30 units (below min 100)
        b = Batch(
            medicine_id=m.id,
            pharmacy_id=p.id,
            batch_number="MET-LOW-01",
            manufacturing_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=200),
            quantity=30
        )
        db.session.add(b)
        db.session.commit()

        # Evaluate stock
        alert = AlertService.evaluate_medicine_stock_alert(p.id, m.id)
        assert alert is not None
        assert alert.alert_type == "LOW_STOCK"

        # Verify duplicate alert is NOT created on repeated evaluation
        alert2 = AlertService.evaluate_medicine_stock_alert(p.id, m.id)
        assert alert2 is None
        total_alerts = Alert.query.filter_by(pharmacy_id=p.id, medicine_id=m.id, alert_type="LOW_STOCK").count()
        assert total_alerts == 1


def test_pharmacy_level_isolation(client):
    """Test 13: Stock and batches in Pharmacy 1 are isolated from Pharmacy 2"""
    with client.application.app_context():
        p1 = Pharmacy.query.filter_by(city="Mumbai").first()
        p2 = Pharmacy.query.filter_by(city="Pune").first()
        m = Medicine.query.first()

        # Add stock only to Pharmacy 1
        b1 = Batch(
            medicine_id=m.id,
            pharmacy_id=p1.id,
            batch_number="P1-ONLY",
            manufacturing_date=date.today() - timedelta(days=20),
            expiry_date=date.today() + timedelta(days=300),
            quantity=250
        )
        db.session.add(b1)
        db.session.commit()

        assert m.get_valid_stock(pharmacy_id=p1.id) == 250
        assert m.get_valid_stock(pharmacy_id=p2.id) == 0
        assert m.get_stock_status(pharmacy_id=p2.id) == "Out of Stock"
