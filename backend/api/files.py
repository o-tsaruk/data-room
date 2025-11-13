"""Files API routes."""
from flask import jsonify, request
from supabase_client import get_supabase
from .helpers import require_auth, get_user_email
from . import api_bp


@api_bp.route('/files', methods=['GET'])
def get_files():
    """Get files and folders for the authenticated user."""
    email = get_user_email()
    if not email:
        return jsonify({'files': [], 'folders': []}), 200
    
    try:
        supabase = get_supabase()
        folder_id = request.args.get('folderId')
        starred = request.args.get('starred') == 'true'
        search = request.args.get('search')
        
        # Build files query
        files_query = supabase.table('files').select('*').eq('user_email', email)
        
        if search and search.strip():
            files_query = files_query.ilike('name', f'%{search.strip()}%')
        elif starred:
            files_query = files_query.eq('starred', True)
        elif folder_id is None or folder_id == '':
            files_query = files_query.is_('folder_id', None)
        elif folder_id:
            files_query = files_query.eq('folder_id', folder_id)
        
        files_response = files_query.order('uploaded_at', desc=True).execute()
        files = files_response.data if files_response.data else []
        
        # Get folders if not starred view
        folders = []
        if not starred:
            folders_query = supabase.table('folders').select('*').eq('user_email', email)
            
            if folder_id is None or folder_id == '':
                folders_query = folders_query.is_('parent_folder_id', None)
            elif folder_id:
                folders_query = folders_query.eq('parent_folder_id', folder_id)
            
            folders_response = folders_query.order('created_at', desc=False).execute()
            folders = folders_response.data if folders_response.data else []
        
        # Convert snake_case to camelCase
        camel_files = [
            {
                'id': f['id'],
                'name': f['name'],
                'url': f['url'],
                'iconUrl': f.get('icon_url'),
                'mimeType': f.get('mime_type'),
                'starred': f.get('starred', False),
                'lastEditedDate': f.get('last_edited'),
                'uploadedAt': f.get('uploaded_at'),
                'folderId': f.get('folder_id'),
            }
            for f in files
        ]
        
        camel_folders = [
            {
                'id': f['id'],
                'name': f['name'],
                'parentFolderId': f.get('parent_folder_id'),
                'createdAt': f.get('created_at'),
            }
            for f in folders
        ]
        
        return jsonify({'files': camel_files, 'folders': camel_folders}), 200
    except Exception as e:
        print(f'Error fetching files: {e}')
        return jsonify({'files': [], 'folders': []}), 200


@api_bp.route('/files', methods=['POST'])
def create_files():
    """Create new file records."""
    email, error = require_auth()
    if error:
        return error
    
    try:
        data = request.get_json()
        files = data.get('files', [])
        folder_id = data.get('folderId')
        
        supabase = get_supabase()
        
        # Validate folder if provided
        valid_folder_id = None
        if folder_id:
            folder_response = supabase.table('folders').select('id').eq('id', folder_id).eq('user_email', email).execute()
            if folder_response.data and len(folder_response.data) > 0:
                valid_folder_id = folder_id
            else:
                print(f'Folder {folder_id} not found for user {email}, saving files to root folder')
        
        # Prepare files for insertion
        new_files = [
            {
                'user_email': email,
                'name': f['name'],
                'url': f['url'],
                'icon_url': f.get('iconUrl'),
                'mime_type': f.get('mimeType'),
                'folder_id': valid_folder_id,
            }
            for f in files
        ]
        
        if not new_files:
            return jsonify({'success': True}), 200
        
        supabase.table('files').insert(new_files).execute()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f'Error saving files: {e}')
        return jsonify({'error': str(e)}), 500


@api_bp.route('/files', methods=['PATCH'])
def update_file():
    """Update file (rename)."""
    email, error = require_auth()
    if error:
        return error
    
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        name = data.get('name')
        
        if not file_id or not name:
            return jsonify({'error': 'File ID and name are required'}), 400
        
        supabase = get_supabase()
        
        # Get file to check folder and mime_type
        file_response = supabase.table('files').select('folder_id, mime_type').eq('id', file_id).eq('user_email', email).execute()
        
        if not file_response.data or len(file_response.data) == 0:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = file_response.data[0]
        folder_id = file_data.get('folder_id')
        mime_type = file_data.get('mime_type')
        
        # Check for name collision
        collision_query = supabase.table('files').select('id').eq('user_email', email).eq('name', name.strip()).eq('mime_type', mime_type).neq('id', file_id)
        
        if folder_id is None:
            collision_query = collision_query.is_('folder_id', None)
        else:
            collision_query = collision_query.eq('folder_id', folder_id)
        
        collision_response = collision_query.execute()
        
        if collision_response.data and len(collision_response.data) > 0:
            return jsonify({'error': 'A file with this name and type already exists in this folder'}), 409
        
        # Update file name
        supabase.table('files').update({'name': name.strip()}).eq('id', file_id).eq('user_email', email).execute()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f'Error renaming file: {e}')
        return jsonify({'error': str(e)}), 500


@api_bp.route('/files', methods=['DELETE'])
def delete_file():
    """Delete file(s)."""
    email, error = require_auth()
    if error:
        return error
    
    try:
        file_id = request.args.get('fileId')
        delete_all = request.args.get('all') == 'true'
        
        supabase = get_supabase()
        
        if delete_all:
            # Delete all files
            supabase.table('files').delete().eq('user_email', email).execute()
            # Delete all folders
            supabase.table('folders').delete().eq('user_email', email).execute()
        else:
            if not file_id:
                return jsonify({'error': 'Missing file ID'}), 400
            supabase.table('files').delete().eq('id', file_id).eq('user_email', email).execute()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f'Error deleting file: {e}')
        return jsonify({'error': str(e)}), 500


@api_bp.route('/files/starred', methods=['PATCH'])
def update_starred():
    """Update file starred status."""
    email, error = require_auth()
    if error:
        return error
    
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        starred = data.get('starred')
        
        if not file_id or not isinstance(starred, bool):
            return jsonify({'error': 'Missing payload'}), 400
        
        supabase = get_supabase()
        supabase.table('files').update({'starred': starred}).eq('id', file_id).eq('user_email', email).execute()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f'Error updating starred: {e}')
        return jsonify({'error': str(e)}), 500

