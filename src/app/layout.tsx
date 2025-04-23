import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SolanaFlowGraph - Visualize Solana Transactions',
  description: 'Visualize and analyze Solana blockchain transactions with interactive graph visualizations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
} 