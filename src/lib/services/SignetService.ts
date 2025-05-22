import { JsonRpcProvider, BrowserProvider, Contract, TransactionReceipt, ContractFactory } from "ethers";
import { 
  Order, 
  OrderInput, 
  OrderOutput, 
  SwapInput, 
  SwapState, 
  SwapStatus,
  SignedOrder,
  Permit2Batch,
  TokenPermissions,
  PermitBatchTransferFrom
} from "../types/signet";
import OrdersABI from "../abi/Orders.json";
import { CONTRACT_ADDRESSES } from "../constants/contracts";

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const ORDERS_ADDRESS = "0x0000000000000000000000000000000000000000"; // Replace with actual address

export class SignetService {
  private provider: JsonRpcProvider | BrowserProvider;
  private ordersContract: Contract;

  constructor(provider: JsonRpcProvider | BrowserProvider) {
    this.provider = provider;
    const factory = new ContractFactory(OrdersABI, [], provider);
    this.ordersContract = factory.attach(ORDERS_ADDRESS);
  }

  async createOrder(input: SwapInput): Promise<Order> {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

    const orderInput: OrderInput = {
      token: input.sourceToken,
      amount: input.amount
    };

    const orderOutput: OrderOutput = {
      token: input.targetToken,
      amount: input.targetAmount,
      recipient: input.recipient,
      chainId: input.targetChainId
    };

    return {
      inputs: [orderInput],
      outputs: [orderOutput],
      deadline
    };
  }

  async signOrder(order: Order, signer: any): Promise<SignedOrder> {
    const permit2Contract = new Contract(PERMIT2_ADDRESS, [
      "function DOMAIN_SEPARATOR() view returns (bytes32)",
      "function nonces(address) view returns (uint256)"
    ], this.provider);

    const owner = await signer.getAddress();
    const nonce = await permit2Contract.nonces(owner);
    const domainSeparator = await permit2Contract.DOMAIN_SEPARATOR();

    const tokenPermissions: TokenPermissions[] = order.inputs.map(input => ({
      token: input.token,
      amount: input.amount
    }));

    const permit: PermitBatchTransferFrom = {
      permitted: tokenPermissions,
      nonce,
      deadline: order.deadline
    };

    const permit2Batch: Permit2Batch = {
      permit,
      owner,
      signature: "" // Will be filled by signer
    };

    // Sign the permit
    const permit2BatchType = {
      PermitBatchTransferFrom: [
        { name: "permitted", type: "TokenPermissions[]" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ],
      TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" }
      ]
    };

    const signature = await signer.signTypedData(
      {
        name: "Permit2",
        version: "1",
        chainId: await this.provider.getNetwork().then(n => n.chainId),
        verifyingContract: PERMIT2_ADDRESS
      },
      permit2BatchType,
      permit
    );

    permit2Batch.signature = signature;

    return {
      permit: permit2Batch,
      outputs: order.outputs
    };
  }

  async executeOrder(signedOrder: SignedOrder, signer: any): Promise<TransactionReceipt> {
    const tx = await (this.ordersContract.connect(signer) as any).fillPermit2(
      signedOrder.outputs,
      signedOrder.permit.permit,
      signedOrder.permit.owner,
      signedOrder.permit.signature
    );
    return await tx.wait();
  }

  async executeSwap(input: SwapInput, signer: any): Promise<SwapState> {
    try {
      // Create order
      const order = await this.createOrder(input);

      // Sign order with permit2
      const signedOrder = await this.signOrder(order, signer);

      // Execute order
      const receipt = await this.executeOrder(signedOrder, signer);

      return {
        status: SwapStatus.COMPLETED,
        receipt,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error("Swap execution failed:", error);
      return {
        status: SwapStatus.FAILED,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  // Helper method to check if user has sufficient balance
  async checkBalance(tokenAddress: string, userAddress: string, amount: bigint): Promise<boolean> {
    try {
      if (tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
        // Native ETH
        const balance = await this.provider.getBalance(userAddress);
        return balance >= amount;
      } else {
        // ERC20 token
        const tokenABI = [
          "function balanceOf(address owner) view returns (uint256)"
        ];
        const tokenContract = new Contract(tokenAddress, tokenABI, this.provider);
        const balance = await tokenContract.balanceOf(userAddress);
        return balance >= amount;
      }
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  }

  // Helper method to check token allowance
  async checkAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<bigint> {
    try {
      if (tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
        // Native ETH doesn't need allowance
        return BigInt('999999999999999999999999999999');
      }

      const tokenABI = [
        "function allowance(address owner, address spender) view returns (uint256)"
      ];
      const tokenContract = new Contract(tokenAddress, tokenABI, this.provider);
      return await tokenContract.allowance(ownerAddress, spenderAddress);
    } catch (error) {
      console.error('Error checking allowance:', error);
      return BigInt(0);
    }
  }

  // Helper method to approve token spending
  async approveToken(tokenAddress: string, spenderAddress: string, amount: bigint): Promise<string> {
    try {
      const tokenABI = [
        "function approve(address spender, uint256 amount) returns (bool)"
      ];
      const tokenContract = new Contract(tokenAddress, tokenABI, this.provider);
      const tx = await tokenContract.approve(spenderAddress, amount);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error approving token:', error);
      throw error;
    }
  }
}

export default SignetService;
