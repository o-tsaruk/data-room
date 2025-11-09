'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { File } from '@/src/types';
import { formatTimestampUTC } from '../../utils/common';

interface UseFileListColumnsProps {
  allFolderIds: Set<string>;
  selectedFolders: Set<string>;
  setSelectedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  setItemToRename: (item: { id: string; name: string; type: 'file' | 'folder' }) => void;
  setRenameValue: (value: string) => void;
  setRenameError: (error: string | null) => void;
  setRenameDialogOpen: (open: boolean) => void;
  onCopy?: (url: string) => void;
  onRemove: (fileId: string) => void;
  onToggleStar?: (fileId: string, starred: boolean) => void;
  prettyType: (mime?: string) => string;
}

export function useFileListColumns({
  allFolderIds,
  selectedFolders,
  setSelectedFolders,
  setItemToRename,
  setRenameValue,
  setRenameError,
  setRenameDialogOpen,
  onCopy,
  onRemove,
  onToggleStar,
  prettyType,
}: UseFileListColumnsProps) {
  return React.useMemo<ColumnDef<File>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => {
          const isAllFilesSelected = table.getIsAllPageRowsSelected();
          const isSomeFilesSelected = table.getIsSomePageRowsSelected();
          const isAllFoldersSelected =
            allFolderIds.size > 0 &&
            Array.from(allFolderIds).every((id) => selectedFolders.has(id));
          const isSomeFoldersSelected = Array.from(allFolderIds).some((id) =>
            selectedFolders.has(id),
          );

          const isAllSelected = isAllFilesSelected && isAllFoldersSelected;
          const isSomeSelected =
            isSomeFilesSelected ||
            isSomeFoldersSelected ||
            (isAllFilesSelected && !isAllFoldersSelected) ||
            (isAllFoldersSelected && !isAllFilesSelected);

          const handleSelectAll = (value: boolean) => {
            table.toggleAllPageRowsSelected(value);
            if (value) {
              setSelectedFolders(new Set(allFolderIds));
            } else {
              setSelectedFolders(new Set());
            }
          };

          return (
            <Checkbox
              checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
              onCheckedChange={handleSelectAll}
              aria-label='Select all'
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'starred',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const file = row.original;
          const isStarred = !!file.starred;
          return (
            <button
              aria-label={isStarred ? 'Unstar' : 'Star'}
              className={`h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 ${
                isStarred ? 'text-yellow-500' : 'text-gray-400'
              }`}
              onClick={() => onToggleStar && onToggleStar(file.id, !isStarred)}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                className='h-5 w-5'
                fill={isStarred ? 'currentColor' : 'none'}
                stroke='currentColor'
                strokeWidth='2'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M11.048 2.927c.3-.921 1.604-.921 1.902 0l1.223 3.77a1 1 0 00.95.69h3.965c.969 0 1.371 1.24.588 1.81l-3.21 2.332a1 1 0 00-.364 1.118l1.224 3.77c.3.921-.755 1.688-1.54 1.118l-3.21-2.332a1 1 0 00-1.175 0l-3.21 2.332c-.784.57-1.838-.197-1.539-1.118l1.223-3.77a1 1 0 00-.364-1.118L2.324 9.197c-.783-.57-.38-1.81.588-1.81H6.88a1 1 0 00.95-.69l1.223-3.77z'
                />
              </svg>
            </button>
          );
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const iconUrl = row.original.iconUrl;
          const name = row.getValue('name') as string;
          const truncated = name.length > 40 ? name.slice(0, 37).trimEnd() + '...' : name;

          return (
            <div className='flex items-center gap-2 max-w-[400px]'>
              {iconUrl && (
                <Image
                  width={16}
                  height={16}
                  src={iconUrl}
                  alt='file type icon'
                  className='shrink-0'
                />
              )}
              <span className='font-medium text-gray-800 truncate'>{truncated}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'uploadedAt',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant='ghost'
              onClick={() => column.toggleSorting(isSorted === 'asc')}
              className='!p-0 text-gray-700 hover:text-gray-900 flex content-start items-center gap-1'
            >
              Uploaded
              {isSorted === 'asc' && <ArrowUp className='h-4 w-4' />}
              {isSorted === 'desc' && <ArrowDown className='h-4 w-4' />}
              {!isSorted && <ArrowUpDown className='h-4 w-4' />}
            </Button>
          );
        },
        cell: ({ row }) => {
          const uploadedAt = row.getValue('uploadedAt') as string;
          return uploadedAt ? (
            <div className='text-gray-600'>{formatTimestampUTC(uploadedAt) || 'Unknown'}</div>
          ) : null;
        },
      },
      {
        accessorKey: 'mimeType',
        header: 'Type',
        cell: ({ row }) => {
          const mimeType = row.getValue('mimeType') as string;
          return <div className='text-gray-600 capitalize'>{prettyType(mimeType)}</div>;
        },
        enableSorting: false,
      },
      {
        id: 'view',
        header: '',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const file = row.original;
          return (
            <div className='flex items-center'>
              <Button variant='ghost' size='sm' asChild className='h-8'>
                <a href={file.url} target='_blank' rel='noopener noreferrer'>
                  <ExternalLink className='h-4 w-4 mr-1' />
                  View
                </a>
              </Button>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const file = row.original;
          return (
            <div className='flex items-center'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 data-[state=open]:bg-transparent'
                  >
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onClick={() => {
                      if (onCopy) {
                        onCopy(file.url);
                      }
                    }}
                  >
                    <Copy className='h-4 w-4 mr-2' />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onClick={() => {
                      setItemToRename({ id: file.id, name: file.name, type: 'file' });
                      setRenameValue(file.name);
                      setRenameError(null);
                      setRenameDialogOpen(true);
                    }}
                  >
                    <Pencil className='h-4 w-4 mr-2' />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant='destructive'
                    className='cursor-pointer'
                    onClick={() => onRemove(file.id)}
                  >
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [
      allFolderIds,
      selectedFolders,
      setSelectedFolders,
      setItemToRename,
      setRenameValue,
      setRenameError,
      setRenameDialogOpen,
      onCopy,
      onRemove,
      onToggleStar,
      prettyType,
    ],
  );
}
