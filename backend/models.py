"""SQLAlchemy models for Alembic migrations."""
from datetime import datetime
from uuid import uuid4
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

db = SQLAlchemy()


class User(db.Model):
    """User model."""
    __tablename__ = 'users'
    
    email = Column(Text, primary_key=True, nullable=False)
    name = Column(Text, nullable=True)
    image = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    folders = relationship('Folder', back_populates='user', cascade='all, delete-orphan')
    files = relationship('File', back_populates='user', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'email': self.email,
            'name': self.name,
            'image': self.image,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Folder(db.Model):
    """Folder model."""
    __tablename__ = 'folders'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, nullable=False)
    user_email = Column(Text, ForeignKey('users.email', ondelete='CASCADE'), nullable=True)
    name = Column(Text, nullable=False)
    parent_folder_id = Column(UUID(as_uuid=True), ForeignKey('folders.id', ondelete='CASCADE'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship('User', back_populates='folders')
    parent_folder = relationship('Folder', remote_side=[id], backref='child_folders')
    files = relationship('File', back_populates='folder', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': str(self.id),
            'user_email': self.user_email,
            'name': self.name,
            'parent_folder_id': str(self.parent_folder_id) if self.parent_folder_id else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
    
    def to_camel_dict(self):
        """Convert model to dictionary with camelCase keys."""
        return {
            'id': str(self.id),
            'name': self.name,
            'parentFolderId': str(self.parent_folder_id) if self.parent_folder_id else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }


class File(db.Model):
    """File model."""
    __tablename__ = 'files'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, nullable=False)
    user_email = Column(Text, ForeignKey('users.email', ondelete='CASCADE'), nullable=True)
    name = Column(Text, nullable=False)
    url = Column(Text, nullable=False)
    icon_url = Column(Text, nullable=True)
    mime_type = Column(Text, nullable=True)
    starred = Column(Boolean, default=False, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_interacted = Column(DateTime, default=datetime.utcnow, nullable=False)
    folder_id = Column(UUID(as_uuid=True), ForeignKey('folders.id'), nullable=True)
    
    # Relationships
    user = relationship('User', back_populates='files')
    folder = relationship('Folder', back_populates='files')
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': str(self.id),
            'user_email': self.user_email,
            'name': self.name,
            'url': self.url,
            'icon_url': self.icon_url,
            'mime_type': self.mime_type,
            'starred': self.starred,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'last_interacted': self.last_interacted.isoformat() if self.last_interacted else None,
            'folder_id': str(self.folder_id) if self.folder_id else None,
        }
    
    def to_camel_dict(self):
        """Convert model to dictionary with camelCase keys."""
        return {
            'id': str(self.id),
            'name': self.name,
            'url': self.url,
            'iconUrl': self.icon_url,
            'mimeType': self.mime_type,
            'starred': self.starred,
            'lastEditedDate': self.last_interacted.isoformat() if self.last_interacted else None,
            'uploadedAt': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'folderId': str(self.folder_id) if self.folder_id else None,
        }

