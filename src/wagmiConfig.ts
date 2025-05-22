import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { pecorinoHost, pecorinoSignet } from "./lib/constants/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Signet Dapp",
  projectId: "346662c852e7d9210749b8c59d4a5ba2",
  chains: [pecorinoHost, pecorinoSignet],
  ssr: false,
});
