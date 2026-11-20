"""
MediTrack - Batch Management Routes
Handles batch registration, expiry monitoring, and deletion protection against historical transactions.
"""

from datetime import datetime, date
from flask import Blueprint, request
from extensions import db
from models.batch import Batch
from models.medicine import Medicine
from models.pharmacy import Pharmacy
from models.supplier import Supplier
from models.audit_log import AuditLog
from services.inventory_service import InventoryService
from routes.auth import api_response

batches_bp = Blueprint('batches', __name__, url_prefix='/api/batches')

def _parse_batch_id(id_val):
    if isinstance(id_val, str) and id_val.upper().startswith('BAT-'):
        try:
            return int(id_val.split('-')[1])
        except (IndexError, ValueError):
            return None
    try:
        return int(id_val)
    except ValueError:
        return None

def _parse_med_id(id_val):
    if isinstance(id_val, str) and id_val.upper().startswith('MED-'):
        try:
            return int(id_val.split('-')[1])
        except (IndexError, ValueError):
            return None
    try:
        return int(id_val)
    except ValueError:
        return None


@batches_bp.route('', methods=['GET'])
def get_batches():
    """
    List batches with dynamic days-to-expiry calculation.
    Query params: pharmacy_id, medicine_id, status, search
    """
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    medicine_id = request.args.get('medicine_id')
    status_filter = request.args.get('status', '').strip()
    search = request.args.get('q', '').strip()

    query = Batch.query

    if pharmacy_id:
        query = query.filter_by(pharmacy_id=pharmacy_id)

    if medicine_id:
        pk = _parse_med_id(medicine_id)
        if pk:
            query = query.filter_by(medicine_id=pk)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(Batch.batch_number.ilike(search_fmt))

    batches = query.order_by(Batch.expiry_date.asc()).all()
    results = [b.to_dict() for b in batches]

    if status_filter and status_filter != 'All':
        results = [r for r in results if r['expiry_status'].lower() == status_filter.lower()]

    return api_response(True, "Batches retrieved successfully.", data=results)


@batches_bp.route('/<batch_id>', methods=['GET'])
def get_batch(batch_id):
    """Retrieve specific batch record"""
    pk = _parse_batch_id(batch_id)
    if not pk:
        return api_response(False, "Invalid batch ID.", error_code="INVALID_ID", status_code=400)

    batch = db.session.get(Batch, pk)
    if not batch:
        return api_response(False, "Batch not found.", error_code="NOT_FOUND", status_code=404)

    return api_response(True, "Batch details retrieved.", data=batch.to_dict())


@batches_bp.route('', methods=['POST'])
def create_batch():
    """
    Register a new batch and automatically log inward stock receipt transaction.
    Body: {
      "medicineId": 1 or "MED-1",
      "batchNumber": "AMX-2026-X1",
      "pharmacyId": 1,
      "mfgDate": "2025-01-01",
      "expiryDate": "2027-01-01",
      "quantity": 150,
      "purchasePrice": 12.50,
      "supplier": "Apollo Wholesale"
    }
    """
    payload = request.get_json(silent=True) or {}
    
    med_id_raw = payload.get('medicineId') or payload.get('medicine_id')
    med_pk = _parse_med_id(med_id_raw)
    batch_num = (payload.get('batchNumber') or payload.get('batch_number') or '').strip().upper()
    expiry_str = payload.get('expiryDate') or payload.get('expiry_date')

    if not med_pk:
        return api_response(False, "Valid medicine selection is required.", error_code="VALIDATION_ERROR", status_code=400)
    if not batch_num:
        return api_response(False, "Batch number is required.", error_code="VALIDATION_ERROR", status_code=400)
    if not expiry_str:
        return api_response(False, "Expiry date is mandatory.", error_code="VALIDATION_ERROR", status_code=400)

    # Resolve Pharmacy (default to first active pharmacy if not specified)
    pharmacy_id = payload.get('pharmacyId') or payload.get('pharmacy_id')
    if not pharmacy_id:
        p_first = Pharmacy.query.filter_by(is_active=True).first()
        pharmacy_id = p_first.id if p_first else 1

    try:
        qty = int(payload.get('quantity', 0))
        price = float(payload.get('purchasePrice', payload.get('purchase_price', 0.0)))
        exp_date = datetime.strptime(expiry_str, '%Y-%m-%d').date()
    except (ValueError, TypeError) as e:
        return api_response(False, f"Data format error: {str(e)}", error_code="VALIDATION_ERROR", status_code=400)

    mfg_str = payload.get('mfgDate') or payload.get('manufacturing_date')
    mfg_date = datetime.strptime(mfg_str, '%Y-%m-%d').date() if mfg_str else date.today()

    # Resolve Supplier
    supplier_name = (payload.get('supplier') or payload.get('supplier_name') or '').strip()
    supplier_id = None
    if supplier_name:
        supp = Supplier.query.filter(Supplier.name.ilike(supplier_name)).first()
        if not supp:
            supp = Supplier(name=supplier_name, created_at=datetime.utcnow())
            db.session.add(supp)
            db.session.flush()
        supplier_id = supp.id

    try:
        batch, txn = InventoryService.receive_stock(
            pharmacy_id=pharmacy_id,
            medicine_id=med_pk,
            batch_number=batch_num,
            quantity=qty,
            user_id=None,
            supplier_id=supplier_id,
            mfg_date=mfg_date,
            expiry_date=exp_date,
            purchase_price=price,
            remarks=f"Initial registration for Batch {batch_num}"
        )
    except ValueError as val_err:
        return api_response(False, str(val_err), error_code="BUSINESS_RULE_VIOLATION", status_code=400)

    return api_response(True, f"Batch {batch.batch_number} registered successfully.", data=batch.to_dict(), status_code=201)


