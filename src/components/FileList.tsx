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
  Folder as FolderIcon,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyContent,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { File, Folder } from '@/src/types';
import { formatTimestampUTC } from '../utils/common';

type ActiveView = 'files' | 'starred';

type FolderWithChildren = Folder & { children: FolderWithChildren[] };

const EMPTY_STATE_TEXT: Record<
  ActiveView,
  { title: string; description: string; buttonLabel: string; showButton: boolean }
> = {
  files: {
    title: 'The file storage is empty.',
    description: 'Get started by adding files from your Google Drive.',
    buttonLabel: 'Add Your First File',
    showButton: true,
  },
  starred: {
    title: 'No starred files yet.',
    description: 'Star files to quickly find them later.',
    buttonLabel: 'Add Files',
    showButton: false,
  },
};

interface FileListProps {
  files: File[];
  folders?: Folder[];
  onOpen: () => void;
  onRemove: (fileId: string) => void;
  onFolderClick?: (folderId: string | null) => void;
  onDeleteFolder?: (folderId: string) => void;
  onToggleStar?: (fileId: string, starred: boolean) => void;
  searchTerm?: string;
  activeView: ActiveView;
  isLoading?: boolean;
  currentFolderName?: string | null;
}

export default function FileList({
  files,
  folders = [],
  onOpen,
  onRemove,
  onFolderClick,
  onDeleteFolder,
  onToggleStar,
  searchTerm,
  activeView,
  isLoading = false,
  currentFolderName,
}: FileListProps) {
  const emptyState = EMPTY_STATE_TEXT[activeView];

  const getEmptyStateTitle = () => {
    if (activeView === 'starred') {
      return emptyState.title;
    }
    if (currentFolderName) {
      return `${currentFolderName} folder is empty.`;
    }
    return emptyState.title;
  };
  const prettyType = (mime?: string) => {
    if (!mime) return 'unknown';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'application/zip' || mime === 'application/x-zip-compressed') return 'archive';
    if (mime === 'application/vnd.google-apps.document') return 'document';
    if (mime === 'application/vnd.google-apps.spreadsheet') return 'spreadsheet';
    if (mime === 'application/vnd.google-apps.presentation') return 'presentation';

    if (mime.includes('wordprocessingml.document') || mime.includes('msword')) return 'document';
    if (mime.includes('spreadsheetml') || mime.includes('ms-excel')) return 'spreadsheet';
    if (mime.includes('presentationml') || mime.includes('ms-powerpoint')) return 'presentation';
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
      id: 'delete',
      header: '',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const file = row.original;
        return (
          <div className='flex items-center'>
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
        <EmptyTitle>{getEmptyStateTitle()}</EmptyTitle>
        <EmptyDescription>{emptyState.description}</EmptyDescription>
      </EmptyHeader>
      {emptyState.showButton && (
        <EmptyContent>
          <Button onClick={onOpen}>{emptyState.buttonLabel}</Button>
        </EmptyContent>
      )}
    </Empty>
  );

  const folderTree = React.useMemo(() => {
    const folderMap = new Map<string, FolderWithChildren>();
    const rootFolders: FolderWithChildren[] = [];

    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    folders.forEach((folder) => {
      const folderWithChildren = folderMap.get(folder.id)!;
      if (!folder.parentFolderId) {
        rootFolders.push(folderWithChildren);
      } else {
        const parent = folderMap.get(folder.parentFolderId);
        if (parent) {
          parent.children.push(folderWithChildren);
        } else {
          rootFolders.push(folderWithChildren);
        }
      }
    });

    return rootFolders;
  }, [folders]);

  const filteredFolderTree = React.useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return folderTree;
    const term = searchTerm.trim().toLowerCase();

    const filterTree = (nodes: FolderWithChildren[]): FolderWithChildren[] => {
      return nodes
        .map((node) => {
          const matches = node.name.toLowerCase().includes(term);
          const filteredChildren = filterTree(node.children);

          if (matches || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter((node): node is FolderWithChildren => node !== null);
    };

    return filterTree(folderTree);
  }, [folderTree, searchTerm]);

  const filteredFiles = table.getRowModel().rows;

  const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [folderToDelete, setFolderToDelete] = React.useState<string | null>(null);

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleDeleteClick = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToDelete(folderId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (folderToDelete) {
      onDeleteFolder?.(folderToDelete);
      setDeleteDialogOpen(false);
      setFolderToDelete(null);
    }
  };

  const renderFolderRow = (folder: FolderWithChildren, depth: number = 0) => {
    const hasChildren = folder.children.length > 0;
    const isOpen = openFolders.has(folder.id);
    const indent = depth > 0 ? depth * 24 : 0;

    return (
      <React.Fragment key={`folder-${folder.id}`}>
        <TableRow className='hover:bg-gray-50'>
          <TableCell>
            <div className='w-8'></div>
          </TableCell>
          <TableCell>
            <div
              className='flex items-center gap-2 max-w-[400px]'
              style={{ paddingLeft: indent > 0 ? `${indent}px` : undefined }}
            >
              {hasChildren ? (
                <button
                  className='flex items-center gap-1 hover:bg-gray-100 rounded p-1 -ml-1'
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(folder.id);
                  }}
                >
                  <ChevronRight
                    className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              ) : null}
              <div
                className='flex items-center gap-2 flex-1 cursor-pointer'
                onClick={() => onFolderClick?.(folder.id)}
              >
                <FolderIcon className='h-4 w-4 text-blue-500 shrink-0' />
                <span className='font-medium text-gray-800 truncate'>{folder.name}</span>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div></div>
          </TableCell>
          <TableCell>
            <div className='text-gray-600 capitalize'>folder</div>
          </TableCell>
          <TableCell>
            <div></div>
          </TableCell>
          <TableCell>
            <div className='flex items-center'>
              <Button
                variant='ghost'
                size='sm'
                onClick={(e) => handleDeleteClick(folder.id, e)}
                className='h-8 text-red-600 hover:text-red-800'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isOpen && (
          <>{folder.children.map((child) => renderFolderRow(child, depth + 1))}</>
        )}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      <div className='bg-white rounded-lg shadow-lg p-4 min-h-[70vh]'>
        <div className='flex items-center justify-center h-[50vh]'>
          <div className='flex flex-col items-center gap-4'>
            <Spinner className='h-8 w-8' />
            <p className='text-gray-600'>Loading files...</p>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0 && folders.length === 0) {
    return <EmptyFileList />;
  }

  return (
    <div>
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
            {filteredFolderTree.map((folder) => renderFolderRow(folder))}
            {filteredFiles.length > 0 ? (
              filteredFiles.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredFolderTree.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  No results.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder and all its contents? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className='bg-red-600 hover:bg-red-700'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
