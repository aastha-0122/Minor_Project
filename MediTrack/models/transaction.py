"""
MediTrack - Stock Transaction Model
Audit ledger of all physical movements: Receive, Dispense (FEFO), Adjustment, Return, and Expired write-offs.
"""

from datetime import datetime
from extensions import db

class StockTransaction(db.Model):
    __tablename__ = 'stock_transactions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.id', ondelete='CASCADE'), nullable=False, index=True)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    transaction_type = db.Column(db.String(30), nullable=False, index=True)  # RECEIVE, DISPENSE, ADJUSTMENT, RETURN, EXPIRED
    quantity = db.Column(db.Integer, nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    batch = db.relationship('Batch', back_populates='stock_transactions')
    pharmacy = db.relationship('Pharmacy', back_populates='stock_transactions')
    user = db.relationship('User', back_populates='transactions')

    def to_dict(self):
        med = self.batch.medicine if self.batch else None
        return {
            'id': f"TXN-{self.id}",
            'raw_id': self.id,
            'batch_id': self.batch_id,
            'batch_number': self.batch.batch_number if self.batch else 'N/A',
            'medicine_id': f"MED-{med.id}" if med else 'N/A',
            'medicine_name': med.name if med else 'N/A',
            'pharmacy_id': self.pharmacy_id,
            'pharmacy': self.pharmacy.name if self.pharmacy else 'Central Hospital Pharmacy',
            'user_id': self.user_id,
            'user': self.user.name if self.user else 'System Automation',
            'type': self.transaction_type,
            'quantity': self.quantity,
            'remarks': self.remarks or '',
            'date': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

    def __repr__(self):
        return f"<StockTransaction {self.id}: {self.transaction_type} {self.quantity} units (Batch: {self.batch_id})>"
