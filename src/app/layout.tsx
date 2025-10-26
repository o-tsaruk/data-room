import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({
  weight: ['400', '700'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-roboto',
});

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
      <body className={`${roboto.variable}`}>{children}</body>
    </html>
  );
}
