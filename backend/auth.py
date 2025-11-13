"""Authentication middleware for validating NextAuth JWT tokens."""
from functools import wraps
import jwt
from flask import request, jsonify, g
from config import Config


def get_token_from_request():
    """Extract JWT token from request headers or cookies."""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    token = request.cookies.get('next-auth.session-token') or request.cookies.get('__Secure-next-auth.session-token')
    return token if token else None


def verify_nextauth_token(token):
    """Verify NextAuth JWT token and return user info."""
    try:
        secret = Config.NEXTAUTH_SECRET
        if not secret:
            raise ValueError("NEXTAUTH_SECRET is not configured")
        decoded = jwt.decode(token, secret, algorithms=['HS256'], options={'verify_signature': True, 'verify_exp': True, 'verify_nbf': True})
        email = decoded.get('email') or decoded.get('sub')
        if not email:
            return None
        return {'email': email, 'name': decoded.get('name'), 'image': decoded.get('picture') or decoded.get('image'), 'token_data': decoded}
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None


def require_auth(f):
    """Decorator to require authentication for a route."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_request()
        if not token:
            return jsonify({'error': 'Not authenticated'}), 401
        user_info = verify_nextauth_token(token)
        if not user_info:
            return jsonify({'error': 'Invalid or expired token'}), 401
        g.user_email = user_info['email']
        g.user_name = user_info.get('name')
        g.user_image = user_info.get('image')
        return f(*args, **kwargs)
    return decorated_function


def get_current_user_email():
    """Get the current authenticated user's email from Flask's g object."""
    return getattr(g, 'user_email', None)

