'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/src/components/AppSidebar';
import DashboardHeader from '@/src/components/DashboardHeader';
import DuplicateResolver from '@/src/components/DuplicateResolver';
import FileList from '@/src/components/FileList';
import { File, Folder } from '@/src/types';
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

export function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rootFiles, setRootFiles] = useState<File[]>([]); 
  const [isPickerReady, setIsPickerReady] = useState(false);
  const [isGisReady, setIsGisReady] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const tokenClientRef = useRef<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [conflicts, setConflicts] = useState<File[] | null>(null);
  const [nonConflicting, setNonConflicting] = useState<File[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isStarredView, setIsStarredView] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);

  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly openid email profile';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
      window.gapi.load('client:picker', async () => {
        await initializePicker();
      });
    };
    document.head.appendChild(gapiScript);

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
    const folderId = searchParams.get('folder');
    const starred = searchParams.get('starred') === 'true';
    const newFolderId = folderId || null;

    setIsStarredView(starred);
    // Only update selectedFolderId if not in starred view
    if (!starred && newFolderId !== selectedFolderId) {
      setSelectedFolderId(newFolderId);
    } else if (starred && selectedFolderId !== null) {
      // Clear folder selection when switching to starred view
      setSelectedFolderId(null);
    }
  }, [searchParams]);

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
    setIsLoadingFiles(true);

    const fetchData = async () => {
      try {
        if (isStarredView) {
          const res = await fetch('/api/files?starred=true', { method: 'GET' });
          if (!res.ok) throw new Error('Failed to fetch starred files from DB');
          const data: { files: File[] } = await res.json();
          setSelectedFiles(data.files ?? []);
          setFolders([]);
          setCurrentFolderName(null);

          const rootRes = await fetch('/api/files?folderId=', { method: 'GET' });
          if (rootRes.ok) {
            const rootData: { files: File[] } = await rootRes.json();
            setRootFiles(rootData.files ?? []);
          }
        } else {
          const url = selectedFolderId
            ? `/api/files?folderId=${selectedFolderId}`
            : '/api/files?folderId=';
          const res = await fetch(url, { method: 'GET' });

          if (!res.ok) throw new Error('Failed to fetch files from DB');
          const data: { files: File[]; folders: Folder[] } = await res.json();
          setSelectedFiles(data.files ?? []);
          setFolders(data.folders ?? []);

          if (selectedFolderId) {
            const rootRes = await fetch('/api/files?folderId=', { method: 'GET' });
            if (rootRes.ok) {
              const rootData: { files: File[] } = await rootRes.json();
              setRootFiles(rootData.files ?? []);
            }
          } else {
            setRootFiles(data.files ?? []);
          }

          if (selectedFolderId) {
            const folder = data.folders?.find((f) => f.id === selectedFolderId);
            setCurrentFolderName(folder?.name || null);
          } else {
            setCurrentFolderName(null);
          }
        }
      } catch (err) {
        console.error('[Dashboard] Error loading files from DB:', err);
      } finally {
        setIsLoadingFiles(false);
        if (!selectedFolderId && !isStarredView) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [selectedFolderId, isStarredView]);

  const fetchUserFilesFromDB = useCallback(async () => {
    try {
      if (isStarredView) {
        const res = await fetch('/api/files?starred=true', { method: 'GET' });
        if (!res.ok) throw new Error('Failed to fetch starred files from DB');
        const data: { files: File[] } = await res.json();
        setSelectedFiles(data.files ?? []);
        setFolders([]);

        // Always fetch root files for collision checking when in starred view
        const rootRes = await fetch('/api/files?folderId=', { method: 'GET' });
        if (rootRes.ok) {
          const rootData: { files: File[] } = await rootRes.json();
          setRootFiles(rootData.files ?? []);
        }
      } else {
        const url = selectedFolderId
          ? `/api/files?folderId=${selectedFolderId}`
          : '/api/files?folderId=';
        const res = await fetch(url, { method: 'GET' });

        if (!res.ok) throw new Error('Failed to fetch files from DB');
        const data: { files: File[]; folders: Folder[] } = await res.json();

        setSelectedFiles(data.files ?? []);
        setFolders(data.folders ?? []);

        if (selectedFolderId) {
          const rootRes = await fetch('/api/files?folderId=', { method: 'GET' });
          if (rootRes.ok) {
            const rootData: { files: File[] } = await rootRes.json();
            setRootFiles(rootData.files ?? []);
          }
        } else {
          setRootFiles(data.files ?? []);
        }

        if (selectedFolderId) {
          const folder = data.folders?.find((f) => f.id === selectedFolderId);
          setCurrentFolderName(folder?.name || null);
        } else {
          setCurrentFolderName(null);
        }
      }
    } catch (err) {
      console.error('[Dashboard] Error loading files from DB:', err);
    }
  }, [selectedFolderId, isStarredView]);

  useEffect(() => {
    const handleAllFilesDeleted = () => {
      setSelectedFiles([]);
      setFolders([]);
      setSelectedFolderId(null);
      window.history.pushState({}, '', '/dashboard');
    };
    window.addEventListener('allFilesDeleted', handleAllFilesDeleted);
    return () => window.removeEventListener('allFilesDeleted', handleAllFilesDeleted);
  }, []);

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

      // When in starred view, check collisions against root files
      const existing = isStarredView ? rootFiles : selectedFiles;
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
          }
        }
      } catch (err) {
        console.error('Failed to get session token:', err);
      }
    }

    if (!token) {
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
      const targetFolderId = isStarredView ? null : selectedFolderId;

      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, folderId: targetFolderId }),
      });

      if (!res.ok) throw new Error('Failed to store files');
      toast.success('Files saved successfully.');

      // If in starred view, switch to root after adding
      if (isStarredView) {
        router.push('/dashboard');
        setSelectedFolderId(null);
        setIsStarredView(false);
      }

      await fetchUserFilesFromDB();
    } catch (err) {
      console.error('Error saving files:', err);
    }
  };

  const handleFolderClick = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    const url = folderId ? `/dashboard?folder=${folderId}` : '/dashboard';
    window.history.pushState({}, '', url);
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const res = await fetch(`/api/folders?folderId=${folderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete folder:', data.error || res.statusText);
        toast.error('Failed to delete folder.');
        return;
      }
      toast.success('Folder deleted successfully.');
      await fetchUserFilesFromDB();
      window.dispatchEvent(new CustomEvent('folderDeleted'));

      if (selectedFolderId === folderId) {
        handleFolderClick(null);
      }
    } catch (e) {
      console.error('Delete folder error:', e);
      toast.error('Failed to delete folder.');
    }
  };

  const handleToggleStar = async (fileId: string, starred: boolean) => {
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

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar onOpenPicker={handleOpenPicker} />
      <SidebarInset>
        <DashboardHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          disabled={selectedFiles.length === 0 && folders.length === 0}
        />
        <main className='w-full px-6 py-10'>
          {!isLoading && (
            <>
              <FileList
                files={selectedFiles}
                folders={folders}
                onOpen={handleOpenPicker}
                onRemove={handleRemoveFile}
                onFolderClick={handleFolderClick}
                onDeleteFolder={handleDeleteFolder}
                searchTerm={searchTerm}
                onToggleStar={handleToggleStar}
                activeView={isStarredView ? 'starred' : 'files'}
                isLoading={isLoadingFiles}
                currentFolderName={currentFolderName}
              />
            </>
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
        <div className='fixed bottom-6 right-6 z-20'>
          <Button onClick={handleOpenPicker} className='h-12 px-5 text-sm'>
            Upload New File
          </Button>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
