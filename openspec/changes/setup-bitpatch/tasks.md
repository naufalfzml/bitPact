## 1. Fondasi On-Chain & Kontrak Vault (Foundry)

- [x] 1.1 Inisialisasi proyek Foundry (`forge init`) dengan struktur folder `src/`, `test/`, `script/`
- [x] 1.2 Install dependensi OpenZeppelin contracts untuk IERC20 interface (`forge install OpenZeppelin/openzeppelin-contracts`)
- [x] 1.3 Buat file `src/BitPatchVault.sol` dengan deklarasi state variables: struct EventInfo (creator, ticketPrice, prizePool, distributed, participants[], isRegistered mapping), mapping(bytes32 => EventInfo), admin address, dan cUSD IERC20 token address
- [x] 1.4 Implementasikan constructor yang menerima alamat admin wallet dan alamat token cUSD (IERC20)
- [x] 1.5 Implementasikan modifier `onlyAdmin` untuk membatasi akses fungsi kritis hanya ke backend admin wallet
- [x] 1.6 Implementasikan fungsi `createEvent(bytes32 eventId, uint256 ticketPrice, address creator)` — admin-only, menyimpan metadata event ke mapping
- [x] 1.7 Implementasikan fungsi `register(bytes32 eventId)` — menerima cUSD via ERC20 transferFrom, validasi event ada dan belum terdistribusi, validasi jumlah tepat sesuai ticketPrice, cegah duplikasi registrasi, tambah ke participants array dan increment prizePool
- [x] 1.8 Implementasikan fungsi `distributePrize(bytes32 eventId, address[] memory winners, uint256[] memory shares)` — admin-only, validasi total shares == prizePool, transfer cUSD ke setiap winner, set distributed = true
- [x] 1.9 Implementasikan fungsi `emergencyRefund(bytes32 eventId)` — admin-only, validasi belum distributed, iterasi seluruh participants dan transfer ticketPrice per orang, reset prizePool
- [x] 1.10 Implementasikan fungsi view `getEventInfo(bytes32 eventId)` untuk query data pool, status distribusi, jumlah peserta
- [x] 1.11 Buat file `test/BitPatchVault.t.sol` — test skenario: deposit berhasil, duplikasi registrasi ditolak, jumlah salah ditolak, distributePrize berhasil ke multi winner, non-admin ditolak, emergencyRefund berhasil, refund setelah distribute ditolak
- [x] 1.12 Jalankan test suite lengkap dengan `forge test -vvv` di Anvil local network
- [x] 1.13 Buat deployment script `script/Deploy.s.sol` untuk deploy ke Celo Alfajores testnet dengan konfigurasi alamat cUSD testnet


## 2. Setup Database Supabase (PostgreSQL)

- [x] 2.1 Buat proyek Supabase baru dan konfigurasikan koneksi database
- [x] 2.2 Buat tabel `events` dengan kolom: id (UUID PK), creator_address, title, game_mode ('1v1'/'team'/'ffa'), team_size (default 1), ticket_price (NUMERIC), consensus_threshold (NUMERIC default 51), photo_required (BOOLEAN default false), status ('setup'/'active'/'voting'/'ended'/'disputed'), winners_submitted_at (TIMESTAMP nullable), created_at
- [x] 2.3 Buat tabel `participants` dengan kolom: id (UUID PK), event_id (FK events), wallet_address, team_id (INT nullable), status ('registered'/'eliminated'/'winner'), uploaded_photo_url (TEXT nullable)
- [x] 2.4 Buat tabel `votes` dengan kolom: id (UUID PK), event_id (FK events), voter_address, is_valid (BOOLEAN), created_at
- [x] 2.5 Buat tabel `brackets` dengan kolom: id (UUID PK), event_id (FK events), round (INT), match_index (INT), player_a (TEXT), player_b (TEXT), winner (TEXT nullable), created_at
- [x] 2.6 Buat tabel `reputation_tracking` dengan kolom: id (UUID PK), wallet_address, event_id (FK events), was_minority (BOOLEAN), reputation_score (NUMERIC default 100), created_at
- [x] 2.7 Buat file SQL migration dan verifikasi semua tabel, foreign key, dan default values terbuat dengan benar


## 3. Backend Core API — Setup & Event Management (Express.js)

