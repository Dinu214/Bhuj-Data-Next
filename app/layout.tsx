import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hari Prabodham — Bhuj Data Management',
  description: 'People, groups, categories and attendance management for Hari Prabodham Bhuj',
  manifest: '/manifest.json',
  icons: {
    apple: '/hpym.jpg',
  },
};

export const viewport: Viewport = {
  themeColor: '#7C2D3B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}

