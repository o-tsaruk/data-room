"""Flask application factory and main entry point."""
import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from config import config
from models import db
from api import api_bp

migrate = Migrate()
app = Flask(__name__)

# Use default development config
app.config.from_object(config['default'])

db.init_app(app)
migrate.init_app(app, db)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-User-Email", "x-user-email"],
            "expose_headers": ["Content-Type"],
            "supports_credentials": True,
            "max_age": 3600
        },
        r"/*": {
            "origins": app.config['CORS_ORIGINS'],
            "supports_credentials": True
        }
    }
)

# Register API blueprint
app.register_blueprint(api_bp)


@app.route('/health')
def health():
    return {'status': 'ok'}, 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

