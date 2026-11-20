"""
MediTrack - Inventory & FEFO Engine Unit Tests
Tests stock receiving, negative stock prevention, expired dispense blocking, and FEFO sorting algorithms.
"""

from datetime import date, timedelta
import pytest
from app import create_app
from extensions import db
from models.pharmacy import Pharmacy
from models.medicine import Medicine
from models.batch import Batch
from services.inventory_service import InventoryService

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        pharmacy = Pharmacy(name="Central Facility", city="Mumbai", pincode="400001", is_active=True)
        medicine = Medicine(name="Amoxicillin", generic_name="Amoxicillin", category="Antibiotics", strength="500 mg", minimum_stock=100)
        db.session.add_all([pharmacy, medicine])
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()


def test_batch_creation_and_receipt(client):
    """Test 5: Create a new batch and verify initial inward stock receipt"""
    with client.application.app_context():
        p = Pharmacy.query.first()
        m = Medicine.query.first()
        batch, txn = InventoryService.receive_stock(
            pharmacy_id=p.id,
            medicine_id=m.id,
            batch_number="AMX-2025-01",
            quantity=150,
            expiry_date=date.today() + timedelta(days=365),
            purchase_price=12.0
        )
        assert batch.quantity == 150
        assert txn.transaction_type == 'RECEIVE'
        assert txn.quantity == 150


def test_prevent_negative_stock(client):
    """Test 10: Reject dispense request exceeding available batch inventory"""
    with client.application.app_context():
        p = Pharmacy.query.first()
        m = Medicine.query.first()
        InventoryService.receive_stock(
            pharmacy_id=p.id,
            medicine_id=m.id,
            batch_number="AMX-LOW",
            quantity=10,
            expiry_date=date.today() + timedelta(days=180)
        )

        # Attempt to dispense 25 when only 10 units exist
        with pytest.raises(ValueError) as exc:
            InventoryService.dispense_fefo(
                pharmacy_id=p.id,
                medicine_id=m.id,
                quantity=25
            )
        assert "Insufficient unexpired stock" in str(exc.value)


def test_prevent_dispensing_expired_medicine(client):
    """Test 11: Regulatory guard against dispensing expired batches"""
    with client.application.app_context():
        p = Pharmacy.query.first()
        m = Medicine.query.first()
        # Create an expired batch (expired 10 days ago)
        batch = Batch(
            medicine_id=m.id,
            pharmacy_id=p.id,
            batch_number="AMX-EXPIRED",
            manufacturing_date=date.today() - timedelta(days=600),
            expiry_date=date.today() - timedelta(days=10),
            quantity=50
        )
        db.session.add(batch)
        db.session.commit()

        # Direct attempt to dispense from expired batch
        with pytest.raises(ValueError) as exc:
            InventoryService.dispense_fefo(
                pharmacy_id=p.id,
                medicine_id=m.id,
                quantity=5,
                target_batch_id=batch.id
            )
        assert "EXPIRED" in str(exc.value)


def test_fefo_dispensing_logic(client):
    """
    Test 12: First Expiry, First Out (FEFO) dispensing algorithm
    - Batch A: expires in 45 days, quantity = 20
    - Batch B: expires in 120 days, quantity = 50
    Dispense 30 units:
    -> Batch A must be depleted to 0
    -> Batch B must be depleted by 10 (remaining: 40)
    """
    with client.application.app_context():
        p = Pharmacy.query.first()
        m = Medicine.query.first()

        batch_a = Batch(
            medicine_id=m.id, pharmacy_id=p.id, batch_number="BATCH-EARLY",
            manufacturing_date=date.today() - timedelta(days=200),
            expiry_date=date.today() + timedelta(days=45),  # Expires first!
            quantity=20
        )
        batch_b = Batch(
            medicine_id=m.id, pharmacy_id=p.id, batch_number="BATCH-LATER",
            manufacturing_date=date.today() - timedelta(days=100),
            expiry_date=date.today() + timedelta(days=120),  # Expires later
            quantity=50
        )
        db.session.add_all([batch_a, batch_b])
        db.session.commit()

        manifest = InventoryService.dispense_fefo(
            pharmacy_id=p.id,
            medicine_id=m.id,
            quantity=30
        )

        assert len(manifest) == 2
        # Earliest batch must be dispensed first
        assert manifest[0]['batch'].batch_number == "BATCH-EARLY"
        assert manifest[0]['dispensed_quantity'] == 20
        assert manifest[0]['batch'].quantity == 0

        # Remaining 10 deducted from Batch B
        assert manifest[1]['batch'].batch_number == "BATCH-LATER"
        assert manifest[1]['dispensed_quantity'] == 10
        assert manifest[1]['batch'].quantity == 40
