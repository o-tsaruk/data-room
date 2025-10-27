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
import { Input } from '@/components/ui/input';
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
}

export default function FileList({ files, onOpen, onRemove }: FileListProps) {
  const columns: ColumnDef<File>[] = [
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
        return <div className='text-gray-600'>{formatTimestampUTC(uploadedAt) || 'Unknown'}</div>;
      },
    },
    {
      accessorKey: 'mimeType',
      header: 'Type',
      cell: ({ row }) => {
        const mimeType = row.getValue('mimeType') as string;
        return <div className='text-gray-600'>{mimeType || 'Unknown'}</div>;
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

  if (files.length === 0) {
    return <EmptyFileList />;
  }

  return (
    <div className='bg-white rounded-lg shadow-lg p-6'>
      <h2 className='text-xl font-medium text-gray-700 text-center mb-6'>Welcome to Data Room</h2>
      <div className='w-full py-4 mb-4'>
        <Input
          placeholder='Search file'
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value.trim())}
          className='w-full'
        />
      </div>

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
