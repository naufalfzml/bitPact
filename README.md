# ■ bitPatch — 8-Bit Web3 Tournaments on Celo ■

bitPatch adalah platform turnamen terdesentralisasi (greenfield) dengan estetika retro 8-bit murni yang dikembangkan untuk Opera MiniPay di jaringan blockchain Celo. Platform ini memungkinkan pembuatan turnamen nyata (real-life matches) seperti PvP 1v1, Team Matches, atau Free-For-All (FFA) dengan escrow hadiah cUSD yang sepenuhnya aman, otomatis, dan transparan berbasis konsensus pemain.

---

## 🛠️ Alamat-Alamat Kontrak & Konfigurasi Jaringan (Contract Addresses)

Untuk mempermudah koordinasi, berikut adalah alamat token dan smart contract resmi yang terkonfigurasi di ekosistem bitPatch:

### 1. Token cUSD (Stablecoin Celo)
* **Celo Sepolia / Alfajores Testnet (Official standard)**: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
* **Alternative Sepolia Testnet Address**: `0x2F27dB654e38b456C9C7B650F89Ec487Cc4C8354`

### 2. bitPatch Vault Smart Contract (`BitPatchVault.sol`)
* **Fungsi**: Escrow buta (blind escrow) untuk menampung deposit tiket masuk cUSD peserta, mendistribusikan hadiah ke multi-pemenang, atau memicu pengembalian dana darurat (emergency refund) 100% jika suara konsensus menolak keputusan juri.
* **Alamat Kontrak**: Dikonfigurasi dalam environment variable backend (`VAULT_CONTRACT_ADDRESS`) dan frontend (`NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS`) setelah deployment dilakukan menggunakan script Foundry.

### 3. Backend Admin Wallet
* **Alamat Dompet**: Dikonfigurasi menggunakan private key rahasia backend (`ADMIN_WALLET_PRIVATE_KEY`). Wallet ini membiayai seluruh transaksi gas on-chain Celo untuk fungsi-fungsi kritis juri/admin sehingga pengguna mendapatkan pengalaman bebas biaya transaksi gas (gasless creation & payouts).

---

## 🏗️ Struktur & Tumpukan Teknologi (Tech Stack)

Proyek ini terbagi menjadi tiga sub-direktori utama yang sangat rapi:

* **`/contracts` (Solidity & Foundry)**:
  * Smart contract `BitPatchVault.sol` untuk blind escrow cUSD.
  * Unit test suite fungsional penuh di `BitPatchVault.t.sol` (**21/21 passed**).
* **`/backend` (Express.js & Supabase)**:
  * REST API server untuk pendaftaran, inisialisasi tanding, dynamic brackets generator, foto audit, appeal, dan monitoring status.
  * Node-cron schedule task untuk auto-abstain 24 jam dan penyelesaian konsensus otomatis.
  * Tabel-tabel relasional Supabase PostgreSQL (`events`, `participants`, `votes`, `brackets`, `reputation_tracking`).
* **`/frontend` (Next.js, Wagmi & RainbowKit)**:
  * Konsol Web3 premium bertema retro 8-bit dengan *Press Start 2P* font.
  * **100% mematuhi aturan strict tanpa ikon panah/chevron** (menggunakan visual grid, slider, dan connector garis lurus).
  * Terintegrasi dengan deteksi wallet otomatis (MiniPay-ready).

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Inisiasi Smart Contract (Foundry)
```bash
cd contracts
forge build
forge test -vvv
```

### 2. Inisiasi Database & Backend API
1. Buat database baru di Supabase Cloud Dashboard.
2. Salin isi berkas DDL SQL di [`backend/db/schema.sql`](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/backend/db/schema.sql) dan eksekusi di menu **SQL Editor** Supabase.
3. Buat berkas `backend/.env` mengikuti `backend/.env.example`.
4. Jalankan server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

### 3. Inisiasi Frontend Web3 Next.js
1. Buat berkas `frontend/.env.local` mengikuti panduan di `docs/SETUP.md`.
2. Jalankan console:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Buka peramban lokal Anda di `http://localhost:3000`.

---

## 📜 Panduan Lengkap Dokumentasi (Documentation Suite)

Seluruh spesifikasi arsitektur teknis lengkap bitPatch telah didokumentasikan secara rinci di direktori `/docs`:
* [**`docs/README.md`**](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/README.md) - Pintu gerbang indeks dokumentasi.
* [**`docs/ARCHITECTURE.md`**](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/ARCHITECTURE.md) - Diagram Mermaid sekuensial & mesin state.
* [**`docs/SMART-CONTRACT.md`**](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/SMART-CONTRACT.md) - Referensi API smart contract.
* [**`docs/DATABASE.md`**](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/DATABASE.md) - Skema DDL tabel Supabase.
* [**`docs/API.md`**](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/API.md) - Spesifikasi endpoint REST API backend.
* [**`docs/GAME-MODES.md`**](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/GAME-MODES.md) - Algoritma penentuan bagan bracket 1v1 & Team.
* [**`docs/CONSENSUS.md`**](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/CONSENSUS.md) - Aturan konsensus kuorum & reputasi Minority Penalty.
* [**`docs/SETUP.md`**](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/SETUP.md) - Panduan instalasi dan Celo MCP Server integration.
