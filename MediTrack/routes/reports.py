"""
MediTrack - Reports & Analytics Routes
Delivers Pandas-aggregated audits: stock valuation, expiry loss exposures, consumption velocity, and demand forecasting.
"""

from datetime import datetime, date, timedelta
from flask import Blueprint, request
from extensions import db
from models.batch import Batch
from models.medicine import Medicine
from models.transaction import StockTransaction
from services.analytics_service import AnalyticsService
from routes.auth import api_response

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/stock', methods=['GET'])
def get_stock_report():
    """Stock valuation, total units, and category allocation report"""
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    category = request.args.get('category', 'All')

    metrics = AnalyticsService.get_stock_metrics(pharmacy_id, category)
    return api_response(True, "Stock report generated successfully.", data=metrics)


@reports_bp.route('/expiry', methods=['GET'])
def get_expiry_report():
    """
    Expiry audit report: Expired batches, Near Expiry lots, and estimated value exposure.
    Query params: pharmacy_id, days (default 30)
    """
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    days_window = request.args.get('days', 30, type=int)
    today = date.today()

    query = Batch.query
    if pharmacy_id:
        query = query.filter_by(pharmacy_id=pharmacy_id)

    batches = query.all()

    expired_lots = []
    near_expiry_lots = []
    total_expired_loss = 0.0
    total_near_expiry_risk = 0.0

    for b in batches:
        days = (b.expiry_date - today).days
        val = b.quantity * b.purchase_price

        if days < 0 and b.quantity > 0:
            total_expired_loss += val
            expired_lots.append({
                **b.to_dict(),
                'loss_value': round(val, 2)
            })
        elif 0 <= days <= days_window and b.quantity > 0:
            total_near_expiry_risk += val
            near_expiry_lots.append({
                **b.to_dict(),
                'risk_value': round(val, 2)
            })

    return api_response(True, "Expiry report generated.", data={
        'expired_loss_valuation': round(total_expired_loss, 2),
        'near_expiry_risk_valuation': round(total_near_expiry_risk, 2),
        'expired_lots_count': len(expired_lots),
        'near_expiry_lots_count': len(near_expiry_lots),
        'expired_batches': expired_lots,
        'near_expiry_batches': near_expiry_lots
    })


@reports_bp.route('/consumption', methods=['GET'])
def get_consumption_report():
    """
    Historical drug class consumption velocity and frequently dispensed medications.
    Query params: pharmacy_id, days_back (default 90)
    """
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    days_back = request.args.get('days_back', 90, type=int)

    analysis = AnalyticsService.get_consumption_analysis(pharmacy_id, days_back)
    return api_response(True, "Consumption analytics computed.", data=analysis)


@reports_bp.route('/transactions', methods=['GET'])
def get_transaction_report():
    """Detailed transaction audit trail with date range and operation type filters"""
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    txn_type = request.args.get('type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = StockTransaction.query
    if pharmacy_id:
        query = query.filter_by(pharmacy_id=pharmacy_id)
    if txn_type and txn_type != 'All':
        query = query.filter_by(transaction_type=txn_type.upper())
    if start_date:
        query = query.filter(StockTransaction.created_at >= datetime.strptime(start_date, '%Y-%m-%d'))
    if end_date:
        query = query.filter(StockTransaction.created_at <= datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1))

    txns = query.order_by(StockTransaction.created_at.desc()).all()
    return api_response(True, "Transaction report generated.", data=[t.to_dict() for t in txns])


@reports_bp.route('/forecast/<int:medicine_id>', methods=['GET'])
def get_medicine_forecast(medicine_id):
    """Statistical demand forecast using Scikit-Learn linear projection"""
    pharmacy_id = request.args.get('pharmacy_id', type=int)
    future_days = request.args.get('days', 30, type=int)

    forecast = AnalyticsService.forecast_medicine_demand(medicine_id, pharmacy_id, future_days)
    return api_response(True, "Demand forecast generated.", data=forecast)
