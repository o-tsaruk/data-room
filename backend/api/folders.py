"""Folders API routes."""
from flask import jsonify, request
from supabase_client import get_supabase
from .helpers import require_auth, get_user_email
from . import api_bp


def delete_folder_recursive(folder_id: str, email: str, supabase):
    """Recursively delete folder and its contents."""
    child_folders_response = supabase.table('folders').select('id').eq('parent_folder_id', folder_id).eq('user_email', email).execute()
    
    if child_folders_response.data:
        for child in child_folders_response.data:
            delete_folder_recursive(child['id'], email, supabase)
    
    supabase.table('files').delete().eq('folder_id', folder_id).eq('user_email', email).execute()
    supabase.table('folders').delete().eq('parent_folder_id', folder_id).eq('user_email', email).execute()
    supabase.table('folders').delete().eq('id', folder_id).eq('user_email', email).execute()


@api_bp.route('/folders', methods=['GET'])
def get_folders():
    """Get all folders for the authenticated user."""
    email = get_user_email()
    if not email:
        return jsonify({'folders': []}), 200
    
    try:
        supabase = get_supabase()
        folders_response = supabase.table('folders').select('*').eq('user_email', email).order('created_at', desc=False).execute()
        folders = folders_response.data if folders_response.data else []
        
        return jsonify({'folders': folders}), 200
    except Exception as e:
        print(f'Error fetching folders: {e}')
        return jsonify({'folders': []}), 200


@api_bp.route('/folders', methods=['POST'])
def create_folder():
    """Create a new folder."""
    email, error = require_auth()
    if error:
        return error
    
    try:
        data = request.get_json()
        name = data.get('name')
        parent_folder_id = data.get('parent_folder_id')
        
        if not name:
            return jsonify({'error': 'Folder name is required'}), 400
        
        name = name.strip()
        
        if len(name) > 30:
            return jsonify({'error': 'Folder name must be 30 characters or less'}), 400
        
        supabase = get_supabase()
        
        # Validate parent folder if provided
        valid_parent_folder_id = None
        if parent_folder_id:
            parent_response = supabase.table('folders').select('id').eq('id', parent_folder_id).eq('user_email', email).execute()
            if parent_response.data and len(parent_response.data) > 0:
                valid_parent_folder_id = parent_folder_id
            else:
                print(f'Parent folder {parent_folder_id} not found for user {email}, creating folder in root')
        
        folder_response = supabase.table('folders').insert({
            'user_email': email,
            'name': name,
            'parent_folder_id': valid_parent_folder_id,
        }).execute()
        
        if folder_response.data and len(folder_response.data) > 0:
            return jsonify({'folder': folder_response.data[0]}), 200
        else:
            return jsonify({'error': 'Failed to create folder'}), 500
    except Exception as e:
        print(f'Error creating folder: {e}')
        return jsonify({'error': str(e)}), 500


@api_bp.route('/folders', methods=['PATCH'])
def update_folder():
    """Update folder (rename)."""
    email, error = require_auth()
    if error:
        return error
    
    try:
        data = request.get_json()
        folder_id = data.get('folderId')
        name = data.get('name')
        
        if not folder_id or not name:
            return jsonify({'error': 'Folder ID and name are required'}), 400
        
        name = name.strip()
        
        if len(name) > 30:
            return jsonify({'error': 'Folder name must be 30 characters or less'}), 400
        
        supabase = get_supabase()
        
        folder_response = supabase.table('folders').select('parent_folder_id').eq('id', folder_id).eq('user_email', email).execute()
        
        if not folder_response.data or len(folder_response.data) == 0:
            return jsonify({'error': 'Folder not found'}), 404
        
        folder_data = folder_response.data[0]
        parent_folder_id = folder_data.get('parent_folder_id')
        
        # Check for duplicate name in the same parent folder (excluding current folder)
        collision_query = supabase.table('folders').select('id').eq('user_email', email).eq('name', name)
        
        # Handle NULL parent_folder_id comparison correctly
        if parent_folder_id is None:
            collision_query = collision_query.is_('parent_folder_id', 'null')
        else:
            collision_query = collision_query.eq('parent_folder_id', parent_folder_id)
        
        collision_query = collision_query.neq('id', folder_id)
        collision_response = collision_query.execute()
        
        if collision_response.data and len(collision_response.data) > 0:
            return jsonify({'error': 'A folder with this name already exists in this location'}), 409
        
        supabase.table('folders').update({'name': name}).eq('id', folder_id).eq('user_email', email).execute()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f'Error renaming folder: {e}')
        return jsonify({'error': str(e)}), 500


@api_bp.route('/folders', methods=['DELETE'])
def delete_folder():
    """Delete a folder and its contents."""
    email, error = require_auth()
    if error:
        return error
    
    try:
        folder_id = request.args.get('folderId')
        if not folder_id:
            return jsonify({'error': 'Folder ID is required'}), 400
        
        supabase = get_supabase()
        delete_folder_recursive(folder_id, email, supabase)
        
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f'Error deleting folder: {e}')
        return jsonify({'error': str(e)}), 500

