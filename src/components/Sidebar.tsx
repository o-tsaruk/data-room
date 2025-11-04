'use client';

import { useEffect, useState } from 'react';
import {
  File as FileIcon,
  Clock,
  Star,
  Image as ImageIcon,
  Settings as SettingsIcon,
} from 'lucide-react';

type MenuKey = 'files' | 'recent' | 'starred' | 'media' | 'settings';

const MENU: { key: MenuKey; label: string; href: string }[] = [
  { key: 'files', label: 'Files', href: '#files' },
  { key: 'recent', label: 'Recent', href: '#recent' },
  { key: 'starred', label: 'Starred', href: '#starred' },
  { key: 'media', label: 'Media', href: '#media' },
  { key: 'settings', label: 'Settings', href: '#settings' },
];

export default function Sidebar() {
  const [active, setActive] = useState<MenuKey>('files');

  useEffect(() => {
    const setFromHash = () => {
      const hash = window.location.hash.replace('#', '') as MenuKey;
      if (MENU.find((m) => m.key === hash)) {
        setActive(hash);
      } else {
        setActive('files');
      }
    };

    setFromHash();
    window.addEventListener('hashchange', setFromHash);
    return () => window.removeEventListener('hashchange', setFromHash);
  }, []);

  return (
    <aside className='w-64 h-screen border-r bg-white sticky top-0 left-0'>
      <div className='px-4 py-6 flex items-center space-x-3'>
        <img src='/logo.png' alt='Data Room Logo' className='h-10 w-10 object-contain' />
        <span className='text-xl'>Data Room</span>
      </div>
      <nav className='px-2 py-4 space-y-1'>
        {MENU.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={`block px-3 py-2 rounded-md hover:bg-gray-100 text-sm ${
              active === item.key ? 'bg-gray-100' : ''
            }`}
          >
            <span className='inline-flex items-center gap-2'>
              {item.key === 'files' && <FileIcon className='h-4 w-4' />}
              {item.key === 'recent' && <Clock className='h-4 w-4' />}
              {item.key === 'starred' && <Star className='h-4 w-4' />}
              {item.key === 'media' && <ImageIcon className='h-4 w-4' />}
              {item.key === 'settings' && <SettingsIcon className='h-4 w-4' />}
              {item.label}
            </span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
