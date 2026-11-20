"""
MediTrack - Medicine & Formulary Unit Tests
Tests medicine creation, duplicate entry prevention, category filtering, and public availability lookups.
"""

from datetime import date, timedelta
import pytest
from app import create_app
from extensions import db
from models.pharmacy import Pharmacy
from models.medicine import Medicine
from models.batch import Batch

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        # Seed test pharmacy
        p = Pharmacy(name="Apollo Metro Pharmacy", city="Mumbai", pincode="400001", is_active=True)
        db.session.add(p)
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()


def test_medicine_creation(client):
    """Test 3: Valid medicine creation"""
    response = client.post('/api/medicines', json={
        'name': 'Azithromycin Dihydrate',
        'genericName': 'Azithromycin',
        'category': 'Antibiotics',
        'strength': '500 mg',
        'manufacturer': 'Pfizer',
        'minStock': 80
    })
    data = response.get_json()
    assert response.status_code == 201
    assert data['success'] is True
    assert data['data']['name'] == 'Azithromycin Dihydrate'
    assert data['data']['category'] == 'Antibiotics'


def test_duplicate_medicine_validation(client):
    """Test 4: Duplicate medicine rejection"""
    # Create first instance
    client.post('/api/medicines', json={
        'name': 'Metformin Hydrochloride',
        'category': 'Antidiabetics',
        'strength': '500 mg'
    })

    # Attempt to create duplicate with identical name and strength
    response = client.post('/api/medicines', json={
        'name': 'Metformin Hydrochloride',
        'category': 'Antidiabetics',
        'strength': '500 mg'
    })
    data = response.get_json()
    assert response.status_code == 409
    assert data['success'] is False
    assert data['error_code'] == 'DUPLICATE_ENTRY'


def test_medicine_name_required(client):
    """Test validation: Name is mandatory"""
    response = client.post('/api/medicines', json={
        'category': 'Antibiotics',
        'strength': '250 mg'
    })
    data = response.get_json()
    assert response.status_code == 400
    assert data['success'] is False
    assert data['error_code'] == 'VALIDATION_ERROR'


def test_public_availability_search(client):
    """Test 14: Public medicine availability search (approved public data only)"""
    with client.application.app_context():
        p = Pharmacy.query.first()
        med = Medicine(name="Paracetamol", generic_name="Acetaminophen", category="Analgesics", strength="650 mg", minimum_stock=50)
        db.session.add(med)
        db.session.flush()

        # Add valid batch
        b = Batch(
            medicine_id=med.id,
            pharmacy_id=p.id,
            batch_number="PARA-2025",
            manufacturing_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=365),
            quantity=120,
            purchase_price=2.50
        )
        db.session.add(b)
        db.session.commit()

    response = client.get('/api/availability?medicine=Paracetamol&city=Mumbai')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert len(data['results']) > 0
    item = data['results'][0]
    assert item['medicineName'] == 'Paracetamol'
    assert item['city'] == 'Mumbai'
    assert item['status'] == 'Available'
    # Ensure private information is not exposed
    assert 'purchase_price' not in item
    assert 'cost' not in item
    assert 'batch_number' not in item
