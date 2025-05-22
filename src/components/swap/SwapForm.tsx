"use client";

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain, useBalance } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { BrowserProvider } from 'ethers';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SwapCard } from '@/components/layout/SwapCard';
import { TokenSelector } from './TokenSelector';
import { SUPPORTED_CHAINS, PECORINO_HOST_CHAIN_ID, PECORINO_SIGNET_CHAIN_ID } from '@/lib/constants/chains';
import { SUPPORTED_TOKENS, Token } from '@/lib/constants/tokens';
import { SwapInput, SwapState, SwapStatus } from '@/lib/types/signet';
import { OrderSigningService } from '@/lib/services/OrderSigningService';
import { PriceService } from '@/lib/services/PriceService';
import { CONTRACT_ADDRESSES, getOrdersContract, getPermit2Contract } from '@/lib/constants/contracts';
import { ArrowDownUp, Check, Loader2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

export function SwapForm() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching, error: switchChainError } = useSwitchChain();

  // Always start with Host -> Signet
  const [sourceChainId, setSourceChainId] = useState<number>(PECORINO_HOST_CHAIN_ID);
  const [targetChainId, setTargetChainId] = useState<number>(PECORINO_SIGNET_CHAIN_ID);
  const [sourceToken, setSourceToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const [targetToken, setTargetToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [swapState, setSwapState] = useState<SwapState>({ status: SwapStatus.IDLE });
  const [isAutoSwitching, setIsAutoSwitching] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  // Get balance of selected token on source chain
  const { data: tokenBalance, refetch: refetchBalance } = useBalance({
    address: address,
    token: sourceToken.addresses[sourceChainId] === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' 
      ? undefined 
      : (sourceToken.addresses[sourceChainId] as `0x${string}` | undefined),
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
  }, [amount, sourcePrice, targetPrice, sourceToken, targetToken, isHostToSignet]);

  // Check token approval when amount or token changes
  useEffect(() => {
    if (amount && sourceToken && address && chainId === sourceChainId) {
      checkTokenApproval();
    }
  }, [amount, sourceToken, address, chainId, sourceChainId]);

  // Auto-switch wallet network when user is on wrong chain
  useEffect(() => {
    if (!isConnected || !chainId || isAutoSwitching || isSwitching) return;

    // If user is not on the source chain, auto-switch
    if (chainId !== sourceChainId) {
      handleAutoNetworkSwitch();
    }
  }, [chainId, sourceChainId, isConnected, isAutoSwitching, isSwitching]);

  // Check if token needs approval
  const checkTokenApproval = async () => {
    if (!amount || !sourceToken || !address || !chainId) return;

    const tokenAddress = sourceToken.addresses[sourceChainId];
    if (!tokenAddress || tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      // Native token doesn't need approval
      setNeedsApproval(false);
      return;
    }

    try {
      setIsCheckingApproval(true);
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get permit2 contract address
      const permit2Address = getPermit2Contract(sourceChainId);
      
      // Check current allowance
      const { Contract } = await import('ethers');
      const tokenContract = new Contract(
        tokenAddress,
        ['function allowance(address owner, address spender) view returns (uint256)'],
        provider
      );
      
      const currentAllowance = await tokenContract.allowance(address, permit2Address);
      const requiredAmount = parseUnits(amount, sourceToken.decimals);
      
      setNeedsApproval(currentAllowance < requiredAmount);
    } catch (error) {
      console.error('Error checking approval:', error);
      setNeedsApproval(true); // Assume approval needed on error
    } finally {
      setIsCheckingApproval(false);
    }
  };

  // Handle token approval
  const handleTokenApproval = async () => {
    if (!sourceToken || !address || !amount) return;

    const tokenAddress = sourceToken.addresses[sourceChainId];
    if (!tokenAddress || tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') return;

    try {
      setSwapState({ status: SwapStatus.WAITING_FOR_CONFIRMATION });
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const permit2Address = getPermit2Contract(sourceChainId);
      const requiredAmount = parseUnits(amount, sourceToken.decimals);
      
      // Approve maximum amount for better UX
      const maxAmount = parseUnits('1000000000', sourceToken.decimals); // Large number
      
      const { Contract } = await import('ethers');
      const tokenContract = new Contract(
        tokenAddress,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );
      
      console.log(`Approving ${sourceToken.symbol} for Permit2...`);
      const tx = await tokenContract.approve(permit2Address, maxAmount);
      
      setSwapState({ 
        status: SwapStatus.WAITING_FOR_CONFIRMATION,
        txHash: tx.hash 
      });
      
      console.log('Approval transaction sent:', tx.hash);
      const receipt = await tx.wait();
      
      console.log('Approval confirmed:', receipt.hash);
      setNeedsApproval(false);
      setSwapState({ status: SwapStatus.IDLE });
      
      // Refetch balance after approval
      refetchBalance();
      
    } catch (error) {
      console.error('Approval failed:', error);
      setSwapState({
        status: SwapStatus.FAILED,
        error: `Approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle automatic network switching
  const handleAutoNetworkSwitch = async () => {
    if (!switchChain || !isConnected) return;

    try {
      setIsAutoSwitching(true);
      await switchChain({ chainId: sourceChainId });
    } catch (error) {
      console.error('Failed to auto-switch network:', error);
    } finally {
      setIsAutoSwitching(false);
    }
  };

  // Handle manual network switching
  const handleManualNetworkSwitch = async () => {
    if (!switchChain || !isConnected) return;

    try {
      setSwapState({ status: SwapStatus.PENDING });
      await switchChain({ chainId: sourceChainId });
      setSwapState({ status: SwapStatus.IDLE });
    } catch (error) {
      console.error('Failed to switch network:', error);
      setSwapState({
        status: SwapStatus.FAILED,
        error: `Failed to switch to ${getSupportedChainName(sourceChainId)}. Please switch manually in your wallet.`
      });
    }
  };

  // Handle swap direction toggle with auto network switch
  const handleSwapDirection = async () => {
    if (swapState.status !== SwapStatus.IDLE) return;

    // Swap the chains
    const newSourceChain = targetChainId;
    const newTargetChain = sourceChainId;
    
    setSourceChainId(newSourceChain);
    setTargetChainId(newTargetChain);
    
    // Reset tokens and amounts
    const firstToken = SUPPORTED_TOKENS[0];
    setSourceToken(firstToken);
    setTargetToken(firstToken);
    setAmount('');
    setTargetAmount('');
    setSwapState({ status: SwapStatus.IDLE });
    setNeedsApproval(false);

    // Auto-switch to new source chain if connected
    if (isConnected && chainId !== newSourceChain && switchChain) {
      try {
        setIsAutoSwitching(true);
        await switchChain({ chainId: newSourceChain });
      } catch (error) {
        console.error('Failed to auto-switch after direction change:', error);
      } finally {
        setIsAutoSwitching(false);
      }
    }
  };

  // Handle source token change
  const handleSourceTokenChange = (token: Token) => {
    setSourceToken(token);
    setTargetToken(token); // Always use same token for cross-chain
    setNeedsApproval(false); // Reset approval status
  };

  // Handle the actual swap execution
  const handleSwap = async () => {
    if (!address || !amount || !sourceToken || !targetToken) return;

    // If on wrong network, switch first
    if (chainId !== sourceChainId) {
      await handleManualNetworkSwitch();
      return;
    }

    // If needs approval, handle that first
    if (needsApproval) {
      await handleTokenApproval();
      return;
    }

    try {
      setSwapState({ status: SwapStatus.CREATING_ORDER });
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Initialize OrderSigningService
      const orderSigningService = new OrderSigningService(signer);
      
      // Create order parameters
      const parsedAmount = parseUnits(amount, sourceToken.decimals);
      const parsedTargetAmount = targetAmount ? parseUnits(targetAmount, targetToken.decimals) : parsedAmount;
      
      const sourceTokenAddress = sourceToken.addresses[sourceChainId];
      const targetTokenAddress = targetToken.addresses[targetChainId];
      
      if (!sourceTokenAddress || !targetTokenAddress) {
        throw new Error('Token not supported on selected chain');
      }
      
      // Create the order
      const order = {
        inputs: [{
          token: sourceTokenAddress,
          amount: parsedAmount,
        }],
        outputs: [{
          token: targetTokenAddress,
          amount: parsedTargetAmount,
          recipient: address,
          chainId: targetChainId,
        }],
        deadline: BigInt(Math.floor(Date.now() / 1000) + 300), // 5 minutes from now
      };
      
      console.log('Creating order:', order);
      
      // Sign the order
      setSwapState({ status: SwapStatus.ORDER_CREATED });
      const ordersContractAddress = getOrdersContract(sourceChainId);
      
      const signedOrder = await orderSigningService.signOrder(
        order,
        sourceChainId,
        ordersContractAddress
      );
      
      console.log('Order signed:', signedOrder);
      
      // Send to transaction cache
      setSwapState({ status: SwapStatus.SENDING_BUNDLE });
      await orderSigningService.sendOrderToTxCache(
        signedOrder,
        'https://transactions.pecorino.signet.sh'
      );
      
      console.log('Order sent to transaction cache');
      
      // Success!
      setSwapState({
        status: SwapStatus.COMPLETED,
        bundleId: `order-${Date.now()}`,
      });
      
      // Reset form
      setTimeout(() => {
        setAmount('');
        setTargetAmount('');
        setSwapState({ status: SwapStatus.IDLE });
        refetchBalance();
      }, 3000);
      
    } catch (error) {
      console.error('Swap failed - Full error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check if it's a transaction cache error
        if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error') || errorMessage.includes('Transaction cache service error')) {
          errorMessage = 'The Signet transaction cache service is currently experiencing issues. This is a known issue with the Pecorino testnet. Please try again later or contact the Signet team on Discord for support.';
        }
      }
      
      setSwapState({
        status: SwapStatus.FAILED,
        error: errorMessage,
      });
    }
  };

  // Helper function to get chain name
  const getSupportedChainName = (chainId: number): string => {
    return SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || `Chain ${chainId}`;
  };

  // Check if user is on wrong network
  const isWrongNetwork = chainId && sourceChainId && chainId !== sourceChainId;
  const shouldShowNetworkSwitch = isWrongNetwork && !isAutoSwitching && !isSwitching;

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
    !isWrongNetwork &&
    !needsApproval;

  // Button text logic
  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (shouldShowNetworkSwitch) return `Switch to ${getSupportedChainName(sourceChainId)}`;
    if (isAutoSwitching || isSwitching) return "Switching Network...";
    if (isCheckingApproval) return "Checking Approval...";
    if (needsApproval) return `Approve ${sourceToken.symbol}`;
    if (swapState.status === SwapStatus.WAITING_FOR_CONFIRMATION) return "Confirm in Wallet";
    if (swapState.status !== SwapStatus.IDLE) return "Processing...";
    return "Create Order";
  };

  const renderStatus = () => {
    // Network switching status
    if (isAutoSwitching || isSwitching) {
      return (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Switching to {getSupportedChainName(sourceChainId)}...
          </AlertDescription>
        </Alert>
      );
    }

    // Switch chain error
    if (switchChainError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to switch network: {switchChainError.message}
            <br />
            <span className="text-sm">Please switch to {getSupportedChainName(sourceChainId)} manually in your wallet.</span>
          </AlertDescription>
        </Alert>
      );
    }

    // Wrong network warning
    if (shouldShowNetworkSwitch) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please switch to {getSupportedChainName(sourceChainId)} to continue.
            <br />
            <span className="text-sm">Click the button below to switch automatically.</span>
          </AlertDescription>
        </Alert>
      );
    }

    // Approval needed
    if (needsApproval && !isCheckingApproval) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need to approve {sourceToken.symbol} for trading.
            <br />
            <span className="text-sm">This is a one-time approval for this token.</span>
          </AlertDescription>
        </Alert>
      );
    }

    // Swap status
    switch (swapState.status) {
      case SwapStatus.WAITING_FOR_CONFIRMATION:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div>Waiting for wallet confirmation...</div>
              {swapState.txHash && (
                <div className="text-xs font-mono mt-1">
                  Tx: {swapState.txHash.slice(0, 10)}...{swapState.txHash.slice(-8)}
                </div>
              )}
            </AlertDescription>
          </Alert>
        );
      case SwapStatus.CREATING_ORDER:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Creating and signing order...</AlertDescription>
          </Alert>
        );
      case SwapStatus.ORDER_CREATED:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Order signed, preparing for submission...</AlertDescription>
          </Alert>
        );
      case SwapStatus.SENDING_BUNDLE:
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Sending order to transaction cache...</AlertDescription>
          </Alert>
        );
      case SwapStatus.COMPLETED:
        const sourceChain = SUPPORTED_CHAINS.find(c => c.id === sourceChainId);
        return (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <div className="space-y-2">
                <div>Order created successfully!</div>
                <div className="text-sm text-muted-foreground">
                  Your order has been submitted to the transaction cache and will be filled by market makers.
                </div>
                {swapState.bundleId && (
                  <div className="text-xs text-muted-foreground">
                    Order ID: {swapState.bundleId}
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
            <AlertDescription>{swapState.error || 'Transaction failed'}</AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <SwapCard
      title="Cross-Chain Swap"
      onSubmit={shouldShowNetworkSwitch ? handleManualNetworkSwitch : (needsApproval ? handleTokenApproval : handleSwap)}
      submitText={getButtonText()}
      submitDisabled={
        !isConnected || 
        (swapState.status !== SwapStatus.IDLE && !shouldShowNetworkSwitch && !needsApproval) ||
        (canSwap === false && !needsApproval && !shouldShowNetworkSwitch)
      }
      isLoading={
        swapState.status !== SwapStatus.IDLE || 
        isAutoSwitching || 
        isSwitching || 
        isCheckingApproval
      }
      learnMoreUrl="https://signet.sh/docs"
    >
      <div className="space-y-6">
        {/* Price fetch errors */}
        {(sourcePriceError || targetPriceError) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to fetch current prices. Using fallback prices.
            </AlertDescription>
          </Alert>
        )}

        {/* From Section */}
        <div className="space-y-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">From Chain</label>
            <div className="flex h-11 w-full items-center rounded-lg border border-input bg-muted px-4 py-2 text-sm text-muted-foreground">
              {getSupportedChainName(sourceChainId)}
              {chainId === sourceChainId && (
                <Check className="h-4 w-4 ml-2 text-green-500" />
              )}
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

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapDirection}
            disabled={swapState.status !== SwapStatus.IDLE || isAutoSwitching || isSwitching}
            className="rounded-full h-10 w-10"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        {/* To Section */}
        <div className="space-y-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">To Chain</label>
            <div className="flex h-11 w-full items-center rounded-lg border border-input bg-muted px-4 py-2 text-sm text-muted-foreground">
              {getSupportedChainName(targetChainId)}
            </div>
          </div>
          <TokenSelector
            label="You Receive"
            tokens={SUPPORTED_TOKENS}
            selectedToken={targetToken}
            amount={targetAmount}
            onTokenChange={() => {}} // Locked to same token
            onAmountChange={() => {}} // Read-only
            chainId={targetChainId}
            disabled={true} // Always disabled - same token cross-chain
            price={targetPrice}
            readOnly={true}
          />
        </div>

        {/* Status Messages */}
        {renderStatus()}
      </div>
    </SwapCard>
  );
}
