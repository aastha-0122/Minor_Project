"""
MediTrack - Application Configuration
Supports environment variable overrides via python-dotenv.
"""

import os
from dotenv import load_dotenv

# Load .env file from project root if present
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base Configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'meditrack-healthcare-super-secret-key-2026')
    
    # Database URL: defaults to local SQLite file in database folder, can be overridden with MySQL via DATABASE_URL env var
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(BASE_DIR, 'database', 'meditrack.db').replace(os.sep, '/')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # Security & Session Settings
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS

    # CORS Origins (Frontend allowed hosts)
    CORS_ORIGINS = os.getenv(
        'CORS_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500'
    ).split(',')

    # Clinical Expiry Horizon & Alerts Thresholds (Days)
    NEAR_EXPIRY_DAYS = int(os.getenv('NEAR_EXPIRY_DAYS', 30))
    UPCOMING_EXPIRY_DAYS = int(os.getenv('UPCOMING_EXPIRY_DAYS', 90))

    # Scheduler Settings
    ENABLE_SCHEDULER = os.getenv('ENABLE_SCHEDULER', 'True').lower() in ('true', '1', 'yes')
    SCHEDULER_API_ENABLED = False

    # Mail Server Configuration
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', None)
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', None)


class DevelopmentConfig(Config):
    """Development Configuration"""
    DEBUG = True


class TestingConfig(Config):
    """Testing Configuration (Uses in-memory SQLite)"""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    ENABLE_SCHEDULER = False


class ProductionConfig(Config):
    """Production Configuration"""
    DEBUG = False
    SESSION_COOKIE_SECURE = True


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
