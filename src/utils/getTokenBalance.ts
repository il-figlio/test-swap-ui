import { ethers } from "ethers";

export async function getTokenBalance(tokenAddress: string, userAddress: string, provider: ethers.Provider) {
  const erc20 = new ethers.Contract(tokenAddress, [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ], provider);
  const [balance, decimals] = await Promise.all([
    erc20.balanceOf(userAddress),
    erc20.decimals()
  ]);
  return ethers.formatUnits(balance, decimals);
} 