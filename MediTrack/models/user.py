"""
MediTrack - User Model
Healthcare system users with role-based access control (Admin, Pharmacist, Staff).
"""

from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default='staff')  # 'admin', 'pharmacist', 'staff'
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id', ondelete='SET NULL'), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    pharmacy = db.relationship('Pharmacy', back_populates='users')
    transactions = db.relationship('StockTransaction', back_populates='user', lazy='dynamic')
    audit_logs = db.relationship('AuditLog', back_populates='user', lazy='dynamic')

    def set_password(self, password):
        """Hash and store password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify given password against hash"""
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self):
        return self.role.lower() == 'admin'

    @property
    def is_pharmacist(self):
        return self.role.lower() in ('admin', 'pharmacist')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'pharmacy_id': self.pharmacy_id,
            'pharmacy_name': self.pharmacy.name if self.pharmacy else 'Central Hospital Administration',
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

    def __repr__(self):
        return f"<User {self.id}: {self.email} ({self.role})>"
