---

## 📜 Project Overview: bitPact

### 1. Konsep & Identitas Visual

bitPact adalah *Generalized Tournament & Campaign Maker* berbasis Web3 untuk mengubah permainan nyata (*real-life fun/social matches*) menjadi turnamen berhadiah crypto secara aman dan transparan via Opera MiniPay.

* **Tema Estetika:** *Minimalist 8-Bit Retro / Pixel Art*. Antarmuka bersih, minim teks pajangan, mengandalkan tata letak geometris kotak yang tegas.
* **Aturan Identitas:** Logo berupa monogram atau siluet piksel geometris murni tanpa teks (*text-free*). Seluruh elemen UI **sama sekali tidak menggunakan ikon atau bentuk panah (no arrows)** untuk mempertahankan keunikan visual.

### 2. Alur Utama Aplikasi (The Core Loop)

* **Langkah Pertama:** Creator membuat *Event* baru di platform.
* **Langkah Kedua:** Peserta mendaftar dengan membayar tiket menggunakan USDC via MiniPay.
* **Langkah Ketiga:** Creator memulai jalannya *Event* secara resmi.
* **Langkah Keempat:** Peserta menjalankan permainan nyata atau aktivitas sosial di dunia riil.
* **Langkah Kelima:** Creator mengakhiri *Event* dan menginput daftar pemenang ke sistem.
* **Langkah Keenam:** Peserta melakukan voting konsensus secara kolektif terhadap keputusan juri.
* **Langkah Ketujuh:** *Smart Contract* mendistribusikan *Prize Pool* ke dompet pemenang secara otomatis.

---

## 🎮 Matriks Opsi Sistem Permainan (Creator Configuration)

Untuk mengakomodasi kebutuhan PvP (*Player vs Player*) dan *Team Match* secara umum tanpa mengunci jenis permainannya, berikut adalah opsi struktur permainan yang dapat dipilih oleh *Creator* saat membuat *event*:

### Opsi A: Solo PvP (1v1)

* **Konfigurasi Struktur:** Jumlah Peserta harus berjumlah genap atau kelipatan pangkat genap seperti 2^n (Contoh: 4, 8, 16, 32 peserta).
* **Format Turnamen:** Menggunakan sistem *Single Elimination* atau sistem *Best of 3*.
* **Mekanisme Penentuan Bagan:** Sistem mengacak *bracket* 1v1 secara otomatis. *Creator* cukup mengklik nama pemenang di tiap blok bagan untuk menaikkan peserta ke babak berikutnya.
* **Contoh Penggunaan Nyata:** Turnamen game konsol seperti Tekken atau FIFA, kompetisi Catur, adu Panco, hingga permainan sederhana seperti Batu-Gunting-Kertas.

### Opsi B: Team PvP (X vs X)

* **Konfigurasi Struktur:** Ukuran anggota per tim ditentukan langsung oleh *Creator* (Contoh: 2v2, 3v3, 4v4, dst).
* **Format Pendaftaran:** Peserta bisa mendaftar secara individu Solo (kemudian tim diacak oleh sistem) atau mendaftar langsung sebagai *Registered Team* yang sudah utuh.
* **Mekanisme Penentuan Bagan:** Sistem membagi peserta ke dalam slot tim yang tersedia. Bagan turnamen kemudian mempertemukan Tim melawan Tim dalam format eliminasi gugur.
* **Contoh Penggunaan Nyata:** Kompetisi Basket 3v3, permainan Beer Pong 2v2, atau turnamen mini game MOBA mobile di tongkrongan.

### Opsi C: Free-For-All (FFA)

* **Konfigurasi Struktur:** Jumlah total peserta bersifat sangat fleksibel dan tidak terikat aturan genap.
* **Format Turnamen:** Menggunakan sistem *Leaderboard Scoring* atau papan peringkat poin.
* **Mekanisme Penentuan Bagan:** Tidak ada bagan tanding terpisah. Semua peserta bermain bersamaan dalam satu arena atau sesi tunggal. Setelah permainan selesai, *Creator* langsung menunjuk peringkat akhir juara 1, 2, dan 3 secara manual di aplikasi.
* **Contoh Penggunaan Nyata:** Permainan *board games* seperti Monopoli atau Ludo, game balapan seperti Mario Kart, hingga kompetisi lokal seperti lomba makan.

### Opsi Audit Tambahan untuk Creator:

* **Photo Audit Required (True/False):** Jika diset ke opsi *True*, pemenang wajib mengunggah foto bukti kesepakatan skor di akhir game sebelum juri diizinkan menginput hasil.
* **Consensus Threshold:** Persentase minimal suara setuju dari total peserta (default: 51%) untuk mengesahkan keputusan juri agar dana di kontrak pintar bisa cair.

---

## 💾 Desain Database & Smart Contract (Vibe-Coding Specs)

### 1. Skema Database (Supabase / PostgreSQL)

```sql
-- Tabel Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_address TEXT NOT NULL,
    title TEXT NOT NULL,
    game_mode TEXT NOT NULL, -- '1v1', 'team', 'ffa'
    team_size INT DEFAULT 1,
    ticket_price NUMERIC NOT NULL, -- dalam USDC
    photo_required BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'setup', -- 'setup', 'active', 'voting', 'ended', 'disputed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Participants
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    wallet_address TEXT NOT NULL,
    team_id INT DEFAULT NULL,
    status TEXT DEFAULT 'registered', -- 'registered', 'eliminated', 'winner'
    uploaded_photo_url TEXT
);

-- Tabel Votes (Untuk Tahap Konsensus Akhir)
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    voter_address TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL, -- true = setuju juri, false = juri curang
    created_at TIMESTAMP DEFAULT NOW()
);

```

### 2. Arsitektur Smart Contract (BitPatchVault.sol)

