// TODO: Replace these with the actual Signet-supported tokens for production use.
export async function fetchTokenList() {
  return [
    {
      address: "0x...signetToken1",
      symbol: "SGT1",
      name: "Signet Token 1",
      decimals: 18,
    },
    {
      address: "0x...signetToken2",
      symbol: "SGT2",
      name: "Signet Token 2",
      decimals: 18,
    },
    // Add more as needed
  ];
} 