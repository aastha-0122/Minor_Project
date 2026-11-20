"""
MediTrack - Dashboard Metrics Route
Computes aggregate KPI metrics, valid stock counts, expiry horizons, and feeds.
"""

from datetime import date
from flask import Blueprint, request
from extensions import db
from models.medicine import Medicine
from models.batch import Batch
from models.transaction import StockTransaction
from models.alert import Alert
from routes.auth import api_response

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('', methods=['GET'])
@dashboard_bp.route('/stats', methods=['GET'])
def get_dashboard_data():
    """
    Returns clinical dashboard metrics:
    - total medicines
    - total valid stock
    - low-stock count
    - near-expiry count
    - expired count
    - out-of-stock count
    - recent transactions
    - recent alerts
    """
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    today = date.today()

    # Query Medicines
    medicines = Medicine.query.all()
    total_medicines = len(medicines)

    # Batches query
    batches_q = Batch.query
    if pharmacy_id:
        batches_q = batches_q.filter_by(pharmacy_id=pharmacy_id)
    all_batches = batches_q.all()

    # Calculate stock metrics
    total_valid_stock = sum(b.quantity for b in all_batches if b.expiry_date > today and b.quantity > 0)
    total_all_stock = sum(b.quantity for b in all_batches)
    
    near_expiry_count = sum(1 for b in all_batches if 0 <= (b.expiry_date - today).days <= 30 and b.quantity > 0)
    expired_count = sum(1 for b in all_batches if (b.expiry_date - today).days < 0 and b.quantity > 0)

    # Low stock & Out of stock counts (evaluated per medicine against valid stock)
    low_stock_count = 0
    out_of_stock_count = 0

    for m in medicines:
        m_valid_stock = m.get_valid_stock(pharmacy_id)
        if m_valid_stock == 0:
            out_of_stock_count += 1
        elif m_valid_stock <= m.minimum_stock:
            low_stock_count += 1

    # Recent Transactions (Last 5)
    txn_q = StockTransaction.query.order_by(StockTransaction.created_at.desc())
    if pharmacy_id:
        txn_q = txn_q.filter_by(pharmacy_id=pharmacy_id)
    recent_txns = [t.to_dict() for t in txn_q.limit(5).all()]

    # Recent Alerts (Last 5 Active)
    alert_q = Alert.query.filter_by(is_read=False).order_by(Alert.created_at.desc())
    if pharmacy_id:
        alert_q = alert_q.filter_by(pharmacy_id=pharmacy_id)
    recent_alerts = [a.to_dict() for a in alert_q.limit(5).all()]

    # Recently added medicines (Last 4)
    recent_medicines = [m.to_dict(pharmacy_id) for m in Medicine.query.order_by(Medicine.created_at.desc()).limit(4).all()]

    data = {
        'metrics': {
            'totalMedicines': total_medicines,
            'totalValidStock': total_valid_stock,
            'totalStock': total_all_stock,
            'lowStock': low_stock_count,
            'nearExpiry': near_expiry_count,
            'expired': expired_count,
            'outOfStock': out_of_stock_count
        },
        'recentAlerts': recent_alerts,
        'recentTransactions': recent_txns,
        'recentlyAddedMedicines': recent_medicines
    }

    return api_response(True, "Dashboard metrics retrieved successfully.", data=data)
