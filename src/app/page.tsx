'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileList from '@/src/components/FileList';
import { File } from '@/src/types';

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
  const tokenClientRef = useRef<any>(null);

  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

  useEffect(() => {
    console.log('API_KEY:', API_KEY ? 'Set' : 'NOT SET');
    console.log('CLIENT_ID:', CLIENT_ID ? 'Set' : 'NOT SET');
    console.log('APP_ID:', APP_ID ? 'Set' : 'NOT SET');

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

  const initializePicker = async () => {
    try {
      await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
      setIsPickerReady(true);
      console.log('Google Picker API initialized');
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
    console.log('Google Identity Services initialized');
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
        mimeType: doc[window.google.picker.Document.MIME_TYPE],
        size: doc[window.google.picker.Document.SIZE_BYTES],
      }));

      setSelectedFiles((prev) => [...prev, ...files]);

      // Mock storing to DB
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

      setAccessToken(response.access_token);
      createPicker(response.access_token);
    };

    if (accessToken === null) {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    } else {
      createPicker(accessToken);
    }
  };

  // Mock function to store files in DB
  const storeFilesInDB = async (files: File[]) => {
    console.log('Mock: Storing files in database:', files);
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
  };

  const handleRemoveFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== fileId));
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
        <FileList
          files={selectedFiles}
          onOpen={handleOpenPicker}
          onRemove={handleRemoveFile}
          onClear={handleClearFiles}
        />
      </main>

      <div className='fixed bottom-6 right-6 z-20'>
        <Button onClick={handleOpenPicker} className='text-lg'>
          <Plus className='h-8 w-8' /> Upload New File
        </Button>
      </div>
    </div>
  );
}
