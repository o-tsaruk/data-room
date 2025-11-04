'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Plus,
  Trash2,
  FolderOpen,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyContent,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { File } from '@/src/types';
import { formatTimestampUTC } from '../utils/common';

interface FileListProps {
  files: File[];
  onOpen: () => void;
  onRemove: (fileId: string) => void;
  onToggleStar?: (fileId: string, starred: boolean) => void;
  searchTerm?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyButtonLabel?: string;
  hideEmptyButton?: boolean;
}

export default function FileList({
  files,
  onOpen,
  onRemove,
  onToggleStar,
  searchTerm,
  emptyTitle,
  emptyDescription,
  emptyButtonLabel,
  hideEmptyButton,
}: FileListProps) {
  const resolvedEmptyTitle = emptyTitle ?? 'The file storage is empty.';
  const resolvedEmptyDescription =
    emptyDescription ?? 'Get started by adding files from your Google Drive.';
  const resolvedEmptyButton = emptyButtonLabel ?? 'Add Your First File';
  const showEmptyButton = !hideEmptyButton;
  const prettyType = (mime?: string) => {
    if (!mime) return 'unknown';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'application/zip' || mime === 'application/x-zip-compressed') return 'archive';
    if (mime === 'application/vnd.google-apps.document') return 'document';
    if (mime === 'application/vnd.google-apps.spreadsheet') return 'spreadsheet';
    if (mime === 'application/vnd.google-apps.presentation') return 'presentation';
    const parts = mime.split('/');
    return parts[1] || parts[0];
  };
  const columns: ColumnDef<File>[] = [
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
            className={`h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 ${isStarred ? 'text-yellow-500' : 'text-gray-400'}`}
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
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const file = row.original;
        return (
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' asChild className='h-8'>
              <a href={file.url} target='_blank' rel='noopener noreferrer'>
                <ExternalLink className='h-4 w-4 mr-1' />
                View
              </a>
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onRemove(file.id)}
              className='h-8 text-red-600 hover:text-red-800'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        );
      },
    },
  ];

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'uploadedAt', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: files,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  React.useEffect(() => {
    if (typeof searchTerm === 'string') {
      table.getColumn('name')?.setFilterValue(searchTerm.trim());
    }
  }, [searchTerm]);

  const EmptyFileList = () => (
    <Empty className='flex flex-col items-center justify-center h-[50vh] p-10 bg-white rounded-xl shadow-lg border border-dashed border-gray-200'>
      <EmptyHeader>
        <EmptyMedia variant='default'>
          <FolderOpen className='h-16 w-16 text-blue-500 mb-3' />
        </EmptyMedia>
        <EmptyTitle>{resolvedEmptyTitle}</EmptyTitle>
        <EmptyDescription>{resolvedEmptyDescription}</EmptyDescription>
      </EmptyHeader>
      {showEmptyButton && (
        <EmptyContent>
          <Button onClick={onOpen}>
            <Plus className='mr-2 h-4 w-4' /> {resolvedEmptyButton}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );

  if (files.length === 0) {
    return <EmptyFileList />;
  }

  return (
    <div className='bg-white rounded-lg shadow-lg p-4 min-h-[70vh]'>
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
