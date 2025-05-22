"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Token, SUPPORTED_TOKENS } from '@/lib/constants/tokens';

interface TokenSelectorProps {
  label: string;
  tokens: Token[];
  selectedToken?: Token;
  amount: string;
  onTokenChange: (token: Token) => void;
  onAmountChange: (amount: string) => void;
  disabled?: boolean;
  chainId: number;
  price?: number | null;
  readOnly?: boolean;
}

export function TokenSelector({
  label,
  tokens,
  selectedToken,
  amount,
  onTokenChange,
  onAmountChange,
  disabled = false,
  chainId,
  price,
  readOnly = false,
}: TokenSelectorProps) {
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const handleTokenSelect = (value: string) => {
    const token = tokens.find((t) => t.symbol === value);
    if (token) {
      onTokenChange(token);
    }
  };

  const handleAmountChange = (value: string) => {
    // Limit to reasonable decimal places
    const formattedValue = value.includes('.') 
      ? value.split('.')[0] + '.' + value.split('.')[1].slice(0, 6)
      : value;
    onAmountChange(formattedValue);
  };

  // Filter tokens that are available for the selected chain
  const availableTokens = (tokens || []).filter(
    (token) => token.addresses[chainId] !== undefined
  );

  // Calculate USD value
  const usdValue = price && amount && !isNaN(parseFloat(amount)) 
    ? (parseFloat(amount) * price).toFixed(2) 
    : null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full"
            disabled={disabled || !selectedToken || readOnly}
            readOnly={readOnly}
            step="0.000001"
          />
          {usdValue && (
            <div className="text-sm text-muted-foreground mt-1">
              ≈ ${usdValue} USD
            </div>
          )}
        </div>
        <Select
          value={selectedToken?.symbol}
          onValueChange={handleTokenSelect}
          disabled={disabled || readOnly}
          onOpenChange={setIsSelectOpen}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select">
              {selectedToken && (
                <div className="flex items-center">
                  <div className="w-5 h-5 relative mr-2">
                    <Image 
                      src={selectedToken.logoURI}
                      alt={selectedToken.symbol}
                      fill
                      className="rounded-full object-contain"
                    />
                  </div>
                  {selectedToken.symbol}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableTokens.map((token) => (
              <SelectItem key={token.symbol} value={token.symbol}>
                <div className="flex items-center">
                  <div className="w-5 h-5 relative mr-2">
                    <Image 
                      src={token.logoURI}
                      alt={token.symbol}
                      fill
                      className="rounded-full object-contain"
                    />
                  </div>
                  {token.symbol}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
