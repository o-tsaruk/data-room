export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface File {
  id: string;
  userId?: string;
  name: string;
  url: string;
  iconUrl: string;
  lastEditedDate: string;
  mimeType: string;
  starred?: boolean;
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentFolderId?: string | null;
  createdAt?: string;
}
