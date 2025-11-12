"""Helper functions for API routes."""
from flask import request, jsonify


def get_user_email():
    """Get user email from request headers.
    
    Returns:
        str: User email if present, None otherwise
    """
    return request.headers.get('X-User-Email')


def require_auth():
    """Require authentication and return user email.
    
    Returns:
        tuple: (email, None) if authenticated, (None, error_response) if not
    """
    email = get_user_email()
    if not email:
        return None, (jsonify({'error': 'Not authenticated'}), 401)
    return email, None

