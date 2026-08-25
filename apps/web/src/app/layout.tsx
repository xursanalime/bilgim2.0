import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '@bilgim/ui/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bilgim',
  description:
    "Bilgim — o'qituvchi uchun online maktab platformasi. O'z maktabingizni bir necha daqiqada oching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
