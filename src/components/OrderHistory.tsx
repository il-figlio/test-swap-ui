"use client";

import React, { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { ExternalLink, Clock, Check, X } from 'lucide-react';
import { SUPPORTED_TOKENS } from '@/lib/constants/tokens';
import { API_ENDPOINTS, CHAIN_CONFIG } from '@/lib/constants/contracts';

interface StoredOrder {
  id: string;
  timestamp: number;
  sourceToken: string;
  targetToken: string;
  sourceAmount: string;
  targetAmount: string;
  sourceChainId: number;
  targetChainId: number;
  status: 'pending' | 'filled' | 'expired';
  txHash?: string;
}

export function OrderHistory() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadOrdersFromStorage();
  }, []);

  const loadOrdersFromStorage = () => {
    try {
      const stored = localStorage.getItem('signet-orders');
      if (stored) {
        const parsedOrders = JSON.parse(stored);
        const now = Math.floor(Date.now() / 1000);
        const updatedOrders = parsedOrders.map((order: StoredOrder) => {
          if (order.status === 'pending') {
            const orderDeadline = order.timestamp + 300;
            if (now > orderDeadline) {
              return { ...order, status: 'expired' };
            }
          }
          return order;
        });
        setOrders(updatedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const getTokenSymbol = (address: string) => {
    const token = SUPPORTED_TOKENS.find(t => 
      Object.values(t.addresses).some(addr => 
        addr.toLowerCase() === address.toLowerCase()
      )
    );
    return token?.symbol || 'Unknown';
  };

  const getExplorerUrl = (chainId: number, txHash: string) => {
    if (chainId === CHAIN_CONFIG.host.chainId) {
      return `${API_ENDPOINTS.hostExplorer}/tx/${txHash}`;
    } else if (chainId === CHAIN_CONFIG.rollup.chainId) {
      return `${API_ENDPOINTS.rollupExplorer}/tx/${txHash}`;
    }
    return '#';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Recent Orders</h3>
      {orders.slice(0, 5).map((order) => (
        <div key={order.id} className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <span className="text-sm">
                {order.sourceAmount} {getTokenSymbol(order.sourceToken)} → {order.targetAmount} {getTokenSymbol(order.targetToken)}
              </span>
            </div>
            {order.txHash && (
              <a
                href={getExplorerUrl(order.sourceChainId, order.txHash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 