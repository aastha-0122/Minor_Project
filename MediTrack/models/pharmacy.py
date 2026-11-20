"""
MediTrack - Pharmacy Model
Represents licensed hospital dispensaries, community pharmacies, and clinic drug depots.
"""

from datetime import datetime
from extensions import db

class Pharmacy(db.Model):
    __tablename__ = 'pharmacies'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(100), nullable=False, index=True)
    state = db.Column(db.String(100), nullable=True)
    pincode = db.Column(db.String(20), nullable=False, index=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    contact = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    users = db.relationship('User', back_populates='pharmacy', lazy='dynamic')
    batches = db.relationship('Batch', back_populates='pharmacy', lazy='dynamic')
    stock_transactions = db.relationship('StockTransaction', back_populates='pharmacy', lazy='dynamic')
    alerts = db.relationship('Alert', back_populates='pharmacy', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'pincode': self.pincode,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'contact': self.contact,
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

    def __repr__(self):
        return f"<Pharmacy {self.id}: {self.name} ({self.city})>"
