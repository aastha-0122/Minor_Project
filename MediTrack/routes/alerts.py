"""
MediTrack - Alert Routes
Surveillance of EXPIRED, NEAR_EXPIRY, LOW_STOCK, and OUT_OF_STOCK clinical notifications.
"""

from flask import Blueprint, request
from extensions import db
from models.alert import Alert
from services.expiry_service import ExpiryService
from routes.auth import api_response

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')

def _parse_alert_id(id_val):
    if isinstance(id_val, str) and id_val.upper().startswith('ALT-'):
        try:
            return int(id_val.split('-')[1])
        except (IndexError, ValueError):
            return None
    try:
        return int(id_val)
    except (ValueError, TypeError):
        return None


@alerts_bp.route('', methods=['GET'])
def get_alerts():
    """
    Retrieve clinical and stock alerts.
    Query params: pharmacy_id, type, status (Active/Resolved)
    """
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    alert_type = request.args.get('type', '').strip().upper()
    status_filter = request.args.get('status', '').strip()

    query = Alert.query

    if pharmacy_id:
        query = query.filter_by(pharmacy_id=pharmacy_id)

    if alert_type and alert_type != 'ALL':
        query = query.filter_by(alert_type=alert_type)

    if status_filter:
        if status_filter.lower() == 'active':
            query = query.filter_by(is_read=False)
        elif status_filter.lower() == 'resolved':
            query = query.filter_by(is_read=True)

    alerts = query.order_by(Alert.is_read.asc(), Alert.created_at.desc()).all()
    return api_response(True, "Alerts retrieved.", data=[a.to_dict() for a in alerts])


@alerts_bp.route('/<alert_id>', methods=['PATCH', 'PUT'])
def update_alert(alert_id):
    """
    Acknowledge or resolve an alert.
    Body: {"status": "Acknowledged" | "Resolved", "is_read": true}
    """
    pk = _parse_alert_id(alert_id)
    if not pk:
        return api_response(False, "Invalid alert ID.", error_code="INVALID_ID", status_code=400)

    alert = db.session.get(Alert, pk)
    if not alert:
        return api_response(False, "Alert not found.", error_code="NOT_FOUND", status_code=404)

    payload = request.get_json(silent=True) or {}
    new_status = payload.get('status', '')
    is_read = payload.get('is_read', False)

    if new_status.lower() in ('resolved', 'acknowledged') or is_read:
        alert.is_read = True

    db.session.commit()
    return api_response(True, f"Alert {alert.id} status updated.", data=alert.to_dict())


@alerts_bp.route('/scan', methods=['POST'])
def trigger_expiry_scan():
    """Manually initiate an inventory expiry surveillance scan across all pharmacies"""
    count = ExpiryService.scan_and_generate_alerts()
    return api_response(True, f"Expiry scan completed. {count} new alert(s) generated.", data={'new_alerts_count': count})
