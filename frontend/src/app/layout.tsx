import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import NextAuthProvider from './session-provider';

export const metadata: Metadata = {
  title: 'Data Room',
  description:
    'A Data Room is an organized repository for securely storing and distributing documents',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='uk'>
      <body className={GeistSans.className}>
        <Toaster position='bottom-center' theme='light' richColors />
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
