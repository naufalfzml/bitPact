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
              <Link href="/" className="bp-logo">
                ■_bP_■
              </Link>
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

          <main className="bp-container" style={{ minHeight: "calc(100vh - 180px)", paddingTop: "32px" }}>
            {children}
          </main>

          <footer className="bp-footer">
            <div className="bp-container">
              <p>■ bitPact © 2026 ■</p>
              <p style={{ marginTop: "8px", fontSize: "0.5rem" }}>
                PIXEL ACCURATE ESCROW • CELO NETWORK • MINIPAY READY
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
