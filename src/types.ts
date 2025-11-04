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
}