Kontrak pintar bertindak sebagai *escrow* pihak ketiga yang buta untuk mengunci dana.

* state variables: Menyimpan *mapping* data dari eventId unik menuju ke total akumulasi dana *pool*, status distribusi hadiah, dan alamat *wallet* kreator.
* function register(bytes32 eventId): Menerima transfer token USDC dari dompet peserta via MiniPay dan menambahkan saldo ke dalam *pool event* tersebut.
* function distributePrize(bytes32 eventId, address[] memory winners, uint256[] memory shares): Hanya bisa dipanggil oleh dompet otoritas *backend* (Express JS) setelah proses voting konsensus mencapai kuorum yang valid. Dana langsung ditransfer otomatis ke dompet para pemenang.
* function emergencyRefund(bytes32 eventId): Mengembalikan dana tiket secara utuh ke seluruh peserta jika hasil voting akhir menyatakan juri berbuat curang atau tidak valid.

---

## 🛠️ Implementation Plan

Rencana eksekusi modular ini dipecah berdasarkan fungsionalitas komponen (*Epics*), bukan waktu kalender, agar kamu bisa fokus menyelesaikan satu fitur utuh sebelum berpindah menggunakan LLM.

### Epic 1: Fondasi On-Chain & Kontrak Vault

* [ ] Tulis *smart contract* BitPatchVault.sol menggunakan Foundry.
* [ ] Buat fungsi utama: *deposit* tiket, *payout* pemenang, dan fungsi *refund* massal.
* [ ] Uji coba logika *escrow* menggunakan *local network* (Anvil) atau Celo Alfajores testnet.

### Epic 2: Backend Core API (Express.js + Supabase)

* [ ] Setup proyek Express.js dan hubungkan ke Supabase Client.
* [ ] Buat *endpoint* POST /api/events untuk pembuatan turnamen dan penyimpanan konfigurasi game (PvP/Team/FFA).
* [ ] Bangun logika penutupan *event* dan penghitungan kalkulasi voting konsensus (POST /api/events/:id/vote).
* [ ] Integrasikan *wallet admin/backend* menggunakan ethers.js atau viem untuk mengeksekusi fungsi distributePrize atau emergencyRefund di *smart contract* berdasarkan hasil akhir rekapan Supabase.

### Epic 3: Frontend & Integrasi MiniPay (Next.js)

* [ ] Bangun UI *layout* berbasis tema kotak geometris 8-bit tanpa panah.
* [ ] Integrasikan koneksi dompet MiniPay menggunakan wagmi/rainbowkit versi ringan yang diinjeksi langsung ke mobile browser Opera.
* [ ] Buat halaman visualisasi *Bagan Turnamen* (*Tournament Bracket* untuk mode 1v1 atau Team) menggunakan komponen berbasis flexbox kotak minimalis.
* [ ] Implementasikan halaman *Voting Konsensus* di mana peserta bisa melihat nama-nama juara pilihan juri dan memilih opsi "Setuju" atau "Tolak".

### Epic 4: Fitur Pengaman & Reputasi (Anti-Troll)

* [ ] Buat skrip *cron job* di Express.js untuk menutup otomatis fase voting jika batas waktu habis.
* [ ] Terapkan sistem **Minority Penalty**: Jika hasil akhir turnamen dinyatakan valid oleh 85% suara, simpan alamat *wallet* 15% peserta minoritas yang menolak ke dalam tabel *tracking* internal Supabase untuk analisis batas toleransi *trolling*.

---

## 🛡️ Penanganan Skenario Kritis (Edge Cases & Mitigation)

Aplikasi *Social-Fi* yang melibatkan kompetisi nyata rentan terhadap tindakan *troll* atau kelalaian pengguna. Sistem harus punya aturan main (*ruleset*) otomatis untuk menangani skenario berikut:

* **Skenario Pertama: Peserta malas melakukan voting konsensus di akhir acara.**
* *Mitigasi:* Menggunakan sistem batas waktu tegas. Jika dalam 24 jam setelah juri memasukkan nama pemenang ada peserta yang tidak melakukan *vote*, sistem *backend* Express.js akan menganggap suara mereka abstain. Kelulusan kuorum kemudian hanya dihitung dari persentase total suara yang masuk saja.


* **Skenario Kedua: Terjadi situasi "Tie" atau seri berimbang pada hasil voting konsensus peserta.**
* *Mitigasi:* Jika hasil voting menunjukkan angka seimbang tepat 50% Setuju dan 50% Tolak, status *event* otomatis bergeser ke status disputed. Dana *pool* akan ditahan sementara di *smart contract* dan tombol "Ajukan Banding Kedua" akan terbuka bagi juri untuk merevisi daftar pemenangnya agar bisa di-vote ulang.


* **Skenario Ketiga: Ada peserta iseng yang selalu menolak keputusan juri secara sengaja (*Trolling*).**
* *Mitigasi:* *Backend* Express.js melacak performa akun lewat database Supabase. Jika seorang *user* terdeteksi memiliki pola anomali secara konstan (selalu memberikan suara minoritas yang melenceng dari kesepakatan massal di berbagai turnamen terpisah), sistem akan otomatis mengurangi nilai bobot reputasi akun tersebut, atau memberikan pembatasan akses masuk ke *private event* berikutnya.


* **Skenario Keempat: Apa yang terjadi jika seluruh peserta kompak memberikan suara "Tolak" karena juri terbukti curang?**
* *Mitigasi:* Kontrak pintar akan mengeksekusi fungsi emergencyRefund. Dana USDC yang tersimpan di dalam *escrow vault* akan langsung dikembalikan secara otomatis ke masing-masing alamat *wallet* peserta asal tanpa potongan, sehingga keamanan dana tetap terjaga secara desentralisasi penuh.
