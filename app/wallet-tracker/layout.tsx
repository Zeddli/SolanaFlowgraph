import React from 'react';

export const metadata = {
  title: 'Wallet Transaction Tracker | Solana FlowGraph',
  description: 'Track and visualize transaction history for any Solana wallet address',
};

export default function WalletTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 