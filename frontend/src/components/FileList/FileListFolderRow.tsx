'use client';

import * as React from 'react';
import { Folder as FolderIcon, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { Folder } from '@/src/types';

interface FileListFolderRowProps {
  folder: Folder;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onRename: (e?: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function FileListFolderRow({
  folder,
  isSelected,
  onSelect,
  onClick,
  onRename,
  onDelete,
}: FileListFolderRowProps) {
  return (
    <TableRow className='hover:bg-gray-50'>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label='Select folder'
        />
      </TableCell>
      <TableCell></TableCell>
      <TableCell>
        <div className='flex items-center gap-2 max-w-[400px]'>
          <div className='flex items-center gap-2 flex-1 cursor-pointer' onClick={onClick}>
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
                  onRename(e);
                }}
              >
                <Pencil className='h-4 w-4 mr-2' />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant='destructive' className='cursor-pointer' onClick={onDelete}>
                <Trash2 className='h-4 w-4 mr-2' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
