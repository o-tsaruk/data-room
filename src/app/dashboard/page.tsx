'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DuplicateResolver from '@/src/components/DuplicateResolver';
import FileList from '@/src/components/FileList';
import Settings from '@/src/components/Settings';
import Sidebar from '@/src/components/Sidebar';
import { File } from '@/src/types';
import { formatTimestampUTC } from '@/src/utils/common';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export default function Home() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPickerReady, setIsPickerReady] = useState(false);
  const [isGisReady, setIsGisReady] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const tokenClientRef = useRef<any>(null);
  const [activeView, setActiveView] = useState<
    'files' | 'recent' | 'starred' | 'media' | 'settings'
  >('files');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [conflicts, setConflicts] = useState<File[] | null>(null);
  const [nonConflicting, setNonConflicting] = useState<File[]>([]);

  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly openid email profile';

  useEffect(() => {
    if (!API_KEY || !CLIENT_ID || !APP_ID) {
      console.error('Missing Google API credentials! Please check your .env.local file.');
    }

    if (window.gapi && window.google) {
      setIsPickerReady(true);
      setIsGisReady(true);
      initializeTokenClient();
      return;
    }

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      // Load both picker and client
      window.gapi.load('client:picker', async () => {
        await initializePicker();
      });
    };
    document.head.appendChild(gapiScript);

    // Load Google Identity Services library
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      initializeTokenClient();
    };
    document.head.appendChild(gisScript);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const key = window.location.hash.replace('#', '') as typeof activeView;
      if (['files', 'recent', 'starred', 'media', 'settings'].includes(key)) {
        setActiveView(key);
      } else {
        setActiveView('files');
      }
    };
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const res = await fetch('/api/session');
      if (!res.ok) return console.error('Failed to fetch session');
      const data = await res.json();
      setAccessToken(data.session?.token ?? null);
    };

    loadSession();
  }, []);

  useEffect(() => {
    fetchUserFilesFromDB()
      .then(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const fetchUserFilesFromDB = async () => {
    try {
      const res = await fetch('/api/files', { method: 'GET' });

      if (!res.ok) throw new Error('Failed to fetch files from DB');
      const data: { files: File[] } = await res.json();
      setSelectedFiles(data.files ?? []);
    } catch (err) {
      console.error('Error loading files from DB:', err);
    }
  };

  const initializePicker = async () => {
    try {
      await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
      setIsPickerReady(true);
    } catch (error) {
      console.error('Error initializing picker:', error);
    }
  };

  const initializeTokenClient = () => {
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '',
    });
    setIsGisReady(true);
  };

  const createPicker = (token: string | null) => {
    if (!window.google?.picker) {
      console.error('Google Picker API not loaded');
      return;
    }

    if (!token) {
      console.error('No access token available');
      return;
    }

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setOAuthToken(token)
      .addView(window.google.picker.ViewId.DOCS)
      .setCallback(pickerCallback)
      .build();

    picker.setVisible(true);
  };

  const pickerCallback = (data: any) => {
    if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
      const docs = data[window.google.picker.Response.DOCUMENTS];

      const files: File[] = docs.map((doc: any) => ({
        name: doc[window.google.picker.Document.NAME],
        id: doc[window.google.picker.Document.ID],
        url: doc[window.google.picker.Document.URL],
        iconUrl: doc[window.google.picker.Document.ICON_URL],
        lastEditedDate: formatTimestampUTC(doc[window.google.picker.Document.LAST_EDITED_UTC]),
        mimeType: doc[window.google.picker.Document.MIME_TYPE],
      }));

      const existing = selectedFiles;
      const conflictsFound: File[] = [];
      const rest: File[] = [];
      for (const f of files) {
        const dup = existing.some((e) => e.name === f.name && e.mimeType === f.mimeType);
        if (dup) conflictsFound.push(f);
        else rest.push(f);
      }

      if (conflictsFound.length > 0) {
        setConflicts(conflictsFound);
        setNonConflicting(rest);
      } else {
        setSelectedFiles((prev) => [...prev, ...rest]);
        storeFilesInDB(rest);
      }
    }
  };

  const handleOpenPicker = async () => {
    if (!isPickerReady || !isGisReady) {
      alert('Google Picker is not ready yet. Please wait.');
      return;
    }

    // Try to get token from session first
    let token = accessToken;

    if (!token) {
      try {
        const res = await fetch('/api/session');
        if (res.ok) {
          const data = await res.json();
          const maybeToken = data?.session?.token;
          if (maybeToken) {
            token = maybeToken;
            setAccessToken(token);
            console.log('Got Google token from session');
          }
        }
      } catch (err) {
        console.error('Failed to get session token:', err);
      }
    }

    if (!token) {
      console.log('No stored token, requesting new access token...');
      tokenClientRef.current.callback = async (response: any) => {
        if (response.error !== undefined) {
          console.error('Error getting access token:', response.error);
          return;
        }

        const newToken = response.access_token;
        setAccessToken(newToken);

        createPicker(newToken);
      };

      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    } else {
      createPicker(token);
    }
  };

  const storeFilesInDB = async (files: File[]) => {
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });

      if (!res.ok) throw new Error('Failed to store files');
      toast.success('Files saved successfully.');

      await fetchUserFilesFromDB();
    } catch (err) {
      console.error('Error saving files:', err);
    }
  };

  const filteredFiles = () => {
    if (activeView === 'recent') {
      return [...selectedFiles].slice(0, 5);
    }
    if (activeView === 'starred') {
      // Starred is server-provided property; if absent, treat as false
      return selectedFiles.filter((f: any) => f.starred === true);
    }
    if (activeView === 'media') {
      return selectedFiles.filter(
        (f) => f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/'),
      );
    }
    return selectedFiles;
  };

  const handleToggleStar = async (fileId: string, starred: boolean) => {
    // Optimistic update to avoid re-sorting jump
    const prev = selectedFiles;
    setSelectedFiles((curr) => curr.map((f) => (f.id === fileId ? { ...f, starred } : f)));
    try {
      const res = await fetch('/api/files/starred', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, starred }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to update starred:', data.error || res.statusText);
        setSelectedFiles(prev);
      }
    } catch (e) {
      console.error('Star toggle error:', e);
      setSelectedFiles(prev);
    }
  };

  const handleDeleteAllFiles = async () => {
    try {
      const res = await fetch('/api/files?all=true', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete all files:', data.error || res.statusText);
        return;
      }
      toast.success('All files deleted.');
      await fetchUserFilesFromDB();
    } catch (e) {
      console.error('Delete all files error:', e);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete account:', data.error || res.statusText);
        return;
      }
      await signOut({ callbackUrl: '/login' });
    } catch (e) {
      console.error('Delete account error:', e);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files?fileId=${fileId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Failed to delete file:', errorData.error || res.statusText);
        return;
      }

      toast.success('File deleted successfully.');
      await fetchUserFilesFromDB();
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 text-gray-800 flex'>
      <Sidebar />
      <div className='flex-1'>
        <main className='max-w-6xl mx-auto px-6 py-10'>
          <div className='mb-6'>
            <h1 className='text-2xl capitalize'>{activeView}</h1>
          </div>

          {!isLoading && activeView !== 'settings' && (
            <>
              <div className='w-full mb-4'>
                <Input
                  placeholder='Search file'
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
                  className='w-full bg-white border border-gray-200 shadow-sm'
                  disabled={filteredFiles().length === 0}
                />
              </div>
              <FileList
                files={filteredFiles()}
                onOpen={handleOpenPicker}
                onRemove={handleRemoveFile}
                searchTerm={searchTerm}
                onToggleStar={handleToggleStar}
                emptyTitle={
                  activeView === 'media'
                    ? 'The media storage is empty.'
                    : activeView === 'starred'
                      ? 'No starred files yet.'
                      : 'The file storage is empty.'
                }
                emptyDescription={
                  activeView === 'media'
                    ? 'Load images or videos to see them here.'
                    : activeView === 'starred'
                      ? 'Star files to quickly find them later.'
                      : 'Get started by adding files from your Google Drive.'
                }
                emptyButtonLabel={activeView === 'starred' ? 'Add Files' : 'Add Your First File'}
                hideEmptyButton={activeView === 'media' || activeView === 'starred'}
              />
            </>
          )}
          {!isLoading && activeView === 'settings' && (
            <Settings
              onDeleteAllFiles={handleDeleteAllFiles}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
          {conflicts && conflicts.length > 0 && (
            <DuplicateResolver
              conflicts={conflicts}
              onCancel={() => {
                setConflicts(null);
                setNonConflicting([]);
              }}
              onComplete={(resolved) => {
                const toSave = [...nonConflicting, ...resolved];
                setConflicts(null);
                setNonConflicting([]);
                if (toSave.length > 0) {
                  setSelectedFiles((prev) => [...prev, ...toSave]);
                  storeFilesInDB(toSave);
                }
              }}
            />
          )}
        </main>
        {activeView !== 'settings' && (
          <div className='fixed bottom-6 right-6 z-20'>
            <Button onClick={handleOpenPicker} className='h-12 px-5 text-sm'>
              <Plus className='h-8 w-8' /> Upload New File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
