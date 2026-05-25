"use client";

import React, { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { formatEther, formatUnits } from "viem";
import { USDC_TOKEN_ADDRESS, USDC_ABI, API_BASE_URL } from "@/constants";

/**
 * Generate an 8-bit retro gamer tag from a wallet address.
 * Format: HERO_XXXX where XXXX = last 4 hex chars, uppercased.
 */
export function generateGamerTag(address: string): string {
  if (!address || address.length < 6) return "PLAYER_0000";
  const suffix = address.slice(-4).toUpperCase();
  return `HERO_${suffix}`;
}

export default function ConnectButtonClient() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const [reputation, setReputation] = useState<number>(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch CELO native balance
  const { data: celoBalance } = useBalance({
    address: address,
    query: { enabled: !!address && mounted },
  });

  // Fetch USDC token balance
  const { data: usdcRaw } = useReadContract({
    address: USDC_TOKEN_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && mounted },
  });

  // Fetch reputation from backend
  useEffect(() => {
    if (!address || !mounted) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/events/reputation/${address}`);
        if (res.ok) {
          const data = await res.json();
          setReputation(data.reputation_score ?? 100);
        }
      } catch {
        setReputation(100);
      }
    })();
  }, [address, mounted]);

  if (!mounted) {
    return <div style={{ width: "120px", height: "38px" }} />;
  }

  const celoFormatted = celoBalance ? Number(formatEther(celoBalance.value)).toFixed(2) : "0.00";
  const usdcFormatted = usdcRaw ? Number(formatUnits(usdcRaw as bigint, 6)).toFixed(2) : "0.00";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {/* RPG Status Bar — only visible when connected */}
      {isConnected && address && (
        <div className="bp-rpg-status">
          <span className="bp-rpg-hp" title="Reputation Score">
            HP:{reputation}/100
          </span>
          <span className="bp-rpg-bag" title="USDC Balance">
            USDC:{usdcFormatted}
          </span>
          <span className="bp-rpg-gas" title="CELO Balance">
            CELO:{celoFormatted}
          </span>
        </div>
      )}
      <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
    </div>
  );
}
