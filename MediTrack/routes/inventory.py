"""
MediTrack - Inventory & Stock Operations Routes
Handles inward stock receiving, FEFO dispensing, audit adjustments, and transaction ledger.
"""

from datetime import datetime
from flask import Blueprint, request
from extensions import db
from models.batch import Batch
from models.pharmacy import Pharmacy
from models.transaction import StockTransaction
from services.inventory_service import InventoryService
from routes.auth import api_response

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')

def _resolve_pharmacy(pharmacy_id=None):
    if pharmacy_id:
        return pharmacy_id
    p = Pharmacy.query.filter_by(is_active=True).first()
    return p.id if p else 1

def _parse_med_id(id_val):
    if isinstance(id_val, str) and id_val.upper().startswith('MED-'):
        try:
            return int(id_val.split('-')[1])
        except (IndexError, ValueError):
            return None
    try:
        return int(id_val)
    except (ValueError, TypeError):
        return None

def _parse_batch_id(id_val):
    if isinstance(id_val, str) and id_val.upper().startswith('BAT-'):
        try:
            return int(id_val.split('-')[1])
        except (IndexError, ValueError):
            return None
    try:
        return int(id_val)
    except (ValueError, TypeError):
        return None


@inventory_bp.route('/receive', methods=['POST'])
def receive_stock():
    """
    Receive inward stock.
    Body: {
      "batchNumber": "AMX-2025-A2",
      "medicineId": 1,
      "quantity": 100,
      "pharmacyId": 1,
      "purchasePrice": 12.0,
      "remarks": "...",
      "supplierId": 1
    }
    """
    payload = request.get_json(silent=True) or {}
    batch_num = (payload.get('batchNumber') or payload.get('batch_number') or '').strip().upper()
    med_id_raw = payload.get('medicineId') or payload.get('medicine_id')
    med_id = _parse_med_id(med_id_raw)
    pharmacy_id = _resolve_pharmacy(payload.get('pharmacyId') or payload.get('pharmacy_id'))

    try:
        qty = int(payload.get('quantity', 0))
    except (ValueError, TypeError):
        qty = 0

    if not batch_num:
        return api_response(False, "Batch number is required.", error_code="VALIDATION_ERROR", status_code=400)
    if not med_id:
        return api_response(False, "Medicine ID is required.", error_code="VALIDATION_ERROR", status_code=400)
    if qty <= 0:
        return api_response(False, "Quantity received must be a positive number.", error_code="VALIDATION_ERROR", status_code=400)

    try:
        batch, txn = InventoryService.receive_stock(
            pharmacy_id=pharmacy_id,
            medicine_id=med_id,
            batch_number=batch_num,
            quantity=qty,
            user_id=payload.get('userId') or payload.get('user_id'),
            supplier_id=payload.get('supplierId') or payload.get('supplier_id'),
            purchase_price=float(payload.get('purchasePrice', payload.get('purchase_price', 0.0))),
            remarks=payload.get('remarks')
        )
    except ValueError as val_err:
        return api_response(False, str(val_err), error_code="BUSINESS_RULE_VIOLATION", status_code=400)

    return api_response(True, f"Received {qty} units into batch {batch.batch_number}.", data={
        'batch': batch.to_dict(),
        'transaction': txn.to_dict()
    }, status_code=201)


