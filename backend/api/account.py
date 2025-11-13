"""Account API routes."""
from flask import jsonify, request
from supabase_client import get_supabase
from .helpers import require_auth
from . import api_bp


@api_bp.route('/account', methods=['DELETE'])
def delete_account():
    """Delete user account."""
    email, error = require_auth()
    if error:
        return error
    
    try:
        supabase = get_supabase()
        response = supabase.table('users').delete().eq('email', email).execute()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f'Error deleting account: {e}')
        return jsonify({'error': str(e)}), 500

