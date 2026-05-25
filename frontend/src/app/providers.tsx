"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo, celoAlfajores, celoSepolia } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "bitPact",
  projectId: "a6873523dfdbd96e5eb9816035105e1d", // A generic valid/placeholder Project ID for development
  chains: [celoSepolia, celoAlfajores, celo],
  ssr: true,
});

// MiniPay detection context
interface MiniPayContextType {
  isMiniPay: boolean;
}

const MiniPayContext = createContext<MiniPayContextType>({ isMiniPay: false });

export function useMiniPay() {
  return useContext(MiniPayContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // Detect Opera MiniPay injected provider
    if (typeof window !== "undefined") {
      const ethereum = (window as any).ethereum;
      if (ethereum?.isMiniPay) {
        setIsMiniPay(true);
        console.log("[bitPact] MiniPay browser detected — mobile-first mode activated");
      }
    }
  }, []);

  return (
    <MiniPayContext.Provider value={{ isMiniPay }}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </MiniPayContext.Provider>
  );
}
