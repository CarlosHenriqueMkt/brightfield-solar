import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';

const plex = localFont({
  src: [
    { path: './fonts/ibm-plex-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-500.ttf', weight: '500', style: 'normal' },
    { path: './fonts/ibm-plex-600.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Brightfield Solar',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US" className={plex.variable}>
      <body>{children}</body>
    </html>
  );
}
