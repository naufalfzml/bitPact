import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";
import ConnectButtonClient from "./components/ConnectButtonClient";

export const metadata: Metadata = {
  title: "bitPact | 8-Bit Web3 Tournaments on Celo",
  description: "A premium 8-bit retro gaming tournament platform. Hold escrows, manage PvP brackets, vote on consensus, and pay in USDC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="bp-header">
            <div className="bp-header-inner">
              <div className="bp-header-brand">
                <Link href="/" className="bp-logo">
                  <span className="bp-logo-mark">■</span>
                  <span>_bP_</span>
                  <span className="bp-logo-mark">■</span>
                </Link>
                <p className="bp-header-tagline">
                  Retro escrow tournaments with clearer roles for players, creators, and live ops.
                </p>
              </div>
              <nav className="bp-nav">
                <Link href="/" className="bp-nav-link">
                  Home
                </Link>
                <Link href="/events/create" className="bp-nav-link">
                  Create
                </Link>
              </nav>
              <div>
                <ConnectButtonClient />
              </div>
            </div>
          </header>

          <main className="bp-main">
            <div className="bp-container">{children}</div>
          </main>

          <footer className="bp-footer">
            <div className="bp-container">
              <div className="bp-footer-copy">
                <div>
                  <strong>■ bitPact © 2026 ■</strong>
                  <p className="bp-mt-sm">Tournament escrow, bracket flow, and consensus payout on Celo.</p>
                </div>
                <p className="bp-footer-note">
                  PIXEL ACCURATE ESCROW
                  <br />
                  CELO NETWORK
                  <br />
                  MINIPAY READY
                </p>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
