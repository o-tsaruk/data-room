'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Plus, Trash2, FolderOpen, ExternalLink } from 'lucide-react';
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

interface FileListProps {
  files: File[];
  onOpen: () => void;
  onRemove: (fileId: string) => void;
  onClear: () => void;
}

export default function FileList({ files, onOpen, onRemove, onClear }: FileListProps) {
  const columns: ColumnDef<File>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <span className='text-2xl'>📄</span>
          <div className='font-medium'>{row.getValue('name')}</div>
        </div>
      ),
    },
    {
      accessorKey: 'mimeType',
      header: 'Type',
      cell: ({ row }) => {
        const mimeType = row.getValue('mimeType') as string;
        return <div className='text-gray-600'>{mimeType || 'Unknown'}</div>;
      },
    },
    {
      id: 'actions',
      enableHiding: false,
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

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: files,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
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
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-semibold text-gray-800'>Uploaded Files ({files.length})</h2>
        <Button variant='outline' onClick={onClear} className='text-sm'>
          <Trash2 className='h-4 w-4 mr-2' /> Clear All
        </Button>
      </div>

      <div className='flex items-center py-4'>
        <Input
          placeholder='Filter by name...'
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className='max-w-sm'
        />
      </div>

      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
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
