"use client";

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ModeToggle } from '@/components/ui/mode-toggle';
import Image from 'next/image';
import { BRANDING } from '@/lib/constants/branding';

export function Header() {
  return (
    <header className="border-b border-border py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="h-6 w-6 relative">
            <Image
              src="/logo.svg"
              alt="Signet Logo"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-bold">{BRANDING.appName}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <ModeToggle />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
} 