"""Flask application factory and main entry point."""
import os
from flask import Flask, request
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

print(f"CORS_ORIGINS configured: {app.config['CORS_ORIGINS']}")

CORS(
    app,
    origins=app.config['CORS_ORIGINS'],
    supports_credentials=True,
    methods=['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Content-Type', 'Authorization', 'X-User-Email', 'x-user-email'],
    expose_headers=['Content-Type'],
    max_age=3600
)

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin and origin in app.config['CORS_ORIGINS']:
        response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-Email,x-user-email')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '3600')
    return response

# Register API blueprint
app.register_blueprint(api_bp)


@app.route('/health')
def health():
    return {'status': 'ok'}, 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

