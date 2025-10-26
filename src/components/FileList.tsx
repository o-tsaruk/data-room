'use client';

import { IconTrash } from '@tabler/icons-react';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyContent,
} from '@/components/ui/empty';
import { File } from '@/src/types';

interface FileListProps {
  files: File[];
  onOpen: () => void;
  onRemove: (fileId: string) => void;
  onClear: () => void;
}

export default function FileList({ files, onOpen, onRemove, onClear }: FileListProps) {
  const EmptyFileList = () => (
    <Empty className='flex flex-col items-center justify-center h-[50vh] p-10 bg-white rounded-xl shadow-lg border border-dashed border-gray-200'>
      <EmptyHeader>
        <EmptyMedia variant='default'>
          <FolderOpen className='h-16 w-16 text-blue-500 mb-6' />
        </EmptyMedia>
        <EmptyTitle>The file storage is empty.</EmptyTitle>
        <EmptyDescription>Get started by adding files from your Google Drive.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onOpen}>
          <Plus className='mr-2 h-4 w-4' /> Add Your First File
        </Button>
      </EmptyContent>
    </Empty>
  );

  return files.length == 0 ? (
      <EmptyFileList />
  ) : (
    <div className='bg-white rounded-lg shadow-lg p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-semibold text-gray-800'>Uploaded Files ({files.length})</h2>
        <Button variant='outline' onClick={onClear} className='text-sm'>
          <Trash2 className='h-4 w-4 mr-2' /> Clear All
        </Button>
      </div>
      <div className='space-y-3'>
        {files.map((file, index) => (
          <div
            key={`${file.id}_${index}`}
            className='flex items-center justify-between p-4 border border-gray-200 rounded-lg'
          >
            <div className='flex items-center gap-3'>
              <span className='text-2xl'>📄</span>
              <div>
                <p className='font-medium text-gray-900'>{file.name}</p>
                <div className='flex gap-4 text-sm text-gray-500'>
                  {file.size && <span>Size: {(file.size / 1024).toFixed(2)} KB</span>}
                  {file.mimeType && <span>Type: {file.mimeType}</span>}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <a
                href={file.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-800 font-medium'
              >
                View
              </a>
              <button
                onClick={() => onRemove(file.id)}
                className='text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors'
                aria-label='Remove file'
              >
                <IconTrash size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
