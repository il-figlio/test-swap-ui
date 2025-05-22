"use client";

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain, useBalance } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SwapCard } from '@/components/layout/SwapCard';
import { TokenSelector } from './TokenSelector';
import { ChainSelector } from './ChainSelector';
import { SUPPORTED_CHAINS, PECORINO_HOST_CHAIN_ID, PECORINO_SIGNET_CHAIN_ID } from '@/lib/constants/chains';
import { TOKENS, Token, SUPPORTED_TOKENS } from '@/lib/constants/tokens';
import { SwapInput, SwapState, SwapStatus } from '@/lib/types/signet';
import { PriceService } from '@/lib/services/PriceService';
import { ArrowDownUp, Check, Loader2, AlertTriangle, Wallet } from 'lucide-react';

export function SwapForm() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, error: switchChainError } = useSwitchChain();

  // Always start with Host -> Signet
  const [sourceChainId, setSourceChainId] = useState<number>(PECORINO_HOST_CHAIN_ID);
  const [targetChainId, setTargetChainId] = useState<number>(PECORINO_SIGNET_CHAIN_ID);
  const [sourceToken, setSourceToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const [targetToken, setTargetToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [swapState, setSwapState] = useState<SwapState>({ status: SwapStatus.IDLE });
  const [manualNetworkSwitch, setManualNetworkSwitch] = useState(false);

  // Get balance of selected token on source chain
  const { data: tokenBalance } = useBalance({
    address: address,
    token: sourceToken.addresses[sourceChainId] === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' 
      ? undefined 
      : sourceToken.addresses[sourceChainId],
    chainId: sourceChainId,
  });

  // Fetch price data
  const { data: sourcePrice, error: sourcePriceError } = useSWR(
    sourceToken ? ['price', sourceToken.symbol] : null,
    async () => {
      try {
        const price = await PriceService.getTokenPrice(sourceToken!);
        return price;
      } catch (error) {
        console.error('Source price fetch error:', error);
        return null;
      }
    },
    { refreshInterval: 30000, shouldRetryOnError: true }
  );

  const { data: targetPrice, error: targetPriceError } = useSWR(
    targetToken ? ['price', targetToken.symbol] : null,
    async () => {
      try {
        const price = await PriceService.getTokenPrice(targetToken!);
        return price;
      } catch (error) {
        console.error('Target price fetch error:', error);
        return null;
      }
    },
    { refreshInterval: 30000, shouldRetryOnError: true }
  );

  // Logic for token selection based on chain direction
  const isHostToSignet = sourceChainId === PECORINO_HOST_CHAIN_ID && targetChainId === PECORINO_SIGNET_CHAIN_ID;
  const isSignetToHost = sourceChainId === PECORINO_SIGNET_CHAIN_ID && targetChainId === PECORINO_HOST_CHAIN_ID;

  // Calculate target amount when source amount or prices change
  useEffect(() => {
    if (!amount || !sourcePrice || !targetPrice) {
      setTargetAmount('');
      return;
    }

    try {
      if (isHostToSignet && sourceToken.symbol === targetToken.symbol) {
        // Host to Signet: Always 1:1 for same token
        setTargetAmount(amount);
      } else {
        // All other cases: Market value calculation
        const sourceValue = parseFloat(amount) * sourcePrice;
        const equivalentAmount = sourceValue / targetPrice;
        setTargetAmount(equivalentAmount.toFixed(6));
      }
    } catch (error) {
      console.error('Error calculating target amount:', error);
      setTargetAmount('');
    }
  }, [amount, sourcePrice, targetPrice, sourceToken, targetToken, isHostToSignet, isSignetToHost]);

  // Handle chain changes - ensure only valid combinations
  const handleSourceChainChange = (newChainId: number) => {
    setSourceChainId(newChainId);
    // Set target chain to the opposite
    if (newChainId === PECORINO_HOST_CHAIN_ID) {
      setTargetChainId(PECORINO_SIGNET_CHAIN_ID);
    } else {
      setTargetChainId(PECORINO_HOST_CHAIN_ID);
    }
    
    // Reset to first token and let user choose
    const firstToken = SUPPORTED_TOKENS[0];
    setSourceToken(firstToken);
    setTargetToken(firstToken);
    setAmount('');
    setTargetAmount('');
  };

  const handleTargetChainChange = (newChainId: number) => {
    setTargetChainId(newChainId);
    // Set source chain to the opposite
    if (newChainId === PECORINO_HOST_CHAIN_ID) {
      setSourceChainId(PECORINO_SIGNET_CHAIN_ID);
    } else {
      setSourceChainId(PECORINO_HOST_CHAIN_ID);
    }
    
    // Reset to first token and let user choose
    const firstToken = SUPPORTED_TOKENS[0];
    setSourceToken(firstToken);
    setTargetToken(firstToken);
    setAmount('');
    setTargetAmount('');
  };

  // Handle source token change
  const handleSourceTokenChange = (token: Token) => {
    setSourceToken(token);
    
    if (isHostToSignet) {
      // Host to Signet: Always force same token (1:1)
      setTargetToken(token);
    } else {
      // Signet to Host: Default to same token, but user can change
      if (targetToken.symbol === sourceToken.symbol || !targetToken) {
        setTargetToken(token); // Set to same token by default
      }
      // If user has already selected a different target token, keep their selection
    }
  };

  // Handle target token change (only allowed for Signet to Host)
  const handleTargetTokenChange = (token: Token) => {
    if (isSignetToHost) {
      setTargetToken(token);
    }
    // For Host to Signet, this is ignored since target is locked to source
  };

  // Handle chain switch requirement
  const ensureCorrectChain = async (): Promise<boolean> => {
    if (!sourceChainId || !chainId) return false;
    
    if (chainId !== sourceChainId) {
      try {
        if (switchChain) {
          await switchChain({ chainId: sourceChainId });
          setManualNetworkSwitch(false);
          return true;
        } else {
          const targetChain = SUPPORTED_CHAINS.find(c => c.id === sourceChainId);
          setManualNetworkSwitch(true);
          setSwapState({
            status: SwapStatus.FAILED,
            error: `Please switch to ${targetChain?.name || 'the correct network'} in your wallet`
          });
          return false;
        }
      } catch (error) {
        console.error('Network switch error:', error);
        const targetChain = SUPPORTED_CHAINS.find(c => c.id === sourceChainId);
        setManualNetworkSwitch(true);
        setSwapState({
          status: SwapStatus.FAILED,
          error: `Please switch to ${targetChain?.name || 'the correct network'} in your wallet`
        });
        return false;
      }
    }
    
    return true;
  };

  // Reset manual network switch state when chain changes
  useEffect(() => {
    if (chainId && sourceChainId && chainId === sourceChainId) {
      setManualNetworkSwitch(false);
      if (swapState.status === SwapStatus.FAILED && swapState.error?.includes('switch to')) {
        setSwapState({ status: SwapStatus.IDLE });
      }
    }
  }, [chainId, sourceChainId, swapState]);

  // Handle swap direction toggle
  const handleSwapDirection = () => {
    // Swap the chains
    const newSourceChain = targetChainId;
    const newTargetChain = sourceChainId;
    
    setSourceChainId(newSourceChain);
    setTargetChainId(newTargetChain);
    
    // Reset to first token for both (user will select what they want)
    const firstToken = SUPPORTED_TOKENS[0];
    setSourceToken(firstToken);
    setTargetToken(firstToken); // Default to same token
    setAmount('');
    setTargetAmount('');
    setSwapState({ status: SwapStatus.IDLE });
  };

  const handleSwap = async () => {
    if (!address || !amount || !sourceToken || !targetToken) return;

    const isCorrectChain = await ensureCorrectChain();
    if (!isCorrectChain) return;

    try {
      // Create the swap input with target amount
      const parsedAmount = parseUnits(amount, sourceToken.decimals);
      const parsedTargetAmount = targetAmount ? parseUnits(targetAmount, targetToken.decimals) : parsedAmount;
      
      const swapInput: SwapInput = {
        sourceChainId,
        targetChainId,
        sourceToken: sourceToken.addresses[sourceChainId],
        targetToken: targetToken.addresses[targetChainId],
        amount: parsedAmount,
        targetAmount: parsedTargetAmount,
        sender: address,
        recipient: address,
      };

      console.log('Executing real swap with:', swapInput);
      
      // Create provider and signer for real transactions
      if (typeof window.ethereum !== 'undefined') {
        const { JsonRpcProvider, BrowserProvider } = await import('ethers');
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Initialize real SignetService
        const signetService = new (await import('@/lib/services/SignetService')).default(provider);
        
        // Execute real swap
        await signetService.executeSwap(swapInput, signer);
      } else {
        throw new Error('MetaMask is not installed');
      }
      
    } catch (error) {
      console.error('Error executing swap:', error);
      setSwapState({
        status: SwapStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const renderStatus = () => {
    if (manualNetworkSwitch) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {swapState.error || 'Please switch to the correct network in your wallet'}
            {switchChainError && (
              <div className="mt-2 text-sm text-muted-foreground">
                Error: {switchChainError.message}
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    switch (swapState.status) {
      case SwapStatus.PENDING:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Preparing transaction...</AlertDescription>
          </Alert>
        );
      case SwapStatus.CREATING_ORDER:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Creating order...</AlertDescription>
          </Alert>
        );
      case SwapStatus.WAITING_FOR_CONFIRMATION:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div>Waiting for transaction confirmation...</div>
              {swapState.txHash && (
                <div className="text-xs font-mono mt-1">
                  Tx: {swapState.txHash.slice(0, 10)}...{swapState.txHash.slice(-8)}
                </div>
              )}
            </AlertDescription>
          </Alert>
        );
      case SwapStatus.ORDER_CREATED:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Order created, preparing bundle...</AlertDescription>
          </Alert>
        );
      case SwapStatus.SIMULATING_BUNDLE:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Simulating bundle...</AlertDescription>
          </Alert>
        );
      case SwapStatus.BUNDLE_SIMULATED:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Bundle simulated, sending...</AlertDescription>
          </Alert>
        );
      case SwapStatus.SENDING_BUNDLE:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Sending bundle...</AlertDescription>
          </Alert>
        );
      case SwapStatus.COMPLETED:
        const sourceChain = SUPPORTED_CHAINS.find(c => c.id === sourceChainId);
        const targetChain = SUPPORTED_CHAINS.find(c => c.id === targetChainId);
        return (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <div className="space-y-2">
                <div>Swap completed successfully!</div>
                {swapState.transactionHash && (
                  <div className="space-y-1">
                    <div className="text-xs font-mono">
                      Tx: {swapState.transactionHash.slice(0, 10)}...{swapState.transactionHash.slice(-8)}
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={`${sourceChain?.blockExplorers?.default?.url}/tx/${swapState.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View on {sourceChain?.name} Explorer
                      </a>
                      <a 
                        href={`${targetChain?.blockExplorers?.default?.url}/tx/${swapState.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View on {targetChain?.name} Explorer
                      </a>
                    </div>
                  </div>
                )}
                {swapState.bundleId && (
                  <div className="text-xs text-muted-foreground">
                    Bundle ID: {swapState.bundleId.slice(0, 8)}...
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        );
      case SwapStatus.FAILED:
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{swapState.error || 'Swap failed'}</AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  // Check if user is on wrong network
  const isWrongNetwork = chainId && sourceChainId && chainId !== sourceChainId;

  // Can swap check
  const canSwap = 
    isConnected &&
    sourceChainId !== undefined &&
    targetChainId !== undefined &&
    sourceToken !== undefined &&
    targetToken !== undefined &&
    amount !== '' &&
    parseFloat(amount) > 0 &&
    swapState.status === SwapStatus.IDLE &&
    !isWrongNetwork;

  return (
    <SwapCard
      title="Cross-Chain Swap"
      onSubmit={handleSwap}
      submitText={!isConnected ? "Connect Wallet" : isWrongNetwork ? `Switch to ${SUPPORTED_CHAINS.find(c => c.id === sourceChainId)?.name}` : "Swap Tokens"}
      submitDisabled={(!isConnected || !canSwap) && swapState.status === SwapStatus.IDLE}
      isLoading={swapState.status !== SwapStatus.IDLE && swapState.status !== SwapStatus.FAILED && swapState.status !== SwapStatus.COMPLETED}
      learnMoreUrl="https://signet.sh/docs"
    >
      <div className="space-y-6">


        {(sourcePriceError || targetPriceError) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to fetch current prices. Using fallback prices.
            </AlertDescription>
          </Alert>
        )}



        <div className="space-y-2">
          {/* Chain Display (non-interactive) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">From Chain</label>
            <div className="flex h-11 w-full items-center rounded-lg border border-input bg-muted px-4 py-2 text-sm text-muted-foreground">
              {SUPPORTED_CHAINS.find(c => c.id === sourceChainId)?.name}
            </div>
          </div>
          <TokenSelector
            label="You Send"
            tokens={SUPPORTED_TOKENS}
            selectedToken={sourceToken}
            amount={amount}
            onTokenChange={handleSourceTokenChange}
            onAmountChange={setAmount}
            chainId={sourceChainId}
            disabled={swapState.status !== SwapStatus.IDLE}
            price={sourcePrice}
          />
          {tokenBalance && (
            <div className="text-sm text-muted-foreground">
              Balance: {parseFloat(formatUnits(tokenBalance.value, tokenBalance.decimals)).toFixed(4)} {tokenBalance.symbol}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapDirection}
            disabled={swapState.status !== SwapStatus.IDLE}
            className="rounded-full h-10 w-10"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {/* Chain Display (non-interactive) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">To Chain</label>
            <div className="flex h-11 w-full items-center rounded-lg border border-input bg-muted px-4 py-2 text-sm text-muted-foreground">
              {SUPPORTED_CHAINS.find(c => c.id === targetChainId)?.name}
            </div>
          </div>
          <TokenSelector
            label="You Receive"
            tokens={SUPPORTED_TOKENS}
            selectedToken={targetToken}
            amount={targetAmount}
            onTokenChange={handleTargetTokenChange}
            onAmountChange={() => {}} // Read-only
            chainId={targetChainId}
            disabled={swapState.status !== SwapStatus.IDLE || isHostToSignet} // Disabled for Host to Signet (locked to same token)
            price={targetPrice}
            readOnly={false} // Allow editing target amount only for display verification
          />
        </div>

        {renderStatus()}
      </div>
    </SwapCard>
  );
}