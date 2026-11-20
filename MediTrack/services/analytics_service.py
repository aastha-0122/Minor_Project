"""
MediTrack - Analytics & Demand Intelligence Service
Leverages Pandas for aggregation, velocity analysis, stock run-rate coverage, and Scikit-learn trend forecasting.
"""

from datetime import datetime, date, timedelta
import pandas as pd
import numpy as np
from extensions import db
from models.medicine import Medicine
from models.batch import Batch
from models.transaction import StockTransaction

class AnalyticsService:
    @staticmethod
    def get_stock_summary_dataframe(pharmacy_id=None, category=None):
        """Builds a Pandas DataFrame of current inventory valuation and stock levels"""
        query = Batch.query
        if pharmacy_id:
            query = query.filter_by(pharmacy_id=pharmacy_id)
        
        batches = query.all()
        if not batches:
            return pd.DataFrame()

        records = []
        for b in batches:
            records.append({
                'batch_id': b.id,
                'batch_number': b.batch_number,
                'medicine_id': b.medicine_id,
                'medicine_name': b.medicine.name if b.medicine else 'Unknown',
                'category': b.medicine.category if b.medicine else 'General',
                'quantity': b.quantity,
                'purchase_price': b.purchase_price,
                'total_valuation': b.quantity * b.purchase_price,
                'expiry_date': b.expiry_date,
                'days_remaining': b.days_remaining,
                'is_expired': b.is_expired,
                'pharmacy_id': b.pharmacy_id
            })

        df = pd.DataFrame(records)
        if category and category != 'All' and not df.empty:
            df = df[df['category'] == category]
        return df

    @classmethod
    def get_stock_metrics(cls, pharmacy_id=None, category=None):
        df = cls.get_stock_summary_dataframe(pharmacy_id, category)
        if df.empty:
            return {
                'total_valuation': 0.0,
                'total_units': 0,
                'valid_units': 0,
                'expired_units': 0,
                'expired_loss_valuation': 0.0,
                'category_breakdown': {}
            }

        valid_df = df[~df['is_expired']]
        expired_df = df[df['is_expired']]

        cat_breakdown = df.groupby('category')['quantity'].sum().to_dict()

        return {
            'total_valuation': float(df['total_valuation'].sum()),
            'total_units': int(df['quantity'].sum()),
            'valid_units': int(valid_df['quantity'].sum()) if not valid_df.empty else 0,
            'expired_units': int(expired_df['quantity'].sum()) if not expired_df.empty else 0,
            'expired_loss_valuation': float(expired_df['total_valuation'].sum()) if not expired_df.empty else 0.0,
            'category_breakdown': cat_breakdown
        }

    @staticmethod
    def get_consumption_analysis(pharmacy_id=None, days_back=90):
        """
        Analyzes historical DISPENSE transactions to calculate:
        - Daily and monthly consumption velocity
        - Stock coverage days
        - Top dispensed medicines
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        query = StockTransaction.query.filter(
            StockTransaction.transaction_type == 'DISPENSE',
            StockTransaction.created_at >= cutoff_date
        )
        if pharmacy_id:
            query = query.filter_by(pharmacy_id=pharmacy_id)

        txns = query.all()
        if not txns:
            return {
                'total_dispensed_units': 0,
                'average_daily_consumption': 0.0,
                'frequently_dispensed': [],
                'demand_trends': []
            }

        records = []
        for t in txns:
            med_id = t.batch.medicine_id if t.batch else None
            med_name = t.batch.medicine.name if (t.batch and t.batch.medicine) else 'Unknown'
            records.append({
                'date': t.created_at.date(),
                'medicine_id': med_id,
                'medicine_name': med_name,
                'quantity': abs(t.quantity)
            })

        df = pd.DataFrame(records)
        total_dispensed = int(df['quantity'].sum())
        avg_daily = float(df.groupby('date')['quantity'].sum().mean()) if not df.empty else 0.0

        # Frequently dispensed medicines
        top_meds = df.groupby(['medicine_id', 'medicine_name'])['quantity'].sum().reset_index()
        top_meds = top_meds.sort_values(by='quantity', ascending=False).head(8)
        frequently_dispensed = [
            {'medicine_name': row['medicine_name'], 'units_dispensed': int(row['quantity'])}
            for _, row in top_meds.iterrows()
        ]

        return {
            'total_dispensed_units': total_dispensed,
            'average_daily_consumption': round(avg_daily, 2),
            'frequently_dispensed': frequently_dispensed,
            'analyzed_period_days': days_back
        }

    @staticmethod
    def forecast_medicine_demand(medicine_id, pharmacy_id=None, future_days=30):
        """
        Generates a 30-day consumption forecast using Scikit-Learn linear regression.
        Explicitly flagged as an estimate based on trend extrapolation.
        """
        cutoff = datetime.utcnow() - timedelta(days=90)
        query = StockTransaction.query.filter(
            StockTransaction.transaction_type == 'DISPENSE',
            StockTransaction.created_at >= cutoff
        )
        if pharmacy_id:
            query = query.filter_by(pharmacy_id=pharmacy_id)

        txns = [t for t in query.all() if t.batch and t.batch.medicine_id == medicine_id]
        if len(txns) < 3:
            return {
                'forecast_available': False,
                'message': 'Insufficient historical dispense records for statistical model.'
            }

        records = [{'date': t.created_at.date(), 'qty': abs(t.quantity)} for t in txns]
        df = pd.DataFrame(records).groupby('date')['qty'].sum().reset_index()

        df['day_num'] = (pd.to_datetime(df['date']) - pd.to_datetime(df['date'].min())).dt.days

        X = df[['day_num']].values
        y = df['qty'].values

        try:
            from sklearn.linear_model import LinearRegression
            model = LinearRegression()
            model.fit(X, y)

            last_day = int(df['day_num'].max())
            future_X = np.array([[last_day + i] for i in range(1, future_days + 1)])
            predictions = model.predict(future_X)
            # Clip negative predictions to 0
            predicted_total = float(np.sum(np.clip(predictions, 0, None)))

            return {
                'forecast_available': True,
                'horizon_days': future_days,
                'estimated_demand_units': round(predicted_total, 1),
                'daily_average_projected': round(predicted_total / future_days, 2),
                'notice': 'Forecast is an estimate based on linear trend of historical dispensing.'
            }
        except Exception as e:
            return {
                'forecast_available': False,
                'error': str(e),
                'message': 'Statistical model calculation error.'
            }
