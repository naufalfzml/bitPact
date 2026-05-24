## Why

Berdasarkan hasil pengujian lokal pada Celo Sepolia Testnet, ditemukan beberapa celah logika penting dan peluang peningkatan UX untuk mendukung bitPact menjadi platform manajemen turnamen esports Web3 yang matang. Celah krusial meliputi pendaftaran off-chain yang sukses meski transaksi on-chain gagal, kebuntuan (*hang*) sistem konsensus jika ada peserta yang golput/abstain, tidak adanya representasi pembagian tim di roster, serta batasan jumlah peserta ($2^n$) yang terlalu ketat. Pembaruan ini diperlukan untuk meningkatkan keandalan transaksi blockchain, keadilan konsensus, fleksibilitas manajemen bracket, serta estetika visual retro 8-bit.

## What Changes

Pembaruan ini akan membawa perubahan dan kemampuan baru sebagai berikut:
- **cUSD Standardisation**: Menstandardisasi seluruh istilah mata uang di UI frontend menjadi **cUSD** secara konsisten.
- **On-Chain Receipt Validation**: Memperketat registrasi turnamen dengan mewajibkan verifikasi *transaction receipt* di sisi frontend (menunggu transaksi mined) dan di sisi backend sebelum data peserta di-insert ke database.
- **Dynamic Brackets & Flexible PvP/Team Modes**: Menghilangkan batasan peserta $2^n$ saat pembuatan turnamen. Mode pertandingan dan bagan baru digenerate saat event di-close. Sistem bracket otomatis mendukung status **"BYE"** untuk peserta ganjil, serta pembagian **Tim Custom** yang tidak seimbang (maksimal salah satu tim berukuran $n/2$ dibulatkan ke atas).
- **Consensus Force-Resolve**: Menyediakan tombol **■ DISTRIBUTE PRIZE ■** di panel creator untuk mencairkan hadiah escrow jika kuorum voting minimum (>51%) telah terpenuhi secara matematis, tanpa perlu menunggu 100% peserta memberikan suara.
- **Visual Team & Whitelist Feedback**: Mengelompokkan pendaftar berdasarkan tim (Team A/Team B) dengan warna retro visual berbeda di roster, serta memberikan banner retro hijau **`■ ANDA TERDAFTAR DI WHITELIST ■`** bagi peserta yang diundang pada turnamen *invite-only*.
- **RPG Status Bar**: Menampilkan panel status di header dApp yang berisi **`HP (Reputasi)`**, **`BAG (Saldo cUSD)`**, dan **`GAS (Saldo CELO)`**.
- **8-Bit Gamer Tag**: Menghasilkan nama samaran 8-bit otomatis (misal: `PLAYER_5C19` atau `HERO_5C19`) untuk peserta yang menggunakan alamat dompet biasa agar sesuai estetika retro.

## Capabilities

### New Capabilities
- `reputation-and-minority-penalty`: Integrasi antarmuka reputasi pemain (HP), penegakan peringatan penalti minoritas pada halaman voting, dan papan peringkat (leaderboard) reputasi pemain tepercaya.
- `dynamic-brackets-and-roster-upgrades`: Logika bracket fleksibel ganjil (BYE), pembagian tim custom tidak seimbang, panel kontrol bagan (auto-shuffle vs manual fill, delete/clear player), tombol close event (Lock Roster), dan RPG status bar saldo.

### Modified Capabilities
- `event-access-control`: Menyediakan visual feedback whitelist pendaftaran turnamen *invite-only* serta validasi *transaction receipt* on-chain yang ketat.

## Impact

- **Frontend**: 
  - `src/app/page.tsx` (Status bar, Search & Filter turnamen, standardisasi cUSD).
  - `src/app/events/[id]/page.tsx` (Lock Roster, ConnectButtonClient, visual tim roster, banner whitelist, status bar saldo, input bagan manual vs auto).
  - `src/app/components/ConnectButtonClient.tsx` (Visualisasi status bar RPG).
  - `src/constants/index.ts` (Validasi ABI dan cUSD token Sepolia).
- **Backend**:
  - `routes/events.js` (Fungsi `/register` dengan validasi receipt on-chain, `/distribute` dengan manual trigger, logika generate bracket ganjil & custom team size).
  - `lib/blockchain.js` (Pembaruan `targetChain` default ke `celoSepolia`).
- **Database**:
  - Tabel `participants`: Tambah kolom `username` (opsional untuk gamer tag kustom).
