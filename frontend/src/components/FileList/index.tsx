'use client';

import * as React from 'react';
import { useEffect } from 'react';
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
} from '@tanstack/react-table';
import { Trash2, FolderOpen } from 'lucide-react';
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
import { useFileListColumns } from './FileListColumns';
import { FileListFolderRow } from './FileListFolderRow';

type ActiveView = 'files' | 'starred';

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
  currentFolderId?: string | null;
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
  currentFolderId,
}: FileListProps) {
  const emptyState = EMPTY_STATE_TEXT[activeView];

  const getEmptyStateTitle = () => {
    if (activeView === 'starred') {
      return emptyState.title;
    }
    // Use currentFolderId to determine if we're in a folder, even if name isn't loaded yet
    if (currentFolderId || currentFolderName) {
      return currentFolderName ? `${currentFolderName} folder is empty.` : 'This folder is empty.';
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

  const filteredFolders = React.useMemo(() => {
    let result = folders;

    if (currentFolderId) {
      result = result.filter((folder) => folder.id !== currentFolderId);
    }

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((folder) => folder.name.toLowerCase().includes(term));
    }

    return result;
  }, [folders, searchTerm, currentFolderId]);

  const allFolderIds = React.useMemo(() => new Set(folders.map((f) => f.id)), [folders]);

  const columns = useFileListColumns({
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
  });

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

  useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selected = selectedRows.map((row) => row.original);
    setSelectedFiles(selected);
  }, [rowSelection, table]);

  useEffect(() => {
    const selectedIds = Object.keys(rowSelection);
    const existingIds = new Set(files.map((f) => f.id));
    const hasInvalidSelection = selectedIds.some((id) => !existingIds.has(id));
    if (hasInvalidSelection) {
      setRowSelection({});
      setSelectedFiles([]);
    }
  }, [files, rowSelection]);

  useEffect(() => {
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

  useEffect(() => {
    if (typeof searchTerm === 'string') {
      table.getColumn('name')?.setFilterValue(searchTerm.trim());
    }
  }, [searchTerm, table]);

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
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          onRemove(file.id);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (selectedFolders.size > 0) {
        const folderIds = Array.from(selectedFolders);
        for (const folderId of folderIds) {
          onDeleteFolder?.(folderId);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      setRowSelection({});
      setSelectedFiles([]);
      setSelectedFolders(new Set());
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='mt-10'>
        <div className='bg-white rounded-lg shadow-lg p-4 min-h-[70vh]'>
          <div className='flex items-center justify-center h-[50vh]'>
            <div className='flex flex-col items-center gap-4'>
              <Spinner className='h-8 w-8' />
              <p className='text-gray-600'>Loading files...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasFiles = files.length > 0;
  const hasFolders = filteredFolders.length > 0;

  if (!hasFiles && !hasFolders) {
    if (searchTerm && searchTerm.trim()) {
      return (
        <div className='mt-10'>
          <Empty className='flex flex-col items-center justify-center h-[50vh] p-10 bg-white rounded-xl shadow-lg border border-dashed border-gray-200'>
            <EmptyHeader>
              <EmptyMedia variant='default'>
                <FolderOpen className='h-16 w-16 text-blue-500 mb-3' />
              </EmptyMedia>
              <EmptyTitle>No results found</EmptyTitle>
              <EmptyDescription>Try adjusting your search terms</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      );
    }
    return (
      <div className='mt-10'>
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
      </div>
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
            {filteredFolders.map((folder) => (
              <FileListFolderRow
                key={folder.id}
                folder={folder}
                isSelected={selectedFolders.has(folder.id)}
                onSelect={() => toggleFolderSelection(folder.id)}
                onClick={() => onFolderClick?.(folder.id)}
                onRename={(e) => {
                  e?.stopPropagation();
                  setItemToRename({ id: folder.id, name: folder.name, type: 'folder' });
                  setRenameValue(folder.name);
                  setRenameError(null);
                  setRenameDialogOpen(true);
                }}
                onDelete={(e) => handleDeleteClick(folder.id, e)}
              />
            ))}
            {filteredFiles.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
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
