import AuthGuard from '@/components/AuthGuard';
import './globals.css';

export const metadata = {
  title: 'Dexornit Trade Journal',
  description: 'Trade journaling webapp by Dexornit — track, analyze, and improve your trading performance.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}
