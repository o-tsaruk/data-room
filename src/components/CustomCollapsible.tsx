'use client';

import React, { useState, ReactNode, createContext, useContext } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleContextType {
  isOpen: boolean;
  toggle: () => void;
}

const CollapsibleContext = createContext<CollapsibleContextType | undefined>(undefined);

function useCollapsible() {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible components must be used within CustomCollapsible');
  }
  return context;
}

interface CustomCollapsibleProps {
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  onToggle?: (isOpen: boolean) => void;
}

export function CustomCollapsible({
  children,
  defaultOpen = false,
  className,
  onToggle,
}: CustomCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle }}>
      <div className={cn('group/collapsible', className)}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps {
  children?: ReactNode;
  asChild?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function CollapsibleTrigger({
  children,
  asChild = false,
  className,
  onClick,
}: CollapsibleTriggerProps) {
  const { isOpen, toggle } = useCollapsible();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle();
    onClick?.(e);
  };

  if (asChild && children) {
    const child = children as React.ReactElement;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        handleClick(e);
        child.props?.onClick?.(e);
      },
      className: cn(className, child.props?.className),
    });
  }

  return (
    <button className={cn('p-0 hover:bg-transparent', className)} onClick={handleClick}>
      {children}
    </button>
  );
}

interface CollapsibleArrowProps {
  className?: string;
}

export function CollapsibleArrow({ className }: CollapsibleArrowProps) {
  const { isOpen } = useCollapsible();

  return (
    <ChevronRight
      className={cn(
        'h-4 w-4 transition-transform duration-200 text-gray-500',
        isOpen && 'rotate-90',
        className
      )}
    />
  );
}

interface CollapsibleContentProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { isOpen } = useCollapsible();

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200 ease-in-out',
        isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