- [x] 3.1 Inisialisasi proyek Express.js (`npm init`), install dependensi: express, cors, dotenv, @supabase/supabase-js, ethers (atau viem), node-cron
- [x] 3.2 Setup konfigurasi environment variables (.env): SUPABASE_URL, SUPABASE_KEY, ADMIN_PRIVATE_KEY, VAULT_CONTRACT_ADDRESS, CUSD_TOKEN_ADDRESS, CELO_RPC_URL
- [x] 3.3 Buat file koneksi Supabase client (`lib/supabase.js`) dan file koneksi ethers/viem provider + admin wallet signer (`lib/blockchain.js`)
- [x] 3.4 Implementasikan endpoint `POST /api/events` — validasi input (title, game_mode, team_size, ticket_price, photo_required, consensus_threshold), insert ke Supabase, panggil createEvent on-chain via admin wallet, return event ID
- [x] 3.5 Implementasikan endpoint `GET /api/events` — fetch daftar semua events dari Supabase beserta jumlah peserta terdaftar
- [x] 3.6 Implementasikan endpoint `GET /api/events/:id` — fetch detail satu event beserta data peserta, bracket (jika ada), dan status voting

## 4. Backend Core API — Registrasi & Bracket (Express.js)

- [x] 4.1 Implementasikan endpoint `POST /api/events/:id/register` — terima wallet_address dan tx_hash, verifikasi transaksi on-chain (cek deposit cUSD sukses di BitPatchVault), insert participant ke Supabase dengan status 'registered'
- [x] 4.2 Implementasikan endpoint `POST /api/events/:id/start` — validasi event di status 'setup', untuk mode 1v1: validasi jumlah peserta = 2^n, untuk mode team: validasi jumlah peserta kelipatan team_size, ubah status ke 'active'
- [x] 4.3 Implementasikan logika bracket randomization untuk mode 1v1: acak urutan peserta, generate pasangan match round 1 ke tabel brackets
- [x] 4.4 Implementasikan logika team formation untuk mode Team: (a) jika peserta solo, randomisasi ke tim berdasarkan team_size dan assign team_id, (b) jika pre-formed team, validasi jumlah anggota per tim, lalu generate Team vs Team brackets
- [x] 4.5 Implementasikan endpoint `POST /api/events/:id/bracket/advance` — terima match_id dan winner wallet/team, update bracket winner, generate match babak selanjutnya jika diperlukan, tandai yang kalah sebagai 'eliminated'
- [x] 4.6 Implementasikan endpoint `GET /api/events/:id/bracket` — return data bracket lengkap (semua round, match, player, dan winner) untuk visualisasi frontend

## 5. Backend Core API — Photo Audit & Submit Winners (Express.js)

- [x] 5.1 Implementasikan endpoint `POST /api/events/:id/photo` — terima wallet_address dan file gambar, upload ke storage (Supabase Storage atau cloud), simpan URL ke kolom uploaded_photo_url di tabel participants
- [x] 5.2 Implementasikan endpoint `POST /api/events/:id/end` — terima daftar pemenang (untuk FFA: ranked list juara 1, 2, 3; untuk 1v1/Team: pemenang final bracket), validasi photo_required (jika true, cek semua winner punya uploaded_photo_url), update status participants ke 'winner', update event status ke 'voting', set winners_submitted_at = NOW()
- [x] 5.3 Validasi khusus FFA: creator input manual peringkat 1, 2, 3 tanpa bracket, simpan ke participants status

## 6. Backend Core API — Voting Consensus & Dispute (Express.js)

- [x] 6.1 Implementasikan endpoint `POST /api/events/:id/vote` — terima voter_address dan is_valid (true = Setuju, false = Tolak), validasi voter adalah peserta terdaftar, validasi event dalam status 'voting', validasi belum pernah vote, insert ke tabel votes
- [x] 6.2 Implementasikan logika kalkulasi konsensus: hitung persentase Setuju dari total suara masuk (exclude abstain) terhadap consensus_threshold event
- [x] 6.3 Implementasikan trigger setelah voting selesai (semua peserta sudah vote ATAU timeout 24 jam):
  - Jika Setuju >= consensus_threshold: ubah status ke 'ended', panggil distributePrize on-chain via admin wallet
  - Jika Setuju < consensus_threshold DAN bukan 50/50: ubah status ke 'ended', panggil emergencyRefund on-chain
  - Jika tepat 50/50 tie: ubah status ke 'disputed', dana tetap terkunci di contract
