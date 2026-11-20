"""
MediTrack - Inventory Service & FEFO Engine
Implements First-Expired First-Out dispensing algorithms, stock inward receipts, and audit adjustments.
"""

from datetime import date, datetime
from extensions import db
from models.batch import Batch
from models.medicine import Medicine
from models.transaction import StockTransaction
from services.alert_service import AlertService

class InventoryService:
    @staticmethod
    def receive_stock(pharmacy_id, medicine_id, batch_number, quantity, user_id=None,
                      supplier_id=None, mfg_date=None, expiry_date=None, purchase_price=0.0, remarks=None):
        """
        Record inward stock shipment.
        If batch already exists for this pharmacy, increment quantity.
        If new batch, instantiate batch record with manufacturing & expiry dates.
        """
        if quantity <= 0:
            raise ValueError("Inward received quantity must be greater than zero.")

        medicine = db.session.get(Medicine, medicine_id)
        if not medicine:
            raise ValueError(f"Medicine ID {medicine_id} does not exist.")

        batch = Batch.query.filter_by(
            pharmacy_id=pharmacy_id,
            medicine_id=medicine_id,
            batch_number=batch_number.strip().upper()
        ).first()

        if batch:
            batch.quantity += quantity
            if purchase_price > 0:
                batch.purchase_price = purchase_price
            if expiry_date:
                batch.expiry_date = expiry_date
        else:
            if not expiry_date:
                raise ValueError("Expiry date is required when registering a new batch.")
            if not mfg_date:
                mfg_date = date.today()

            batch = Batch(
                medicine_id=medicine_id,
                pharmacy_id=pharmacy_id,
                supplier_id=supplier_id,
                batch_number=batch_number.strip().upper(),
                manufacturing_date=mfg_date,
                expiry_date=expiry_date,
                quantity=quantity,
                purchase_price=purchase_price,
                created_at=datetime.utcnow()
            )
            db.session.add(batch)
            db.session.flush()

        # Record RECEIVE Transaction
        txn = StockTransaction(
            batch_id=batch.id,
            pharmacy_id=pharmacy_id,
            user_id=user_id,
            transaction_type='RECEIVE',
            quantity=quantity,
            remarks=remarks or f"Inward stock receipt for batch {batch.batch_number}",
            created_at=datetime.utcnow()
        )
        db.session.add(txn)
        db.session.commit()

        # Re-evaluate stock alert status
        AlertService.evaluate_medicine_stock_alert(pharmacy_id, medicine_id)

        return batch, txn

    @staticmethod
    def dispense_fefo(pharmacy_id, medicine_id, quantity, user_id=None, remarks=None, target_batch_id=None):
        """
        Dispense stock adhering strictly to First Expiry, First Out (FEFO):
        1. Find valid batches for requested pharmacy & medicine.
        2. Exclude expired batches (expiry_date <= today).
        3. Exclude zero-stock batches (quantity <= 0).
        4. Sort by earliest expiry date.
        5. Use the earliest eligible batch first.
        6. If batch doesn't contain enough, continue with next eligible batch.
        7. Record each resulting transaction.
        Never dispense expired batches or allow negative stock.
        """
        if quantity <= 0:
            raise ValueError("Dispense quantity must be greater than zero.")

        today = date.today()
        medicine = db.session.get(Medicine, medicine_id)
        if not medicine:
            raise ValueError(f"Medicine ID {medicine_id} not found.")

        # If a specific batch was explicitly chosen by pharmacist
        if target_batch_id:
            batch = Batch.query.filter_by(id=target_batch_id, pharmacy_id=pharmacy_id).first()
            if not batch:
                raise ValueError("Target batch was not found in this pharmacy.")
            if batch.expiry_date <= today:
                raise ValueError(f"Regulatory Violation: Batch {batch.batch_number} is EXPIRED. Cannot dispense.")
            if batch.quantity < quantity:
                raise ValueError(f"Insufficient stock in Batch {batch.batch_number}. Available: {batch.quantity}, Requested: {quantity}.")

            batch.quantity -= quantity
            txn = StockTransaction(
                batch_id=batch.id,
                pharmacy_id=pharmacy_id,
                user_id=user_id,
                transaction_type='DISPENSE',
                quantity=quantity,
                remarks=remarks or f"Direct dispensing from Batch {batch.batch_number}",
                created_at=datetime.utcnow()
            )
            db.session.add(txn)
            db.session.commit()

            AlertService.evaluate_medicine_stock_alert(pharmacy_id, medicine_id)
            return [{'batch': batch, 'dispensed_quantity': quantity, 'transaction': txn}]

        # Standard FEFO Algorithm
        eligible_batches = Batch.query.filter(
            Batch.medicine_id == medicine_id,
            Batch.pharmacy_id == pharmacy_id,
            Batch.expiry_date > today,
            Batch.quantity > 0
        ).order_by(Batch.expiry_date.asc()).all()

        total_available = sum(b.quantity for b in eligible_batches)
        if total_available < quantity:
            raise ValueError(
                f"Insufficient unexpired stock for {medicine.name}. "
                f"Requested: {quantity} units, Total Eligible Stock: {total_available} units."
            )

        remaining_to_dispense = quantity
        dispense_manifest = []

        for batch in eligible_batches:
            if remaining_to_dispense <= 0:
                break

            deduct_qty = min(batch.quantity, remaining_to_dispense)
            batch.quantity -= deduct_qty
            remaining_to_dispense -= deduct_qty

            txn = StockTransaction(
                batch_id=batch.id,
                pharmacy_id=pharmacy_id,
                user_id=user_id,
                transaction_type='DISPENSE',
                quantity=deduct_qty,
                remarks=remarks or f"FEFO dispense: {deduct_qty} units from Batch {batch.batch_number} (Exp: {batch.expiry_date})",
                created_at=datetime.utcnow()
            )
            db.session.add(txn)
            dispense_manifest.append({
                'batch': batch,
                'dispensed_quantity': deduct_qty,
                'transaction': txn
            })

        db.session.commit()

        # Re-evaluate stock alert status
        AlertService.evaluate_medicine_stock_alert(pharmacy_id, medicine_id)

        return dispense_manifest

    @staticmethod
    def adjust_stock(pharmacy_id, batch_id, quantity_change, user_id=None, remarks=None, reason="Reconciliation"):
        """
        Adjust stock quantity (positive or negative) following physical count audits or write-offs.
        Guards against creating negative inventory.
        """
        if quantity_change == 0:
            raise ValueError("Adjustment quantity cannot be zero.")

        batch = Batch.query.filter_by(id=batch_id, pharmacy_id=pharmacy_id).first()
        if not batch:
            raise ValueError(f"Batch ID {batch_id} not found in this pharmacy.")

        new_quantity = batch.quantity + quantity_change
        if new_quantity < 0:
            raise ValueError(f"Cannot adjust stock below 0. Current: {batch.quantity}, Adjustment: {quantity_change}.")

        batch.quantity = new_quantity

        txn = StockTransaction(
            batch_id=batch.id,
            pharmacy_id=pharmacy_id,
            user_id=user_id,
            transaction_type='ADJUSTMENT',
            quantity=quantity_change,
            remarks=f"[{reason}] {remarks or 'Audit reconciliation'}",
            created_at=datetime.utcnow()
        )
        db.session.add(txn)
        db.session.commit()

        # Re-evaluate stock alerts
        AlertService.evaluate_medicine_stock_alert(pharmacy_id, batch.medicine_id)

        return batch, txn
