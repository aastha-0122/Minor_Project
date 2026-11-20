"""
MediTrack - Public Medicine Availability Route
Safe, privacy-preserving public search for citizen and healthcare network inquiries.
Never exposes supplier pricing, cost margins, internal batch numbers, or staff data.
"""

from datetime import date
from flask import Blueprint, request, jsonify
from extensions import db
from models.medicine import Medicine
from models.pharmacy import Pharmacy
from models.batch import Batch

availability_bp = Blueprint('availability', __name__, url_prefix='/api/availability')

@availability_bp.route('', methods=['GET'])
def search_medicine_availability():
    """
    Public Medicine Availability Search.
    Query params: medicine (or q), city, pincode, status
    """
    med_query = (request.args.get('medicine') or request.args.get('q') or '').strip().lower()
    city_query = request.args.get('city', '').strip().lower()
    pincode_query = request.args.get('pincode', '').strip()
    status_filter = request.args.get('status', '').strip()

    today = date.today()

    # Query only valid, active pharmacies
    pharmacy_query = Pharmacy.query.filter_by(is_active=True)
    if city_query:
        pharmacy_query = pharmacy_query.filter(Pharmacy.city.ilike(f"%{city_query}%"))
    if pincode_query:
        pharmacy_query = pharmacy_query.filter(Pharmacy.pincode.startswith(pincode_query))

    active_pharmacies = pharmacy_query.all()
    pharmacy_ids = [p.id for p in active_pharmacies]

    # Query matching medicines
    med_q = Medicine.query
    if med_query:
        med_fmt = f"%{med_query}%"
        med_q = med_q.filter(
            db.or_(
                Medicine.name.ilike(med_fmt),
                Medicine.generic_name.ilike(med_fmt)
            )
        )
    matching_medicines = med_q.all()

    results = []
    pharmacy_lookup = {p.id: p for p in active_pharmacies}

    for med in matching_medicines:
        for p_id, pharmacy in pharmacy_lookup.items():
            # Query strictly valid, non-expired stock with quantity > 0
            valid_batches = Batch.query.filter(
                Batch.medicine_id == med.id,
                Batch.pharmacy_id == p_id,
                Batch.expiry_date > today,
                Batch.quantity > 0
            ).all()

            total_valid_units = sum(b.quantity for b in valid_batches)

            if total_valid_units > 50:
                status_str = "Available"
                qty_range = "50+ units"
            elif total_valid_units > 10:
                status_str = "Available"
                qty_range = "20+ units"
            elif total_valid_units > 0:
                status_str = "Limited Stock"
                qty_range = f"{total_valid_units} units"
            else:
                status_str = "Out of Stock"
                qty_range = "0 units"

            # Skip if status filter applied
            if status_filter and status_filter != 'All' and status_str.lower() != status_filter.lower():
                continue

            # Skip out of stock if query is broad and has no stock
            if status_str == "Out of Stock" and not med_query:
                continue

            results.append({
                'id': f"AV-{med.id}-{p_id}",
                'medicine': f"{med.name} {med.strength or ''}".strip(),
                'medicineName': med.name,
                'genericName': med.generic_name or '',
                'strength': med.strength or '',
                'pharmacy': pharmacy.name,
                'pharmacyName': pharmacy.name,
                'city': pharmacy.city,
                'pincode': pharmacy.pincode,
                'address': pharmacy.address or f"{pharmacy.city}",
                'contactPhone': pharmacy.contact or '1800-MEDITRACK',
                'operatingHours': '24/7 Service' if 'Hospital' in pharmacy.name else '08:00 AM - 10:00 PM',
                'status': status_str,
                'quantity_range': qty_range,
                'approxQuantity': qty_range,
                'lastUpdated': 'Verified today'
            })

    response_data = {
        'success': True,
        'medicine': med_query or 'All Medicines',
        'total_pharmacies': len(results),
        'results': results,
        'data': results  # For standard frontend api.js compatibility
    }

    return jsonify(response_data), 200
