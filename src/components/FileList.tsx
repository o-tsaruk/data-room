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
  RowSelectionState,
} from '@tanstack/react-table';
import {
  Trash2,
  FolderOpen,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Folder as FolderIcon,
  ChevronRight,
  MoreVertical,
  Copy,
  Pencil,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyContent,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
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
  onCopy?: (url: string) => void;
  onRenameFile?: (fileId: string, newName: string) => Promise<void>;
  onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
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
  onCopy,
  onRenameFile,
  onRenameFolder,
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

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [selectedFolders, setSelectedFolders] = React.useState<Set<string>>(new Set());
  const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [folderToDelete, setFolderToDelete] = React.useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false);
  const [itemToRename, setItemToRename] = React.useState<{
    id: string;
    name: string;
    type: 'file' | 'folder';
  } | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'uploadedAt', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

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

  // Collect all folder IDs from filtered folder tree (including nested)
  const getAllFolderIds = React.useCallback((folderTree: FolderWithChildren[]): Set<string> => {
    const ids = new Set<string>();
    const collectIds = (nodes: FolderWithChildren[]) => {
      nodes.forEach((node) => {
        ids.add(node.id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };
    collectIds(folderTree);
    return ids;
  }, []);

  const allFolderIds = React.useMemo(
    () => getAllFolderIds(filteredFolderTree),
    [filteredFolderTree, getAllFolderIds],
  );

  const columns: ColumnDef<File>[] = React.useMemo(
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
    ],
  );

  const table = useReactTable({
    data: files,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  const filteredFiles = table.getRowModel().rows;

  // Update selected files when row selection changes
  React.useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selected = selectedRows.map((row) => row.original);
    setSelectedFiles(selected);
  }, [rowSelection, table]);

  // Clear selection when files change (e.g., after deletion)
  React.useEffect(() => {
    const selectedIds = Object.keys(rowSelection);
    const existingIds = new Set(files.map((f) => f.id));
    const hasInvalidSelection = selectedIds.some((id) => !existingIds.has(id));
    if (hasInvalidSelection) {
      setRowSelection({});
      setSelectedFiles([]);
    }
  }, [files, rowSelection]);

  // Clear selection when folders change (e.g., after deletion)
  React.useEffect(() => {
    const allFolderIds = new Set(folders.map((f) => f.id));
    const hasInvalidSelection = Array.from(selectedFolders).some((id) => !allFolderIds.has(id));
    if (hasInvalidSelection) {
      setSelectedFolders((prev) => {
        const next = new Set(prev);
        Array.from(prev).forEach((id) => {
          if (!allFolderIds.has(id)) {
            next.delete(id);
          }
        });
        return next;
      });
    }
  }, [folders, selectedFolders]);

  React.useEffect(() => {
    if (typeof searchTerm === 'string') {
      table.getColumn('name')?.setFilterValue(searchTerm.trim());
    }
  }, [searchTerm, table]);

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

  const handleRenameConfirm = async () => {
    if (!itemToRename || !renameValue.trim() || isRenaming) return;

    setIsRenaming(true);
    setRenameError(null);
    try {
      if (itemToRename.type === 'file' && onRenameFile) {
        await onRenameFile(itemToRename.id, renameValue.trim());
      } else if (itemToRename.type === 'folder' && onRenameFolder) {
        await onRenameFolder(itemToRename.id, renameValue.trim());
      }
      setRenameDialogOpen(false);
      setItemToRename(null);
      setRenameValue('');
      setRenameError(null);
    } catch (error: any) {
      setRenameError(error.message || 'Failed to rename.');
    } finally {
      setIsRenaming(false);
    }
  };

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);

    try {
      // Delete selected files first, sequentially
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          onRemove(file.id);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Delete selected folders after files are deleted
      if (selectedFolders.size > 0) {
        const folderIds = Array.from(selectedFolders);
        for (const folderId of folderIds) {
          onDeleteFolder?.(folderId);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // Clear selections
      setRowSelection({});
      setSelectedFiles([]);
      setSelectedFolders(new Set());
    } finally {
      setIsDeleting(false);
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
            <Checkbox
              checked={selectedFolders.has(folder.id)}
              onCheckedChange={() => toggleFolderSelection(folder.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label='Select folder'
            />
          </TableCell>
          <TableCell></TableCell>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 data-[state=open]:bg-transparent'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToRename({ id: folder.id, name: folder.name, type: 'folder' });
                      setRenameValue(folder.name);
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(folder.id, e);
                    }}
                  >
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
    return (
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
  }

  return (
    <div className='mt-2'>
      <div className='flex items-center justify-between mb-2 h-[40px]'>
        {selectedFiles.length > 0 || selectedFolders.size > 0 ? (
          <>
            <div className='text-sm text-gray-600'>
              Selected: {selectedFiles.length + selectedFolders.size}
            </div>
            <Button
              variant='destructive'
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className='flex items-center gap-2'
            >
              {isDeleting ? (
                <>
                  <Spinner className='h-4 w-4' />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className='h-4 w-4' />
                  Delete
                </>
              )}
            </Button>
          </>
        ) : (
          <div className='h-full'></div>
        )}
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
      <Dialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open);
          if (!open) {
            setRenameError(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {itemToRename?.type === 'file' ? 'File' : 'Folder'}</DialogTitle>
          </DialogHeader>
          <div className='py-4'>
            <Input
              id='rename-input'
              placeholder={itemToRename?.type === 'file' ? 'File name' : 'Folder name'}
              value={renameValue}
              onChange={(e) => {
                setRenameValue(e.target.value);
                setRenameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRenaming) {
                  handleRenameConfirm();
                }
              }}
              autoFocus
            />
            {renameError && <div className='text-xs text-red-600 mt-2'>{renameError}</div>}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameConfirm} disabled={!renameValue.trim() || isRenaming}>
              {isRenaming ? (
                <>
                  <Spinner className='h-4 w-4 mr-2' />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
