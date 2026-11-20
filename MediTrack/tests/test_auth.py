"""
MediTrack - Authentication & Security Tests
Tests user login, credential verification, deactivated accounts, and authorization guards.
"""

import pytest
from app import create_app
from extensions import db
from models.user import User
from models.pharmacy import Pharmacy

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        # Seed test pharmacy & user
        pharmacy = Pharmacy(name="Test Pharmacy", city="Mumbai", pincode="400001", is_active=True)
        db.session.add(pharmacy)
        db.session.flush()

        active_user = User(
            name="Dr. Test User",
            email="test.pharmacist@meditrack.org",
            role="pharmacist",
            pharmacy_id=pharmacy.id,
            is_active=True
        )
        active_user.set_password("securepassword123")

        deactivated_user = User(
            name="Deactivated Staff",
            email="inactive@meditrack.org",
            role="staff",
            pharmacy_id=pharmacy.id,
            is_active=False
        )
        deactivated_user.set_password("securepassword123")

        db.session.add_all([active_user, deactivated_user])
        db.session.commit()

        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()


def test_user_login_success(client):
    """Test 1: User login with valid credentials"""
    response = client.post('/api/auth/login', json={
        'email': 'test.pharmacist@meditrack.org',
        'password': 'securepassword123'
    })
    data = response.get_json()
    assert response.status_code == 200
    assert data['success'] is True
    assert 'token' in data['data']
    assert data['data']['user']['email'] == 'test.pharmacist@meditrack.org'


def test_user_login_invalid_password(client):
    """Test: Reject invalid password"""
    response = client.post('/api/auth/login', json={
        'email': 'test.pharmacist@meditrack.org',
        'password': 'wrongpassword'
    })
    data = response.get_json()
    assert response.status_code == 401
    assert data['success'] is False
    assert data['error_code'] == 'INVALID_CREDENTIALS'


def test_deactivated_account_rejected(client):
    """Test: Deactivated accounts are blocked from logging in"""
    response = client.post('/api/auth/login', json={
        'email': 'inactive@meditrack.org',
        'password': 'securepassword123'
    })
    data = response.get_json()
    assert response.status_code == 403
    assert data['success'] is False
    assert data['error_code'] == 'ACCOUNT_DEACTIVATED'


def test_unauthorized_access_to_protected_route(client):
    """Test 2: Unauthorized request to protected user endpoints is rejected"""
    response = client.get('/api/auth/me')
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False
