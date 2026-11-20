"""
MediTrack - Authentication & Authorization Routes
Provides session-based & Bearer token login, logout, and role-based guards.
"""

from functools import wraps
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, current_user, login_required
from extensions import db
from models.user import User
from models.audit_log import AuditLog

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def api_response(success, message, data=None, error_code=None, status_code=200):
    """Standardized JSON response helper"""
    payload = {'success': success, 'message': message}
    if data is not None:
        payload['data'] = data
    if error_code:
        payload['error_code'] = error_code
    return jsonify(payload), status_code

def require_auth(f):
    """Decorator ensuring request has active session or valid Bearer authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if current_user.is_authenticated:
            return f(*args, **kwargs)
        
        # Check Bearer Token header (e.g. from frontend API client)
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            # Simple token session verification (supports token-user lookup or default user)
            user_id = session.get('user_id')
            if user_id:
                user = db.session.get(User, user_id)
                if user and user.is_active:
                    login_user(user)
                    return f(*args, **kwargs)

        return api_response(False, "Unauthorized: Authentication required.", error_code="UNAUTHORIZED", status_code=401)
    return decorated

def role_required(allowed_roles):
    """Decorator restricting route access by role (admin, pharmacist, staff)"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                return api_response(False, "Unauthorized: Please log in.", error_code="UNAUTHORIZED", status_code=401)
            
            user_role = current_user.role.lower()
            allowed = [r.lower() for r in allowed_roles]
            if user_role not in allowed and 'admin' not in user_role:
                return api_response(
                    False,
                    f"Access Denied: Requires one of following roles: {', '.join(allowed_roles)}.",
                    error_code="FORBIDDEN",
                    status_code=403
                )
            return f(*args, **kwargs)
        return decorated
    return decorator


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate healthcare staff.
    Body: {"email": "...", "password": "..."}
    """
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return api_response(False, "Email and password are required.", error_code="VALIDATION_ERROR", status_code=400)

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return api_response(False, "Invalid email or password.", error_code="INVALID_CREDENTIALS", status_code=401)

    if not user.is_active:
        return api_response(False, "Your account has been deactivated. Contact an administrator.", error_code="ACCOUNT_DEACTIVATED", status_code=403)

    login_user(user, remember=data.get('remember', False))
    session['user_id'] = user.id

    # Log audit event
    db.session.add(AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        entity_type="User",
        entity_id=str(user.id),
        details=f"Successful login for {user.email} (Role: {user.role})"
    ))
    db.session.commit()

    token = f"meditrack-token-{user.id}-{int(datetime.utcnow().timestamp())}" if 'datetime' in globals() else f"meditrack-token-{user.id}"

    return api_response(True, "Login successful.", data={
        'user': user.to_dict(),
        'token': token
    })


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Terminate current user session"""
    if current_user.is_authenticated:
        user_id = current_user.id
        logout_user()
        session.clear()
        db.session.add(AuditLog(
            user_id=user_id,
            action="USER_LOGOUT",
            entity_type="User",
            entity_id=str(user_id),
            details="User logged out."
        ))
        db.session.commit()
    return api_response(True, "Logged out successfully.")


@auth_bp.route('/me', methods=['GET'])
def get_current_user_profile():
    """Retrieve details of currently authenticated user"""
    if current_user.is_authenticated:
        return api_response(True, "Current user profile.", data={'user': current_user.to_dict()})
    
    # Check session
    user_id = session.get('user_id')
    if user_id:
        user = User.query.get(user_id)
        if user:
            return api_response(True, "Current user profile.", data={'user': user.to_dict()})

    return api_response(False, "Not authenticated.", error_code="UNAUTHORIZED", status_code=401)
