"use client";

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Chain } from 'viem';
import { Label } from '@/components/ui/label';

interface ChainSelectorProps {
  label: string;
  chains: Chain[];
  selectedChainId?: number;
  onChainChange: (chainId: number) => void;
  disabled?: boolean;
}

export function ChainSelector({
  label,
  chains,
  selectedChainId,
  onChainChange,
  disabled = false,
}: ChainSelectorProps) {
  const handleChainSelect = (value: string) => {
    const chainId = parseInt(value, 10);
    onChainChange(chainId);
  };

  const selectedChain = chains.find(chain => chain.id === selectedChainId);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectedChainId?.toString() || ""}
        onValueChange={handleChainSelect}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select chain">
            {selectedChain ? selectedChain.name : "Select chain"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {chains.map((chain) => (
            <SelectItem key={chain.id} value={chain.id.toString()}>
              {chain.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}