@inventory_bp.route('/dispense', methods=['POST'])
def dispense_stock():
    """
    Dispense stock adhering strictly to First Expiry, First Out (FEFO).
    Body: {
      "medicineId": 1,
      "quantity": 25,
      "pharmacyId": 1,
      "batchNumber": "OPTIONAL",
      "remarks": "Patient Rx-8849"
    }
    """
    payload = request.get_json(silent=True) or {}
    med_id_raw = payload.get('medicineId') or payload.get('medicine_id')
    med_id = _parse_med_id(med_id_raw)
    pharmacy_id = _resolve_pharmacy(payload.get('pharmacyId') or payload.get('pharmacy_id'))

    try:
        qty = int(payload.get('quantity', 0))
    except (ValueError, TypeError):
        qty = 0

    if qty <= 0:
        return api_response(False, "Dispense quantity must be greater than zero.", error_code="VALIDATION_ERROR", status_code=400)

    target_batch_id = None
    batch_num = (payload.get('batchNumber') or payload.get('batch_number') or '').strip().upper()
    if batch_num:
        b_match = Batch.query.filter_by(pharmacy_id=pharmacy_id, batch_number=batch_num).first()
        if b_match:
            target_batch_id = b_match.id
            if not med_id:
                med_id = b_match.medicine_id

    if not med_id and not target_batch_id:
        return api_response(False, "Please select a valid medicine or batch to dispense.", error_code="VALIDATION_ERROR", status_code=400)

    try:
        manifest = InventoryService.dispense_fefo(
            pharmacy_id=pharmacy_id,
            medicine_id=med_id,
            quantity=qty,
            user_id=payload.get('userId') or payload.get('user_id'),
            remarks=payload.get('remarks'),
            target_batch_id=target_batch_id
        )
    except ValueError as val_err:
        return api_response(False, str(val_err), error_code="INSUFFICIENT_STOCK", status_code=400)

    serialized_manifest = [
        {
            'batch_number': item['batch'].batch_number,
            'dispensed_units': item['dispensed_quantity'],
            'expiry_date': item['batch'].expiry_date.strftime('%Y-%m-%d'),
            'transaction_id': item['transaction'].id
        }
        for item in manifest
    ]

    return api_response(True, f"Successfully dispensed {qty} units via FEFO protocol.", data={
        'total_dispensed': qty,
        'manifest': serialized_manifest
    })


@inventory_bp.route('/adjustment', methods=['POST'])
def adjust_stock():
    """
    Commit an inventory audit adjustment (+ or -).
    Body: {
      "batchId": 1 or "batchNumber": "AMX-2025-A2",
      "quantity": -5,
      "pharmacyId": 1,
      "reason": "Damaged Packaging",
      "remarks": "..."
    }
    """
    payload = request.get_json(silent=True) or {}
    pharmacy_id = _resolve_pharmacy(payload.get('pharmacyId') or payload.get('pharmacy_id'))
    
    batch_id_raw = payload.get('batchId') or payload.get('batch_id')
    batch_pk = _parse_batch_id(batch_id_raw)
    batch_num = (payload.get('batchNumber') or payload.get('batch_number') or '').strip().upper()

    if not batch_pk and batch_num:
        b = Batch.query.filter_by(pharmacy_id=pharmacy_id, batch_number=batch_num).first()
        if b:
            batch_pk = b.id

    if not batch_pk:
        return api_response(False, "A valid batch is required for adjustment.", error_code="VALIDATION_ERROR", status_code=400)

    try:
        qty_change = int(payload.get('quantity', 0))
    except (ValueError, TypeError):
        qty_change = 0

    if qty_change == 0:
        return api_response(False, "Adjustment quantity must be non-zero.", error_code="VALIDATION_ERROR", status_code=400)

    reason = payload.get('reason', 'Audit Variance')
    remarks = payload.get('remarks', '')

    try:
        batch, txn = InventoryService.adjust_stock(
            pharmacy_id=pharmacy_id,
            batch_id=batch_pk,
            quantity_change=qty_change,
            user_id=payload.get('userId') or payload.get('user_id'),
            remarks=remarks,
            reason=reason
        )
    except ValueError as val_err:
        return api_response(False, str(val_err), error_code="INVALID_ADJUSTMENT", status_code=400)

    return api_response(True, f"Stock adjustment of {qty_change} units recorded for Batch {batch.batch_number}.", data={
        'batch': batch.to_dict(),
        'transaction': txn.to_dict()
    })


@inventory_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """
    Retrieve inventory transaction ledger.
    Query params: type, pharmacy_id, search, limit
    """
    txn_type = request.args.get('type', '').strip().upper()
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    search = request.args.get('q', '').strip()
    limit = request.args.get('limit', 100, type=int)

    query = StockTransaction.query

    if pharmacy_id:
        query = query.filter_by(pharmacy_id=pharmacy_id)

    if txn_type and txn_type != 'ALL':
        query = query.filter_by(transaction_type=txn_type)

    if search:
        search_fmt = f"%{search}%"
        query = query.join(Batch).join(Medicine).filter(
            db.or_(
                Batch.batch_number.ilike(search_fmt),
                Medicine.name.ilike(search_fmt),
                StockTransaction.remarks.ilike(search_fmt)
            )
        )

    txns = query.order_by(StockTransaction.created_at.desc()).limit(limit).all()
    return api_response(True, "Transactions retrieved.", data=[t.to_dict() for t in txns])
