"use client";

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SwapForm } from '@/components/swap/SwapForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, History, User } from 'lucide-react';
import { useAccount } from 'wagmi';

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Signet</h1>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="swap" className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="swap">
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Swap
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="swap">
            <SwapForm />
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderHistoryContent />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function OrderHistoryContent() {
  const [orders, setOrders] = React.useState<any[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('signet-orders');
      if (stored) {
        setOrders(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load order history:', e);
    }
  }, []);

  if (orders.length === 0) {
    return <p className="text-muted-foreground">No orders yet</p>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="border rounded-lg p-4">
          <div className="flex justify-between">
            <span className="font-medium">
              {order.sourceAmount} {order.sourceToken.slice(-4)}
            </span>
            <span className="text-sm text-muted-foreground">
              {new Date(order.timestamp * 1000).toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Status: {order.status}
          </div>
        </div>
      ))}
    </div>
  );
}