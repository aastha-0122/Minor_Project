"""
MediTrack - Alert Model
Automated clinical notifications: LOW_STOCK, NEAR_EXPIRY, EXPIRED, OUT_OF_STOCK.
"""

from datetime import datetime
from extensions import db

class Alert(db.Model):
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id', ondelete='CASCADE'), nullable=False, index=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.id', ondelete='SET NULL'), nullable=True, index=True)
    medicine_id = db.Column(db.Integer, db.ForeignKey('medicines.id', ondelete='CASCADE'), nullable=True, index=True)
    
    alert_type = db.Column(db.String(30), nullable=False, index=True)  # LOW_STOCK, NEAR_EXPIRY, EXPIRED, OUT_OF_STOCK
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    pharmacy = db.relationship('Pharmacy', back_populates='alerts')
    batch = db.relationship('Batch', back_populates='alerts')
    medicine = db.relationship('Medicine')

    def to_dict(self):
        med = self.medicine or (self.batch.medicine if self.batch else None)
        severity_map = {
            'EXPIRED': 'critical',
            'OUT_OF_STOCK': 'critical',
            'LOW_STOCK': 'warning',
            'NEAR_EXPIRY': 'warning'
        }
        return {
            'id': f"ALT-{self.id}",
            'raw_id': self.id,
            'pharmacy_id': self.pharmacy_id,
            'pharmacy': self.pharmacy.name if self.pharmacy else 'Central Hospital Pharmacy',
            'batch_id': self.batch_id,
            'batch_number': self.batch.batch_number if self.batch else 'N/A',
            'medicine_id': f"MED-{med.id}" if med else 'N/A',
            'medicine_name': med.name if med else 'General Inventory Item',
            'type': self.alert_type,
            'severity': severity_map.get(self.alert_type, 'info'),
            'message': self.message,
            'action_suggested': self.message,
            'quantity': self.batch.quantity if self.batch else (med.get_valid_stock(self.pharmacy_id) if med else 0),
            'expiry_date': self.batch.expiry_date.strftime('%Y-%m-%d') if self.batch and self.batch.expiry_date else None,
            'is_read': self.is_read,
            'status': 'Resolved' if self.is_read else 'Active',
            'date': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

    def __repr__(self):
        return f"<Alert {self.id}: {self.alert_type} for Pharmacy {self.pharmacy_id} ({self.message[:30]})>"
