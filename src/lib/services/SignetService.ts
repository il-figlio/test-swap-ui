import { JsonRpcProvider, BrowserProvider, Contract, TransactionReceipt } from "ethers";
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
} from "@/lib/types/signet";  // Change from "../types/signet" to "@/lib/types/signet"
import OrdersABI from "@/lib/abi/Orders.json";  // Change from "../abi/Orders.json"
import { CONTRACT_ADDRESSES, getOrdersContract } from "@/lib/constants/contracts";  // Change from "../constants/contracts"

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export class SignetService {
  private static instance: SignetService;
  private provider: JsonRpcProvider | BrowserProvider;
  private ordersContract: Contract;

  static getInstance(provider?: JsonRpcProvider | BrowserProvider): SignetService {
    if (!SignetService.instance && provider) {
      SignetService.instance = new SignetService(provider);
    } else if (!SignetService.instance) {
      throw new Error("SignetService must be initialized with a provider");
    }
    return SignetService.instance;
  }

  constructor(provider: JsonRpcProvider | BrowserProvider) {
    this.provider = provider;
    // Get the orders contract for the rollup chain (default)
    const ordersAddress = getOrdersContract(14174); // Pecorino rollup chain ID
    this.ordersContract = new Contract(ordersAddress, OrdersABI, provider);
  }

  // ... rest of the code from your original paste.txt ...
}

export default SignetService;