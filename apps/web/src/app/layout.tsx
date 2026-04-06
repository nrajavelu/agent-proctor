import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ayan.ai — Agentic AI Proctoring',
  description: 'The era of passive proctoring is over. Ayan.ai is the first agentic AI proctor — verifying identity, monitoring integrity, and scoring credibility in real-time.',
  keywords: ['AI proctoring', 'online exam monitoring', 'agentic AI', 'exam integrity', 'remote proctoring'],
  icons: {
    icon: '/ayan-icon.png',
    apple: '/ayan-icon.png',
  },
  openGraph: {
    title: 'Ayan.ai — Agentic AI Proctoring',
    description: 'Stop watching recordings. Start orchestrating integrity.',
    type: 'website',
    url: 'https://ayan.nunmai.local',
    images: ['/ayan-logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-navy-950 text-gray-300">
        {children}
      </body>
    </html>
  );
}
