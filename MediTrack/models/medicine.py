"""
MediTrack - Medicine Formulary Model
Represents therapeutic formulations, dosage strengths, categories, and safety minimum stocks.
"""

from datetime import datetime, date
from extensions import db

class Medicine(db.Model):
    __tablename__ = 'medicines'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    generic_name = db.Column(db.String(150), nullable=True, index=True)
    category = db.Column(db.String(100), nullable=False, index=True)
    strength = db.Column(db.String(50), nullable=True)
    manufacturer = db.Column(db.String(150), nullable=True)
    description = db.Column(db.Text, nullable=True)
    minimum_stock = db.Column(db.Integer, default=50, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    batches = db.relationship('Batch', back_populates='medicine', lazy='dynamic', cascade='all, delete-orphan')

    def get_valid_stock(self, pharmacy_id=None):
        """
        Calculate total available, non-expired stock for this medicine.
        Expired inventory is strictly excluded from available inventory.
        """
        from models.batch import Batch
        today = date.today()
        query = Batch.query.filter(
            Batch.medicine_id == self.id,
            Batch.expiry_date > today,
            Batch.quantity > 0
        )
        if pharmacy_id:
            query = query.filter(Batch.pharmacy_id == pharmacy_id)
        return sum(b.quantity for b in query.all())

    def get_total_stock(self, pharmacy_id=None):
        """Sum of all inventory units across active batches (including expired)"""
        from models.batch import Batch
        query = Batch.query.filter(Batch.medicine_id == self.id)
        if pharmacy_id:
            query = query.filter(Batch.pharmacy_id == pharmacy_id)
        return sum(b.quantity for b in query.all())

    def get_stock_status(self, pharmacy_id=None):
        valid = self.get_valid_stock(pharmacy_id)
        if valid == 0:
            return "Out of Stock"
        elif valid <= self.minimum_stock:
            return "Low Stock"
        return "In Stock"

    def to_dict(self, pharmacy_id=None):
        valid_qty = self.get_valid_stock(pharmacy_id)
        total_qty = self.get_total_stock(pharmacy_id)
        return {
            'id': f"MED-{self.id}",
            'raw_id': self.id,
            'name': self.name,
            'generic_name': self.generic_name,
            'category': self.category,
            'strength': self.strength,
            'manufacturer': self.manufacturer,
            'description': self.description,
            'minimum_stock': self.minimum_stock,
            'valid_stock': valid_qty,
            'total_stock': total_qty,
            'status': self.get_stock_status(pharmacy_id),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

    def __repr__(self):
        return f"<Medicine {self.id}: {self.name} ({self.strength})>"