@batches_bp.route('/<batch_id>', methods=['PUT'])
def update_batch(batch_id):
    """Update batch parameters (purchase price, expiry date, notes)"""
    pk = _parse_batch_id(batch_id)
    if not pk:
        return api_response(False, "Invalid batch ID.", error_code="INVALID_ID", status_code=400)

    batch = db.session.get(Batch, pk)
    if not batch:
        return api_response(False, "Batch not found.", error_code="NOT_FOUND", status_code=404)

    payload = request.get_json(silent=True) or {}
    
    if 'purchasePrice' in payload or 'purchase_price' in payload:
        try:
            batch.purchase_price = float(payload.get('purchasePrice') or payload.get('purchase_price'))
        except (ValueError, TypeError):
            pass

    if 'expiryDate' in payload or 'expiry_date' in payload:
        try:
            exp_str = payload.get('expiryDate') or payload.get('expiry_date')
            batch.expiry_date = datetime.strptime(exp_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    if 'batchNumber' in payload or 'batch_number' in payload:
        batch.batch_number = (payload.get('batchNumber') or payload.get('batch_number')).strip().upper()

    batch.updated_at = datetime.utcnow()
    db.session.commit()

    return api_response(True, f"Batch {batch.batch_number} updated successfully.", data=batch.to_dict())


@batches_bp.route('/<batch_id>', methods=['DELETE'])
def delete_batch(batch_id):
    """
    Delete batch guard:
    Do not allow deletion of a batch that has historical transactions unless an
    administrator performs an appropriate archival operation (?archive=true).
    """
    pk = _parse_batch_id(batch_id)
    if not pk:
        return api_response(False, "Invalid batch ID.", error_code="INVALID_ID", status_code=400)

    batch = db.session.get(Batch, pk)
    if not batch:
        return api_response(False, "Batch not found.", error_code="NOT_FOUND", status_code=404)

    txn_count = batch.stock_transactions.count()
    is_archive = request.args.get('archive', '').lower() == 'true'

    if txn_count > 0 and not is_archive:
        return api_response(
            False,
            f"Cannot delete Batch {batch.batch_number}: It has {txn_count} historical audit transactions. Batches with transaction history must be archived or zeroed via stock adjustment.",
            error_code="HISTORICAL_TRANSACTIONS_EXIST",
            status_code=400
        )

    batch_num = batch.batch_number
    db.session.delete(batch)
    db.session.commit()

    db.session.add(AuditLog(
        action="ARCHIVE_BATCH" if is_archive else "DELETE_BATCH",
        entity_type="Batch",
        entity_id=str(pk),
        details=f"Batch {batch_num} removed by operator (Archival: {is_archive})"
    ))
    db.session.commit()

    return api_response(True, f"Batch {batch_num} {'archived' if is_archive else 'deleted'} successfully.")
