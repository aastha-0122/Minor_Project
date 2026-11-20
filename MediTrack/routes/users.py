"""
MediTrack - User Management Routes
Role-based user directory, account creation, and activation/deactivation controls.
"""

from datetime import datetime
from flask import Blueprint, request
from extensions import db
from models.user import User
from models.pharmacy import Pharmacy
from models.audit_log import AuditLog
from routes.auth import api_response, role_required

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

def _parse_user_id(id_val):
    if isinstance(id_val, str) and id_val.upper().startswith('USR-'):
        try:
            return int(id_val.split('-')[1])
        except (IndexError, ValueError):
            return None
    try:
        return int(id_val)
    except (ValueError, TypeError):
        return None


@users_bp.route('', methods=['GET'])
def get_users():
    """List healthcare staff accounts with role and status filtering"""
    role = request.args.get('role', '').strip().lower()
    status_filter = request.args.get('status', '').strip().lower()
    pharmacy_id = request.args.get('pharmacy_id', type=int)

    query = User.query

    if role and role != 'all':
        query = query.filter(User.role.ilike(role))

    if status_filter and status_filter != 'all':
        is_act = (status_filter == 'active')
        query = query.filter_by(is_active=is_act)

    if pharmacy_id:
        query = query.filter_by(pharmacy_id=pharmacy_id)

    users = query.order_by(User.id.asc()).all()
    return api_response(True, "Users retrieved successfully.", data=[u.to_dict() for u in users])


@users_bp.route('/<user_id>', methods=['GET'])
def get_user(user_id):
    """Retrieve single user details"""
    pk = _parse_user_id(user_id)
    if not pk:
        return api_response(False, "Invalid user ID.", error_code="INVALID_ID", status_code=400)

    user = db.session.get(User, pk)
    if not user:
        return api_response(False, "User not found.", error_code="NOT_FOUND", status_code=404)

    return api_response(True, "User details retrieved.", data=user.to_dict())


@users_bp.route('', methods=['POST'])
def create_user():
    """
    Register a new healthcare staff account.
    Body: {"name": "...", "email": "...", "password": "...", "role": "pharmacist", "pharmacyId": 1}
    """
    payload = request.get_json(silent=True) or {}
    name = payload.get('name', '').strip()
    email = payload.get('email', '').strip().lower()
    role = payload.get('role', 'staff').strip().lower()
    password = payload.get('password', 'meditrack2026')

    if not name or not email:
        return api_response(False, "Name and official email are required.", error_code="VALIDATION_ERROR", status_code=400)

    if role not in ('admin', 'pharmacist', 'staff'):
        return api_response(False, "Role must be 'admin', 'pharmacist', or 'staff'.", error_code="INVALID_ROLE", status_code=400)

    existing = User.query.filter_by(email=email).first()
    if existing:
        return api_response(False, f"An account with email {email} already exists.", error_code="DUPLICATE_EMAIL", status_code=409)

    pharmacy_id = payload.get('pharmacyId') or payload.get('pharmacy_id')
    if pharmacy_id:
        try:
            pharmacy_id = int(pharmacy_id)
        except ValueError:
            pharmacy_id = None

    user = User(
        name=name,
        email=email,
        role=role,
        pharmacy_id=pharmacy_id,
        is_active=payload.get('status', 'Active').lower() == 'active',
        created_at=datetime.utcnow()
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    db.session.add(AuditLog(
        action="CREATE_USER",
        entity_type="User",
        entity_id=str(user.id),
        details=f"Created staff account for {user.name} ({user.email}, Role: {user.role})"
    ))
    db.session.commit()

    return api_response(True, f"Account for {user.name} created successfully.", data=user.to_dict(), status_code=201)


@users_bp.route('/<user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user information, access role, or pharmacy branch assignment"""
    pk = _parse_user_id(user_id)
    if not pk:
        return api_response(False, "Invalid user ID.", error_code="INVALID_ID", status_code=400)

    user = db.session.get(User, pk)
    if not user:
        return api_response(False, "User not found.", error_code="NOT_FOUND", status_code=404)

    payload = request.get_json(silent=True) or {}
    if 'name' in payload:
        user.name = payload['name'].strip()
    if 'email' in payload:
        user.email = payload['email'].strip().lower()
    if 'role' in payload:
        new_role = payload['role'].strip().lower()
        if new_role in ('admin', 'pharmacist', 'staff'):
            user.role = new_role
    if 'status' in payload:
        user.is_active = (payload['status'].lower() == 'active')
    if 'pharmacyId' in payload or 'pharmacy_id' in payload:
        try:
            user.pharmacy_id = int(payload.get('pharmacyId') or payload.get('pharmacy_id'))
        except (ValueError, TypeError):
            pass

    db.session.commit()
    return api_response(True, f"User {user.name} updated.", data=user.to_dict())


@users_bp.route('/<user_id>/status', methods=['PATCH'])
def toggle_user_status(user_id):
    """Activate or deactivate a user account"""
    pk = _parse_user_id(user_id)
    if not pk:
        return api_response(False, "Invalid user ID.", error_code="INVALID_ID", status_code=400)

    user = db.session.get(User, pk)
    if not user:
        return api_response(False, "User not found.", error_code="NOT_FOUND", status_code=404)

    payload = request.get_json(silent=True) or {}
    if 'is_active' in payload:
        user.is_active = bool(payload['is_active'])
    elif 'status' in payload:
        user.is_active = (payload['status'].lower() == 'active')
    else:
        user.is_active = not user.is_active  # Toggle

    db.session.commit()
    status_str = "activated" if user.is_active else "deactivated"

    db.session.add(AuditLog(
        action=f"USER_{status_str.upper()}",
        entity_type="User",
        entity_id=str(user.id),
        details=f"Account {user.email} {status_str}."
    ))
    db.session.commit()

    return api_response(True, f"User {user.name} {status_str} successfully.", data=user.to_dict())
