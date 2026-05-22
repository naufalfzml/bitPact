# 🎮 Game Modes & Bracket Logic

Dokumen ini menjelaskan spesifikasi aturan sistem permainan (*Creator configurations*), pembatasan parameter matematis, serta algoritma pembuatan bagan turnamen (*bracket generation*) untuk platform **bitPatch**.

---

## 🆚 Perbandingan Opsi Mode Game

bitPatch mendukung 3 mode permainan utama yang fleksibel untuk mengakomodasi segala jenis permainan fisik maupun sosial di dunia nyata:

| Aturan / Fitur | Opsi A: Solo PvP (1v1) | Opsi B: Team PvP (X vs X) | Opsi C: Free-For-All (FFA) |
|---|---|---|---|
| **Batasan Jumlah Peserta** | Wajib kelipatan pangkat genap ($2^n$) | Wajib kelipatan pangkat genap dari jumlah tim ($2^n$ tim) | Bebas (fleksibel) |
| **Model Struktur Bagan** | Bagan Tunggal *Single Elimination* | Bagan Kelompok *Single Elimination* | Tanpa Bagan (Leaderboard Tunggal) |
| **Metode Pendaftaran** | Individu (Solo) | Individu (Acak) atau Tim Terdaftar | Individu (Solo) |
| **Penentuan Pemenang** | Klik pemenang per kotak tanding | Klik pemenang tim per kotak tanding | Input peringkat juara 1, 2, 3 secara manual |
| **Gaya Permainan Real-life** | Catur, FIFA/Tekken, Panco, Batu-Gunting-Kertas | Basket 3v3, Beer Pong 2v2, Mobile Legends 5v5 | Monopoli, Balap Mario Kart, Lomba Makan |

---

## 🥊 Opsi A: Solo PvP (1v1)

Mode ini mempertandingkan satu individu melawan satu individu lainnya secara berguguran.

### 1. Validasi Jumlah Peserta ($2^n$)
Sebelum Creator diizinkan mengklik **Start Event**, sistem backend Express.js akan memeriksa apakah jumlah peserta terdaftar memenuhi rumus matematika berikut:
$$N = 2^n \quad \text{di mana } n \in \{1, 2, 3, 4, 5, \dots\}$$
Contoh batas jumlah peserta yang valid: **2, 4, 8, 16, 32, atau 64 peserta**. Jika jumlah peserta tidak genap $2^n$ (misal: 7 peserta), tombol "Start Event" akan diblokir oleh frontend dan backend.

### 2. Algoritma Pembuatan Bracket (Babak 1)
Ketika event dimulai:
1. Sistem mengambil array alamat dompet peserta terdaftar dari Supabase.
2. Melakukan pengacakan (*Fisher-Yates Shuffle*) untuk keadilan penentuan bagan.
3. Membagi array ke dalam pasangan tanding di babak 1:
   - Kotak Match 0: Peserta `shuffle[0]` vs `shuffle[1]`
   - Kotak Match 1: Peserta `shuffle[2]` vs `shuffle[3]`
   - Kotak Match $i$: Peserta `shuffle[2i]` vs `shuffle[2i+1]`
4. Menyimpan data hasil pembagian bagan ini ke tabel `brackets` dengan status `'pending'` (kecuali Babak 1 diatur langsung ke `'active'`).

### 3. Logika Kenaikan Babak (Bracket Progression)
Ketika Creator (Juri) mengeklik salah satu nama peserta sebagai pemenang di Babak $r$ pada kotak Match $m$:
* Peserta tersebut otomatis naik ke **Babak $r+1$**.
* Penempatan kotak Match di babak berikutnya dihitung dengan rumus pembagian genap:
$$\text{Next Match Index} = \lfloor \frac{m}{2} \rfloor$$
* Jika $m$ adalah angka genap ($m \pmod 2 = 0$), pemenang diletakkan di slot `player1_address` kotak berikutnya.
* Jika $m$ adalah angka ganjil ($m \pmod 2 \neq 0$), pemenang diletakkan di slot `player2_address` kotak berikutnya.

---

## 👥 Opsi B: Team PvP (X vs X)

Mode ini mempertemukan tim beranggotakan $X$ orang melawan tim lawan dengan ukuran sama.

### 1. Konfigurasi Pembentukan Tim
Saat turnamen dibuat, Creator menetapkan ukuran anggota per tim (`team_size`). Pendaftaran mendukung 2 metode penggabungan:
* **Solo Shuffled Team:** Peserta mendaftar secara individu. Pada saat turnamen dimulai, sistem backend akan mengocok seluruh alamat pendaftar dan membagi mereka ke dalam kelompok-kelompok tim sebesar `team_size` secara acak, kemudian memberikan mereka ID kelompok `team_id`.
* **Registered Team:** Pendaftar langsung bergabung secara berkelompok yang sudah lengkap memenuhi kuota `team_size` (misal 3v3).

### 2. Aturan Bagan Tim
Mirip dengan mode 1v1, total jumlah Tim yang terbentuk wajib memenuhi kuota pangkat genap $2^n$ tim (misalnya 4 tim, 8 tim, dst). Algoritma pengacakan bagan tanding mempertemukan Tim vs Tim, dan pemenang tim akan melaju ke babak berikutnya berdasarkan skor kolektif yang dimasukkan juri.

---

## 🏆 Opsi C: Free-For-All (FFA)

Mode ini didesain untuk turnamen kasual yang dimainkan secara massal atau simultan tanpa bagan eliminasi terpisah.

### 1. Fleksibilitas Jumlah Peserta
Tidak ada aturan matematika $2^n$. Turnamen dapat diikuti oleh 3, 5, 9, atau 27 peserta sekaligus.

### 2. Logika Penentuan Juara & Papan Skor (Leaderboard)
* **Tanpa Bagan Eliminasi:** Seluruh peserta terdaftar langsung dimasukkan ke dalam papan peringkat tunggal dengan status aktif.
* **Input Juara Manual:** Setelah permainan nyata berakhir di dunia riil, Creator mengklik menu leaderboard dan secara manual mengurutkan siapa yang menempati peringkat **Juara 1**, **Juara 2**, dan **Juara 3** (atau peringkat di bawahnya).
* **Proporsi Pembagian Hadiah (Shares):** Creator menentukan persentase proporsi pembagian cUSD prize pool untuk masing-masing juara, dengan syarat total akumulasi unit wei dari proporsi tersebut harus tepat **100%** dari saldo terkunci.
  - *Contoh:* Juara 1 mendapat 60%, Juara 2 mendapat 30%, Juara 3 mendapat 10%.