- [x] 6.4 Implementasikan endpoint `POST /api/events/:id/appeal` — khusus event status 'disputed', terima revised winner list dari creator, hapus votes sebelumnya, reset status ke 'voting', set ulang winners_submitted_at, buka window voting 24 jam baru
- [x] 6.5 Implementasikan fallback: jika banding kedua masih tie 50/50, default ke emergencyRefund untuk mencegah infinite dispute loop

## 7. Backend Core API — Cron Job & Anti-Troll (Express.js)

- [x] 7.1 Setup node-cron scheduler yang berjalan setiap jam (atau interval yang sesuai)
- [x] 7.2 Implementasikan logika cron: query semua events dengan status 'voting' di mana NOW() - winners_submitted_at >= 24 jam
- [x] 7.3 Untuk setiap event yang timeout: tandai non-voter sebagai abstain, hitung konsensus hanya dari votes yang masuk, trigger distribute atau refund sesuai hasil
- [x] 7.4 Implementasikan Minority Penalty: setelah voting selesai, jika hasil >= 85% consensus di satu arah, query voter minoritas (<= 15%), insert ke tabel reputation_tracking dengan was_minority = true
- [x] 7.5 Implementasikan logika penurunan reputation_score: jika wallet yang sama tercatat was_minority di beberapa event berbeda, kurangi skor reputasi secara kumulatif
- [x] 7.6 Implementasikan endpoint `GET /api/reputation/:wallet` — return skor reputasi wallet tertentu (opsional untuk creator saat screening peserta)


## 8. Frontend Setup & Design System (Next.js)

- [x] 8.1 Inisialisasi proyek Next.js (`npx create-next-app`) dengan TypeScript
- [x] 8.2 Install dependensi Web3: wagmi, viem, @rainbow-me/rainbowkit (versi ringan), dan konfigurasi Celo chain
- [x] 8.3 Desain dan implementasikan design system CSS global: pixel font (e.g. Press Start 2P dari Google Fonts), warna palette retro 8-bit, border-radius: 0px global, box-shadow pixel-style, grid system geometris
- [x] 8.4 Buat komponen dasar reusable: PixelButton (kotak geometris tanpa panah), PixelCard, PixelInput, PixelBadge (status badge), PixelModal — semua tanpa ikon/panah/chevron
- [x] 8.5 Buat layout utama (Header + Content + Footer) dengan navigasi berbasis teks geometris tanpa arrow icons, logo text-free pixel monogram
- [x] 8.6 Konfigurasi MiniPay wallet provider: deteksi injected Celo provider di Opera MiniPay browser, auto-connect wallet on page load

## 9. Frontend Halaman Utama (Next.js)

- [x] 9.1 Buat halaman Homepage/Landing: tampilkan logo pixel monogram, deskripsi singkat platform, tombol geometris untuk "Buat Event" dan "Jelajahi Event"
- [x] 9.2 Buat halaman Event Listing (`/events`): fetch dan tampilkan daftar semua events sebagai grid PixelCard (title, game mode badge, ticket price cUSD, jumlah peserta, status)
- [x] 9.3 Buat halaman Event Creation Form (`/events/create`): form input untuk title, dropdown game_mode (1v1/team/ffa), input team_size (muncul jika team), input ticket_price, toggle photo_required, input consensus_threshold (default 51%), tombol submit
- [x] 9.4 Buat halaman Event Detail (`/events/:id`): tampilkan info event lengkap, daftar peserta, tombol registrasi (dengan flow pembayaran cUSD via MiniPay), dan panel status lifecycle

## 10. Frontend Bracket, Leaderboard & Voting (Next.js)

- [x] 10.1 Buat komponen Tournament Bracket untuk mode 1v1: layout flexbox kotak-kotak yang menunjukkan pasangan match setiap round, connector garis lurus (bukan panah), klik box peserta untuk advance (creator-only)
- [x] 10.2 Buat komponen Tournament Bracket untuk mode Team: tampilkan Team vs Team di setiap match box, koneksi antar round dengan garis geometris
- [x] 10.3 Buat komponen FFA Leaderboard: tabel peringkat geometris menampilkan posisi 1st/2nd/3rd dengan wallet address setelah creator submit ranking
- [x] 10.4 Buat komponen Photo Upload: interface upload gambar untuk peserta winner ketika event memiliki photo_required = true
- [x] 10.5 Buat halaman Voting Konsensus (`/events/:id/vote`): tampilkan daftar pemenang yang diajukan juri/creator, dua tombol kotak besar "Setuju" dan "Tolak", progress bar voting real-time (persentase Setuju vs Tolak)
- [x] 10.6 Buat komponen Dispute/Appeal: tampilkan status disputed pada event, tombol "Ajukan Banding Kedua" (creator-only) dengan form revisi winner list

