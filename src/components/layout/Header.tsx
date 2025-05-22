"use client";

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { BRANDING } from '@/lib/constants/branding';

export function Header() {
  return (
    <header style={{ borderBottom: '1px solid #ccc', padding: '16px 0', backgroundColor: '#f0f0f0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '24px', height: '24px', backgroundColor: '#3B82F6', borderRadius: '4px' }}></div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>{BRANDING.appName}</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ModeToggle />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}