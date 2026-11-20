"""
MediTrack – Smart Medicine Availability and Expiry Tracking System
Main Flask Application Factory & Server Entry Point
"""

import os
from flask import Flask, jsonify
from extensions import db, login_manager, cors, scheduler
from config import config_by_name
from models.user import User
from routes import register_routes
from services.expiry_service import ExpiryService

def create_app(config_name=None):
    """Application factory pattern"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name['default']))

    # Initialize Extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = "Please sign in to access this healthcare workspace."

    # Setup CORS: allow frontend origins configured in .env or * during dev
    allowed_origins = app.config.get('CORS_ORIGINS', '*')
    cors.init_app(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    # User loader callback for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        try:
            return User.query.get(int(user_id))
        except (ValueError, TypeError):
            return None

    # Register Blueprints & Route Handlers
    register_routes(app)

    # Standard JSON Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'message': str(error.description if hasattr(error, 'description') else 'Bad Request'),
            'error_code': 'BAD_REQUEST'
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'message': 'Requested API endpoint or resource was not found.',
            'error_code': 'NOT_FOUND'
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'success': False,
            'message': 'HTTP method not allowed on this route.',
            'error_code': 'METHOD_NOT_ALLOWED'
        }), 405

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'success': False,
            'message': 'Internal clinical server error. Please consult system logs.',
            'error_code': 'INTERNAL_SERVER_ERROR'
        }), 500

    # Root Health Check
    @app.route('/', methods=['GET'])
    def root_status():
        return jsonify({
            'system': 'MediTrack - Smart Medicine Availability and Expiry Tracking System',
            'version': '2.0.0',
            'status': 'OPERATIONAL',
            'api_base': '/api',
            'endpoints': [
                '/api/auth/login',
                '/api/dashboard',
                '/api/medicines',
                '/api/batches',
                '/api/inventory/receive',
                '/api/inventory/dispense',
                '/api/inventory/transactions',
                '/api/availability',
                '/api/alerts',
                '/api/reports/stock',
                '/api/users'
            ]
        })

    # Initialize APScheduler for daily expiry monitoring
    if app.config.get('ENABLE_SCHEDULER') and not app.config.get('TESTING'):
        if not scheduler.running:
            try:
                scheduler.add_job(
                    func=ExpiryService.scan_and_generate_alerts,
                    args=[app],
                    trigger="interval",
                    hours=24,
                    id="daily_expiry_scan",
                    replace_existing=True
                )
                scheduler.start()
            except Exception as e:
                print(f"[Scheduler Warning] Could not start APScheduler: {e}")

    return app


# Create default instance
app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Ensure database tables exist upon start
        db.create_all()
        print("Database schema verified.")

        # Check if seed data exists; if database is empty, automatically seed initial demo dataset
        from models.pharmacy import Pharmacy
        if Pharmacy.query.count() == 0:
            from database.seed_data import seed_database
            print("Empty database detected. Seeding initial healthcare data...")
            seed_database()

    print("\n" + "="*70)
    print(" MediTrack - Smart Medicine Availability & Expiry Tracking Server")
    print(" Running at: http://127.0.0.1:5000")
    print(" API Base:   http://127.0.0.1:5000/api")
    print("="*70 + "\n")

    app.run(host='127.0.0.1', port=5000, debug=True)
