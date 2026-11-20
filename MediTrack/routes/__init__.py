"""
MediTrack - Routes Package
Registers all modular Blueprints onto the Flask application.
"""

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from models.transaction import StockTransaction
from routes.medicines import medicines_bp
from routes.batches import batches_bp
from routes.inventory import inventory_bp
from routes.availability import availability_bp
from routes.alerts import alerts_bp
from routes.reports import reports_bp
from routes.users import users_bp
from routes.auth import api_response

def register_routes(app):
    """Register all Blueprints and frontend convenience aliases"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(medicines_bp)
    app.register_blueprint(batches_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(availability_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(users_bp)

    # Convenience aliases for frontend api.js direct compatibility
    @app.route('/api/transactions', methods=['GET'])
    def alias_get_transactions():
        from routes.inventory import get_transactions
        return get_transactions()

    @app.route('/api/transactions', methods=['POST'])
    def alias_post_transactions():
        from flask import request
        payload = request.get_json(silent=True) or {}
        txn_type = payload.get('type', 'RECEIVE').upper()
        if txn_type == 'DISPENSE':
            from routes.inventory import dispense_stock
            return dispense_stock()
        elif txn_type == 'ADJUSTMENT':
            from routes.inventory import adjust_stock
            return adjust_stock()
        else:
            from routes.inventory import receive_stock
            return receive_stock()

    @app.route('/api/settings', methods=['GET', 'POST'])
    def settings_endpoint():
        """Retrieve and update clinical settings thresholds"""
        from flask import request, current_app
        if request.method == 'GET':
            return api_response(True, "Settings retrieved.", data={
                'thresholds': {
                    'nearExpiryDays': current_app.config.get('NEAR_EXPIRY_DAYS', 30),
                    'upcomingExpiryDays': current_app.config.get('UPCOMING_EXPIRY_DAYS', 90),
                    'lowStockDefault': 100,
                    'criticalPercentage': 20
                },
                'profile': {
                    'name': "Dr. Rajesh Sharma",
                    'email': "dr.sharma@meditrack.org",
                    'phone': "+91 98200 12345",
                    'licenseNumber': "MH-PH-2018-98441",
                    'pharmacy': "Central Hospital Pharmacy, Mumbai"
                }
            })
        else:
            payload = request.get_json(silent=True) or {}
            thresh = payload.get('thresholds', {})
            if 'nearExpiryDays' in thresh:
                current_app.config['NEAR_EXPIRY_DAYS'] = int(thresh['nearExpiryDays'])
            if 'upcomingExpiryDays' in thresh:
                current_app.config['UPCOMING_EXPIRY_DAYS'] = int(thresh['upcomingExpiryDays'])
            return api_response(True, "Settings updated successfully.", data=payload)
