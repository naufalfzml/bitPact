# 🛠️ Developer Setup & Celo MCP Integration

Dokumen ini berisi panduan langkah-demi-langkah bagi pengembang (*developer*) untuk memasang, mengonfigurasi, menguji, dan mendeploy ekosistem **bitPatch** secara lokal maupun ke testnet, serta cara mengintegrasikan **Celo MCP Server** untuk asisten pemrograman AI.

---

## 📋 Persyaratan Sistem (Prerequisites)

Sebelum memulai, pastikan perangkat Anda sudah terinstall komponen berikut:
* **Node.js** (LTS v18 atau v20 ke atas) & **npm**.
* **Foundry** (Untuk kompilasi & pengujian smart contract Solidity).
  - Pemasangan: `curl -L https://foundry.paradigm.xyz | bash` lalu jalankan `foundryup`.
* **Supabase CLI** atau akses ke akun **Supabase Cloud Dashboard**.
* **Python v3.11 atau lebih tinggi** (Hanya diperlukan untuk Celo MCP Server).

---

## 🏗️ 1. Setup Lokal & Langkah Menjalankan Aplikasi

Struktur repositori proyek terbagi menjadi 3 komponen utama. Jalankan secara berurutan:

### Langkah A: Smart Contracts (Foundry)
1. Buka folder smart contract (misal `/contracts` atau folder root Foundry):
   ```bash
   # Kompilasi smart contract
   forge build
   
   # Menjalankan pengujian lokal
   forge test
   
   # Menjalankan local blockchain node (Anvil)
   anvil
   ```
2. Catat alamat wallet buatan Anvil ke-1 (sebagai creator) dan ke-2 (sebagai backend admin).

### Langkah B: Backend API (Express.js)
1. Masuk ke folder backend, install dependensi, dan jalankan dev server:
   ```bash
   cd backend/
   npm install
   npm run dev
   ```
2. Pastikan port API berjalan default di `http://localhost:3001`.

### Langkah C: Frontend Web3 (Next.js)
1. Masuk ke folder frontend, pasang dependensi, dan jalankan server pengembangan:
   ```bash
   cd frontend/
   npm install
   npm run dev
   ```
2. Buka di mobile browser emulator pada `http://localhost:3000`.

---

## 💾 2. Konfigurasi Environment Variables (.env)

Buat file `.env` di masing-masing folder dengan konfigurasi sebagai berikut:

### Backend Configuration (`backend/.env`)
```env
PORT=3001
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_WALLET_PRIVATE_KEY=0x_kunci_privat_dompet_admin_backend_anda
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org/
VAULT_CONTRACT_ADDRESS=0x_alamat_kontrak_vault_terdeploy
```

### Frontend Configuration (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org/
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x_alamat_kontrak_vault_terdeploy
```

---

## 🚀 3. Panduan Deployment

### A. Deploy Smart Contract ke Celo Alfajores Testnet
Gunakan Forge dari Foundry untuk mendeploy kontrak `BitPatchVault.sol` langsung ke jaringan uji Celo Alfajores:

```bash
forge create --rpc-url https://forno.celo-sepolia.celo-testnet.org/ \
  --private-key 0x_kunci_privat_deployer_anda \
  src/BitPatchVault.sol:BitPatchVault \
  --constructor-args "0x2F27dB654e38b456C9C7B650F89Ec487Cc4C8354" "0x_alamat_admin_backend"
```
*Catatan:* Argumen pertama adalah alamat resmi token cUSD di Celo Sepolia Testnet (`0x2F27dB654e38b456C9C7B650F89Ec487Cc4C8354`), dan argumen kedua adalah dompet admin backend Anda.

### B. Deploy Database ke Supabase Cloud
1. Masuk ke akun dashboard Supabase Anda.
2. Buka menu **SQL Editor**, buat query baru, lalu tempel (*paste*) script SQL DDL lengkap yang ada di berkas [DATABASE.md](file:///Users/ibanana/Documents/coding/coding_my/web3/celo-workshop/workshop-project/docs/DATABASE.md).
3. Klik **Run** untuk menginisiasi seluruh tabel beserta indeks optimasinya secara instan.

---

## 🔗 4. Integrasi Celo MCP Server untuk AI Assistant

**Celo MCP (Model Context Protocol)** memungkinkan asisten AI coding (seperti Antigravity) untuk terhubung langsung ke jaringan Celo guna memantau saldo cUSD, mengestimasi gas, memanggil fungsi baca smart contract, dan mengaudit riwayat transaksi langsung dari dalam editor IDE Anda secara real-time.

### Langkah A: Instalasi Celo MCP
Instal paket Celo MCP menggunakan `pipx` atau `pip` secara global di komputer Anda:

```bash
# Instal pipx jika belum ada
pip install pipx
pipx ensurepath

# Instal celo-mcp secara global
pipx install celo-mcp
```

### Langkah B: Konfigurasi Custom RPC (Opsional)
Secara default, MCP terhubung ke Celo Mainnet. Set variabel environment berikut di terminal Anda untuk menghubungkannya ke Testnet Alfajores:
```bash
export CELO_TESTNET_RPC_URL="https://forno.celo-sepolia.celo-testnet.org/"
```

### Langkah C: Integrasi dengan IDE (Cursor / VS Code)
Masukkan konfigurasi JSON berikut ke dalam berkas pengaturan MCP IDE Anda agar AI asisten dapat memanggil fungsi perkakas Celo:

* **VS Code (`~/.vscode/mcp.json`)** atau **Cursor (`~/.cursor/mcp.json`)**:
```json
{
  "mcpServers": {
    "celo-mcp": {
      "command": "uvx",
      "args": ["--refresh", "celo-mcp"]
    }
  }
}
```

Setelah terpasang, asisten AI pemrograman Anda secara otomatis memiliki kekuatan untuk membaca status on-chain turnamen bitPatch langsung saat Anda sedang melakukan *pair programming* dengannya!
