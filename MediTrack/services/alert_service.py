"""
MediTrack - Alert Service
Evaluates stock boundaries, low-stock thresholds, and manages alert resolution.
"""

from datetime import datetime, date
from extensions import db
from models.medicine import Medicine
from models.batch import Batch
from models.alert import Alert

class AlertService:
    @staticmethod
    def evaluate_medicine_stock_alert(pharmacy_id, medicine_id):
        """
        Calculates eligible available stock (strictly non-expired) for a pharmacy and medicine.
        Compares with medicine.minimum_stock:
        - If valid stock == 0: generate OUT_OF_STOCK alert
        - If 0 < valid stock <= minimum_stock: generate LOW_STOCK alert
        - If valid stock > minimum_stock: auto-resolve existing low/out-of-stock alerts
        Avoids duplicate active alerts.
        """
        medicine = db.session.get(Medicine, medicine_id)
        if not medicine:
            return None

        today = date.today()
        # Strictly query non-expired batches with quantity > 0
        valid_batches = Batch.query.filter(
            Batch.medicine_id == medicine_id,
            Batch.pharmacy_id == pharmacy_id,
            Batch.expiry_date > today,
            Batch.quantity > 0
        ).all()

        total_valid_stock = sum(b.quantity for b in valid_batches)

        # Case 1: Out of Stock
        if total_valid_stock == 0:
            existing = Alert.query.filter_by(
                pharmacy_id=pharmacy_id,
                medicine_id=medicine_id,
                alert_type="OUT_OF_STOCK",
                is_read=False
            ).first()

            if not existing:
                alert = Alert(
                    pharmacy_id=pharmacy_id,
                    medicine_id=medicine_id,
                    alert_type="OUT_OF_STOCK",
                    message=f"CRITICAL DEFICIT: {medicine.name} is completely OUT OF STOCK (0 units) at this facility.",
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                db.session.add(alert)
                db.session.commit()
                return alert

        # Case 2: Low Stock
        elif total_valid_stock <= medicine.minimum_stock:
            existing = Alert.query.filter_by(
                pharmacy_id=pharmacy_id,
                medicine_id=medicine_id,
                alert_type="LOW_STOCK",
                is_read=False
            ).first()

            if not existing:
                alert = Alert(
                    pharmacy_id=pharmacy_id,
                    medicine_id=medicine_id,
                    alert_type="LOW_STOCK",
                    message=f"REORDER NOTICE: {medicine.name} stock ({total_valid_stock} units) has fallen below minimum safety threshold ({medicine.minimum_stock} units).",
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                db.session.add(alert)
                db.session.commit()
                return alert

        # Case 3: Stock is healthy - resolve active stockout alerts
        else:
            active_stock_alerts = Alert.query.filter(
                Alert.pharmacy_id == pharmacy_id,
                Alert.medicine_id == medicine_id,
                Alert.alert_type.in_(["LOW_STOCK", "OUT_OF_STOCK"]),
                Alert.is_read == False
            ).all()
            for a in active_stock_alerts:
                a.is_read = True
            if active_stock_alerts:
                db.session.commit()

        return None

    @staticmethod
    def mark_alert_read(alert_id):
        """Mark an alert as acknowledged / resolved"""
        alert = Alert.query.get(alert_id)
        if alert:
            alert.is_read = True
            db.session.commit()
            return True
        return False
