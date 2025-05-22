"use client";

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { BrowserProvider } from 'ethers';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, History, User } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { SwapForm } from '@/components/swap/SwapForm';
import OrderHistory from '@/components/swap/OrderHistory'; // Correct import
import { ProductionSignetService } from '@/lib/services/ProductionSignetService';
import { SUPPORTED_CHAINS, PECORINO_HOST_CHAIN_ID, PECORINO_SIGNET_CHAIN_ID } from '@/lib/constants/chains';
import { getTokenByAddress, SUPPORTED_TOKENS } from '@/lib/constants/tokens';

const SignetApp: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [signetService, setSignetService] = useState<ProductionSignetService | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      // Initialize Signet Service if needed
      // const service = new ProductionSignetService(...)
      // setSignetService(service)
    }
  }, [isConnected, address]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="swap" className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="swap">
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Swap
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" /> History
            </TabsTrigger>
            <TabsTrigger value="account">
              <User className="mr-2 h-4 w-4" /> Account
            </TabsTrigger>
          </TabsList>
          <TabsContent value="swap">
            <SwapForm />
          </TabsContent>
          <TabsContent value="history">
            <OrderHistory signetService={signetService || undefined} />
          </TabsContent>
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Account details content */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SignetApp;