## 11. Integrasi Frontend-Backend-Contract End-to-End

- [x] 11.1 Integrasikan flow registrasi: frontend memanggil approve cUSD + register on-chain, kemudian POST ke backend /api/events/:id/register
- [x] 11.2 Integrasikan flow creator start event: frontend POST /api/events/:id/start, backend generate bracket, frontend re-fetch dan render bracket
- [x] 11.3 Integrasikan flow creator advance bracket match: frontend POST /api/events/:id/bracket/advance, re-render bracket
- [x] 11.4 Integrasikan flow creator end event + submit winners: frontend POST /api/events/:id/end, backend validasi foto (jika required), transisi ke voting
- [x] 11.5 Integrasikan flow voting: frontend POST /api/events/:id/vote, tampilkan update progress
- [x] 11.6 Integrasikan flow dispute appeal: frontend POST /api/events/:id/appeal, reset voting UI
- [x] 11.7 Verifikasi payout end-to-end: backend memanggil distributePrize/emergencyRefund on-chain, frontend menampilkan status akhir

## 12. Testing & Verifikasi Akhir

- [x] 12.1 Jalankan seluruh unit test smart contract (`forge test -vvv`) dan pastikan semua pass
- [x] 12.2 Test manual flow lengkap 1v1: create event → register 4 peserta → start → advance bracket → end → vote → distribute
- [x] 12.3 Test manual flow lengkap FFA: create event → register peserta → start → end dengan ranking manual → vote → distribute
- [x] 12.4 Test manual flow lengkap Team: create event → register solo peserta → start (random team) → advance team bracket → end → vote → distribute
- [x] 12.5 Test edge case: 50/50 tie → disputed → creator appeal → re-vote → distribute/refund
- [x] 12.6 Test edge case: voting timeout 24 jam → auto-abstain → consensus check
- [x] 12.7 Test edge case: photo_required = true → winner harus upload foto → creator baru bisa submit
- [x] 12.8 Test edge case: emergencyRefund ketika semua vote Tolak → cUSD kembali ke semua peserta
- [x] 12.9 Verifikasi Minority Penalty: setelah high-consensus vote, cek wallet minoritas tercatat di reputation_tracking

## 13. Deployment Testnet & Integrasi Staging

- [x] 13.1 Jalankan skrip migrasi database Supabase dengan menyalin script di `backend/db/schema.sql` dan mengeksekusinya di SQL Editor Supabase Cloud.
- [x] 13.2 Lakukan deployment riil smart contract `BitPatchVault.sol` ke Celo Sepolia Testnet menggunakan wallet deployer yang terdanai, lalu catat alamat kontrak yang dihasilkan.
- [x] 13.3 Buat berkas environment rahasia lokal (`backend/.env` dan `frontend/.env.local`) dan isi dengan kredensial asli (Supabase keys, RPC Celo, alamat kontrak terdeploy, admin wallet address & private key).

## 14. Pengintegrasian & Koordinasi Berkas

- [x] 14.1 Ganti seluruh placeholders alamat kontrak pintar di berkas `README.md` utama dengan alamat asli hasil deployment Sepolia Testnet.

## 15. Pengujian Staging End-to-End (Uji Coba Nyata)

- [ ] 15.1 Jalankan Express API Server di localhost (`http://localhost:3001`) dan verifikasi koneksi backend ke database Supabase Cloud & blockchain Celo Sepolia berjalan tanpa kendala (connection handshakes).
- [ ] 15.2 Hubungkan emulator mobile browser Opera MiniPay lokal ke Next.js dev server, verifikasi dompet MiniPay terdeteksi secara otomatis, dan lakukan approval serta deposit cUSD Sepolia Testnet asli.
- [ ] 15.3 Jalankan satu siklus turnamen PvP penuh secara langsung di testnet: Create Event → Signup Players (dengan transfer cUSD testnet riil) → Creator Start (bracket terbuat) → Advance Bracket → End Tournament → Consensus Voting (24 jam timeout / all vote) → Verifikasi Payout cUSD testnet terdistribusi otomatis di blockchain.
- [ ] 15.4 Lakukan pengujian skenario Minority Penalty secara riil dan periksa apakah skor reputasi di tabel `reputation_tracking` berkurang secara tepat waktu.
