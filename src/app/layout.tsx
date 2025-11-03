import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
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
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
