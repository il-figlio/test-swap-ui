export async function submitOrder(order: any) {
  const res = await fetch("https://signet.api/cache", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error("Order submission failed");
  return await res.json();
} 

export async function fetchTokenList() {
  // Replace with actual Signet-supported tokens
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