"""
MediTrack - Medicine Formulary Routes
CRUD endpoints with search, category filtering, and pagination.
"""

from datetime import datetime
from flask import Blueprint, request
from extensions import db
from models.medicine import Medicine
from models.audit_log import AuditLog
from routes.auth import api_response

medicines_bp = Blueprint('medicines', __name__, url_prefix='/api/medicines')

def _parse_med_id(id_val):
    """Normalize ID string (e.g. 'MED-1001' or '1001' -> 1001)"""
    if isinstance(id_val, str) and id_val.upper().startswith('MED-'):
        try:
            return int(id_val.split('-')[1])
        except (IndexError, ValueError):
            return None
    try:
        return int(id_val)
    except ValueError:
        return None


@medicines_bp.route('', methods=['GET'])
def get_medicines():
    """
    Retrieve medicines catalog with optional search, category filter, and pagination.
    Query params: q, category, status, page, per_page, pharmacy_id
    """
    search = request.args.get('q', '').strip()
    category = request.args.get('category', '').strip()
    status_filter = request.args.get('status', '').strip()
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    query = Medicine.query

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            db.or_(
                Medicine.name.ilike(search_fmt),
                Medicine.generic_name.ilike(search_fmt),
                Medicine.manufacturer.ilike(search_fmt),
                Medicine.category.ilike(search_fmt)
            )
        )

    if category and category != 'All':
        query = query.filter_by(category=category)

    # Order by name
    query = query.order_by(Medicine.name.asc())

    medicines = query.all()
    results = [m.to_dict(pharmacy_id) for m in medicines]

    # Filter by stock status if requested
    if status_filter and status_filter != 'All':
        results = [r for r in results if r['status'].lower() == status_filter.lower()]

    # Apply pagination
    total_count = len(results)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_items = results[start_idx:end_idx]

    return api_response(True, "Medicines retrieved successfully.", data={
        'medicines': paginated_items,
        'total': total_count,
        'page': page,
        'per_page': per_page
    })


@medicines_bp.route('/<med_id>', methods=['GET'])
def get_medicine(med_id):
    """Retrieve specific medicine record with associated batches"""
    pk = _parse_med_id(med_id)
    if not pk:
        return api_response(False, "Invalid medicine ID.", error_code="INVALID_ID", status_code=400)

    medicine = db.session.get(Medicine, pk)
    if not medicine:
        return api_response(False, "Medicine not found.", error_code="NOT_FOUND", status_code=404)

    pharmacy_id = request.args.get('pharmacy_id', type=int)
    data = medicine.to_dict(pharmacy_id)
    data['batches'] = [b.to_dict() for b in medicine.batches.all()]

    return api_response(True, "Medicine details retrieved.", data=data)


@medicines_bp.route('', methods=['POST'])
def create_medicine():
    """
    Register a new medicine formulation in the formulary.
    Body: {"name": "...", "genericName": "...", "category": "...", "strength": "...", "minStock": 50, ...}
    """
    payload = request.get_json(silent=True) or {}
    name = (payload.get('name') or payload.get('medicineName') or '').strip()
    category = (payload.get('category') or '').strip()

    if not name:
        return api_response(False, "Medicine name is required.", error_code="VALIDATION_ERROR", status_code=400)
    if not category:
        return api_response(False, "Category is required.", error_code="VALIDATION_ERROR", status_code=400)

    # Check for duplicate medicine name & strength
    strength = payload.get('strength', '').strip()
    existing = Medicine.query.filter_by(name=name, strength=strength).first()
    if existing:
        return api_response(
            False,
            f"A medicine named '{name}' ({strength}) already exists in the formulary.",
            error_code="DUPLICATE_ENTRY",
            status_code=409
        )

    try:
        min_stock = int(payload.get('minStock', payload.get('minimum_stock', 50)))
        if min_stock < 0:
            min_stock = 0
    except (ValueError, TypeError):
        min_stock = 50

    medicine = Medicine(
        name=name,
        generic_name=payload.get('genericName', payload.get('generic_name', '')).strip(),
        category=category,
        strength=strength,
        manufacturer=payload.get('manufacturer', '').strip(),
        description=payload.get('description', '').strip(),
        minimum_stock=min_stock,
        created_at=datetime.utcnow()
    )

    db.session.add(medicine)
    db.session.commit()

    # Audit log
    db.session.add(AuditLog(
        action="CREATE_MEDICINE",
        entity_type="Medicine",
        entity_id=str(medicine.id),
        details=f"Created medicine {medicine.name} (Category: {medicine.category}, MinStock: {medicine.minimum_stock})"
    ))
    db.session.commit()

    return api_response(True, "Medicine registered successfully.", data=medicine.to_dict(), status_code=201)


@medicines_bp.route('/<med_id>', methods=['PUT'])
def update_medicine(med_id):
    """Update medicine parameters"""
    pk = _parse_med_id(med_id)
    if not pk:
        return api_response(False, "Invalid medicine ID.", error_code="INVALID_ID", status_code=400)

    medicine = db.session.get(Medicine, pk)
    if not medicine:
        return api_response(False, "Medicine not found.", error_code="NOT_FOUND", status_code=404)

    payload = request.get_json(silent=True) or {}
    
    if 'name' in payload:
        medicine.name = payload['name'].strip()
    if 'genericName' in payload or 'generic_name' in payload:
        medicine.generic_name = (payload.get('genericName') or payload.get('generic_name', '')).strip()
    if 'category' in payload:
        medicine.category = payload['category'].strip()
    if 'strength' in payload:
        medicine.strength = payload['strength'].strip()
    if 'manufacturer' in payload:
        medicine.manufacturer = payload['manufacturer'].strip()
    if 'description' in payload:
        medicine.description = payload['description'].strip()
    if 'minStock' in payload or 'minimum_stock' in payload:
        try:
            medicine.minimum_stock = int(payload.get('minStock') or payload.get('minimum_stock'))
        except (ValueError, TypeError):
            pass

    medicine.updated_at = datetime.utcnow()
    db.session.commit()

    # Audit log
    db.session.add(AuditLog(
        action="UPDATE_MEDICINE",
        entity_type="Medicine",
        entity_id=str(medicine.id),
        details=f"Updated medicine parameters for {medicine.name}"
    ))
    db.session.commit()

    return api_response(True, "Medicine updated successfully.", data=medicine.to_dict())


@medicines_bp.route('/<med_id>', methods=['DELETE'])
def delete_medicine(med_id):
    """Delete medicine if no historical transactions are tied to its batches"""
    pk = _parse_med_id(med_id)
    if not pk:
        return api_response(False, "Invalid medicine ID.", error_code="INVALID_ID", status_code=400)

    medicine = db.session.get(Medicine, pk)
    if not medicine:
        return api_response(False, "Medicine not found.", error_code="NOT_FOUND", status_code=404)

    # Check for active non-zero stock batches
    active_batches = [b for b in medicine.batches.all() if b.quantity > 0]
    if active_batches:
        return api_response(
            False,
            f"Cannot delete '{medicine.name}' because {len(active_batches)} active batches still hold inventory. Reconcile or quarantine batches first.",
            error_code="ACTIVE_STOCK_EXISTS",
            status_code=400
        )

    med_name = medicine.name
    db.session.delete(medicine)
    db.session.commit()

    db.session.add(AuditLog(
        action="DELETE_MEDICINE",
        entity_type="Medicine",
        entity_id=str(pk),
        details=f"Deleted medicine {med_name} from catalog."
    ))
    db.session.commit()

    return api_response(True, f"Medicine '{med_name}' deleted successfully.")
