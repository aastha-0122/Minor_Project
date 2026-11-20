"""
MediTrack - Expiry Monitoring Service
Calculates batch shelf-life horizons and executes periodic background scans.
"""

from datetime import date, datetime
from extensions import db
from models.batch import Batch
from models.alert import Alert

class ExpiryService:
    @staticmethod
    def calculate_status(expiry_date, near_days=30, upcoming_days=90):
        """
        Determine expiry classification.
        - Expired: days < 0
        - Near Expiry: 0 <= days <= near_days (Default: 30)
        - Upcoming Expiry: near_days < days <= upcoming_days (Default: 90)
        - Valid: days > upcoming_days
        """
        today = date.today()
        if not expiry_date:
            return "Valid", 999
        
        days = (expiry_date - today).days
        if days < 0:
            return "Expired", days
        elif days <= near_days:
            return "Near Expiry", days
        elif days <= upcoming_days:
            return "Upcoming Expiry", days
        return "Valid", days

    @classmethod
    def scan_and_generate_alerts(cls, app=None):
        """
        Scheduled background task: Scans all non-zero stock batches across all pharmacies
        and creates alerts for Expired or Near-Expiry batches if no duplicate active alert exists.
        """
        def _execute_scan():
            today = date.today()
            batches = Batch.query.filter(Batch.quantity > 0).all()
            created_alerts_count = 0

            for batch in batches:
                status, days = cls.calculate_status(batch.expiry_date)
                
                if status == "Expired":
                    alert_type = "EXPIRED"
                    msg = f"CRITICAL: Batch {batch.batch_number} of {batch.medicine.name} has EXPIRED ({abs(days)} days ago). Quarantine immediately."
                elif status == "Near Expiry":
                    alert_type = "NEAR_EXPIRY"
                    msg = f"WARNING: Batch {batch.batch_number} of {batch.medicine.name} expires in {days} days. Prioritize for FEFO dispensing."
                else:
                    continue  # Valid or Upcoming - no critical alert needed

                # Prevent duplicate active/unread alerts for this specific batch & alert_type
                existing = Alert.query.filter_by(
                    pharmacy_id=batch.pharmacy_id,
                    batch_id=batch.id,
                    alert_type=alert_type,
                    is_read=False
                ).first()

                if not existing:
                    new_alert = Alert(
                        pharmacy_id=batch.pharmacy_id,
                        batch_id=batch.id,
                        medicine_id=batch.medicine_id,
                        alert_type=alert_type,
                        message=msg,
                        is_read=False,
                        created_at=datetime.utcnow()
                    )
                    db.session.add(new_alert)
                    created_alerts_count += 1

            if created_alerts_count > 0:
                db.session.commit()
            return created_alerts_count

        if app:
            with app.app_context():
                return _execute_scan()
        else:
            return _execute_scan()
