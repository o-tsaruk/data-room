"""Flask application factory and main entry point."""
import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from config import config
from models import db

migrate = Migrate()
app = Flask(__name__)

config_name = os.environ.get('FLASK_ENV', 'development')
if config_name not in config:
    config_name = 'development'
app.config.from_object(config[config_name])

db.init_app(app)
migrate.init_app(app, db)
CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)


@app.route('/health')
def health():
    return {'status': 'ok'}, 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

