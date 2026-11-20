"""
MediTrack - Medicine Batch Model
Maintains specific lot manufacturing dates, expiry horizons, purchase valuations, and unit counts.
"""

from datetime import datetime, date
from extensions import db

class Batch(db.Model):
    __tablename__ = 'batches'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    medicine_id = db.Column(db.Integer, db.ForeignKey('medicines.id', ondelete='CASCADE'), nullable=False, index=True)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id', ondelete='CASCADE'), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id', ondelete='SET NULL'), nullable=True)
    
    batch_number = db.Column(db.String(100), nullable=False, index=True)
    manufacturing_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False, index=True)
    quantity = db.Column(db.Integer, default=0, nullable=False)
    purchase_price = db.Column(db.Float, default=0.0, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    medicine = db.relationship('Medicine', back_populates='batches')
    pharmacy = db.relationship('Pharmacy', back_populates='batches')
    supplier = db.relationship('Supplier', back_populates='batches')
    stock_transactions = db.relationship('StockTransaction', back_populates='batch', lazy='dynamic')
    alerts = db.relationship('Alert', back_populates='batch', lazy='dynamic')

    @property
    def days_remaining(self):
        """Calculate days remaining to expiry relative to today"""
        today = date.today()
        if not self.expiry_date:
            return 0
        return (self.expiry_date - today).days

    @property
    def is_expired(self):
        return self.days_remaining < 0

    def get_expiry_status(self, near_days=30, upcoming_days=90):
        days = self.days_remaining
        if days < 0:
            return "Expired"
        elif days <= near_days:
            return "Near Expiry"
        elif days <= upcoming_days:
            return "Upcoming Expiry"
        return "Valid"

    def to_dict(self):
        status = self.get_expiry_status()
        badge_map = {
            'Valid': 'badge-valid',
            'Upcoming Expiry': 'badge-upcoming',
            'Near Expiry': 'badge-near-expiry',
            'Expired': 'badge-expired'
        }
        return {
            'id': f"BAT-{self.id}",
            'raw_id': self.id,
            'batch_number': self.batch_number,
            'medicine_id': f"MED-{self.medicine_id}",
            'raw_medicine_id': self.medicine_id,
            'medicine_name': self.medicine.name if self.medicine else 'Unknown Medicine',
            'medicine_generic': self.medicine.generic_name if self.medicine else '',
            'medicine_category': self.medicine.category if self.medicine else '',
            'pharmacy_id': self.pharmacy_id,
            'pharmacy': self.pharmacy.name if self.pharmacy else 'Central Hospital Pharmacy',
            'supplier_id': self.supplier_id,
            'supplier': self.supplier.name if self.supplier else 'Direct Supply',
            'manufacturing_date': self.manufacturing_date.strftime('%Y-%m-%d') if self.manufacturing_date else None,
            'expiry_date': self.expiry_date.strftime('%Y-%m-%d') if self.expiry_date else None,
            'quantity': self.quantity,
            'purchase_price': float(self.purchase_price),
            'days_remaining': self.days_remaining,
            'expiry_status': status,
            'badge_class': badge_map.get(status, 'badge-valid'),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

    def __repr__(self):
        return f"<Batch {self.id}: {self.batch_number} (Exp: {self.expiry_date}, Qty: {self.quantity})>"
