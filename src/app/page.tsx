'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileList from '@/src/components/FileList';
import { File } from '@/src/types';
import { formatTimestampUTC } from '../utils/common';

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

  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly openid email profile';

  useEffect(() => {
    if (!API_KEY || !CLIENT_ID || !APP_ID) {
      console.error('Missing Google API credentials! Please check your .env.local file.');
    }
  }, []);

  useEffect(() => {
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
    fetchUserFilesFromDB()
      .then(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const fetchUserFilesFromDB = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) return;

      const res = await fetch('/api/files', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
      });

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

      setSelectedFiles((prev) => [...prev, ...files]);
      storeFilesInDB(files);
    }
  };

  const handleOpenPicker = () => {
    if (!isPickerReady || !isGisReady) {
      alert('Google Picker is not ready yet. Please wait.');
      return;
    }

    tokenClientRef.current.callback = async (response: any) => {
      if (response.error !== undefined) {
        console.error('Error getting access token:', response.error);
        return;
      }

      const accessToken = response.access_token;
      setAccessToken(accessToken);

      const sessionRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const { session_token } = await sessionRes.json();
      localStorage.setItem('session_token', session_token);

      createPicker(accessToken);
    };

    if (accessToken === null) {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    } else {
      createPicker(accessToken);
    }
  };

  const storeFilesInDB = async (files: File[]) => {
    try {
      const sessionToken = localStorage.getItem('session_token');

      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken, files }),
      });

      if (!res.ok) throw new Error('Failed to store files');
      console.log('Files saved successfully');

      await fetchUserFilesFromDB();
    } catch (err) {
      console.error('Error saving files:', err);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        console.error('No session token found');
        return;
      }

      const res = await fetch(`/api/files?fileId=${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Failed to delete file:', errorData.error || res.statusText);
        return;
      }

      console.log('File deleted successfully');
      await fetchUserFilesFromDB();
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 text-gray-800'>
      <header className='sticky top-0 z-10'>
        <div className='max-w-6xl px-6 py-3 flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <img src='/logo.png' alt='Data Room Logo' className='h-14 w-14 object-contain' />
            <h1 className='text-3xl'>Data Room</h1>
          </div>
        </div>
      </header>

      <main className='max-w-6xl mx-auto px-6 py-10'>
        {!isLoading && (
          <FileList files={selectedFiles} onOpen={handleOpenPicker} onRemove={handleRemoveFile} />
        )}
      </main>

      <div className='fixed bottom-6 right-6 z-20'>
        <Button onClick={handleOpenPicker} className='text-lg'>
          <Plus className='h-8 w-8' /> Upload New File
        </Button>
      </div>
    </div>
  );
}
