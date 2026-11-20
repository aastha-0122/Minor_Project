"""
MediTrack - Flask Extensions Registry
Centralized instantiation of SQLAlchemy, LoginManager, CORS, and BackgroundScheduler.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

db = SQLAlchemy()
login_manager = LoginManager()
cors = CORS()
scheduler = BackgroundScheduler()
