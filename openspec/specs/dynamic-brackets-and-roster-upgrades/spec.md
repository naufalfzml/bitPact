# dynamic-brackets-and-roster-upgrades Specification

## Purpose
TBD - created by archiving change sepolia-testing-upgrades. Update Purpose after archive.
## Requirements
### Requirement: Penghapusan Batasan Peserta Pangkat Dua (2^n)
Sistem HARUS memungkinkan turnamen dibuat dengan jumlah kapasitas peserta bebas (tidak wajib berpangkat dua) pada fase pembuatan. Pembatasan $2^n$ tidak boleh diberlakukan saat registrasi dibuka.

#### Scenario: Turnamen dibuat dengan kapasitas peserta ganjil
- **GIVEN** kreator sedang mengisi formulir pembuatan turnamen baru
- **WHEN** kreator menetapkan kapasitas peserta maksimum sebesar 7 orang dan mengklik tombol buat
- **THEN** turnamen berhasil dibuat dengan kapasitas 7 tanpa adanya kesalahan validasi $2^n$

---

### Requirement: Penjadwalan Sistem "BYE" untuk Peserta Ganjil
Sistem HARUS secara otomatis menghasilkan bagan turnamen eliminasi dengan menyisipkan virtual slot **"BYE"** jika jumlah peserta terdaftar saat pendaftaran ditutup (Lock Roster) berjumlah ganjil. Peserta yang dipasangkan dengan "BYE" secara otomatis lolos ke ronde berikutnya.

#### Scenario: Pendaftaran ditutup dengan 5 peserta
- **GIVEN** turnamen PvP 1v1 memiliki 5 peserta terdaftar: Alice, Bob, Charlie, Dave, Eve
- **WHEN** kreator mengunci roster turnamen (Lock Roster)
- **THEN** sistem menghasilkan 2 matchup Ronde 1 (Alice vs Bob, Charlie vs Dave) dan memberikan status **BYE** untuk Eve, yang langsung dipromosikan ke babak Semi-Final secara otomatis

---

### Requirement: Pembagian Tim Kustom Tidak Seimbang (Asymmetrical Team Sizing)
Pada mode Tim, sistem HARUS mengizinkan pembagian tim secara tidak seimbang jika jumlah peserta terdaftar ganjil, dengan batasan ukuran salah satu tim maksimal tidak boleh melebihi $\lceil N/2 \rceil$ (N dibagi 2 dibulatkan ke atas).

#### Scenario: Pembagian Tim ganjil 3 vs 2
- **GIVEN** ada 5 peserta terdaftar pada turnamen bertipe tim (N = 5)
- **WHEN** turnamen dikunci untuk dimulai dengan mode 2-tim (Tim Merah vs Tim Biru)
- **THEN** sistem membagi peserta secara dinamis menjadi Tim Merah (3 pemain) dan Tim Biru (2 pemain) dan menampilkan visual pengelompokan tim di roster detail turnamen

---

### Requirement: Panel Roster dengan Pengelompokan Visual Tim Retro
Sistem HARUS menampilkan roster peserta turnamen terkelompok berdasarkan tim (Tim A vs Tim B atau Tim Merah vs Tim Biru) dengan gaya visual retro 8-bit yang menggunakan warna latar belakang atau garis tepi retro yang berbeda secara kontras, tanpa menggunakan ikon panah atau chevron.

#### Scenario: Roster menampilkan visual Tim A dan Tim B
- **GIVEN** turnamen bertipe tim telah dikunci dan terbagi menjadi dua tim
- **WHEN** peserta mengunjungi halaman detail turnamen
- **THEN** daftar roster menampilkan dua blok terpisah bergaya piksel retro dengan tajuk `■ TEAM RED ■` (warna merah/pink retro) dan `■ TEAM BLUE ■` (warna biru retro) berisi anggota masing-masing tim

---

### Requirement: Kontrol Kreator Auto-Shuffle vs Manual Fill
Sistem HARUS menyediakan opsi bagi Kreator Turnamen di halaman manajemen untuk mengisi bagan pertandingan secara acak otomatis (**AUTO SHUFFLE**) atau membiarkan bagan kosong agar kreator dapat menyeret/memilih peserta secara manual (**MANUAL INPUT**).

#### Scenario: Kreator memilih Auto Shuffle
- **GIVEN** pendaftaran turnamen telah dikunci (Lock Roster) dan kreator berada di halaman admin turnamen
- **WHEN** kreator menekan tombol **■ AUTO SHUFFLE BRACKETS ■**
- **THEN** sistem memasangkan seluruh peserta secara acak ke dalam bagan pertandingan Ronde 1 dan menyimpannya ke database

#### Scenario: Kreator memilih Manual Input dan Menghapus Peserta
- **GIVEN** bagan turnamen kosong dan kreator berada di halaman admin turnamen
- **WHEN** kreator menekan tombol **■ DELETE PLAYER ■** di samping nama peserta tertentu
- **THEN** peserta tersebut dihapus dari daftar roster dan bagan pertandingan terupdate secara real-time

---

### Requirement: Tombol Close Event / Lock Roster
Sistem HARUS menyediakan tombol **■ LOCK ROSTER ■** bagi kreator turnamen untuk menutup pendaftaran lebih awal secara manual dari status `setup` ke status `active` sebelum bagan pertandingan digenerate.

#### Scenario: Lock Roster berhasil dilakukan oleh kreator
- **GIVEN** turnamen dalam status `setup` dan setidaknya ada 2 peserta terdaftar
- **WHEN** kreator mengklik tombol **■ LOCK ROSTER ■** di panel admin turnamen
- **THEN** sistem mengubah status turnamen menjadi `active`, menutup pendaftaran baru, dan mengunci daftar peserta yang terdaftar di database

---

### Requirement: RPG Status Bar untuk GAS (CELO) dan BAG (cUSD)
Sistem HARUS mengambil dan menampilkan saldo CELO (`GAS`) dan cUSD (`BAG`) pengguna aktif di header status dApp secara dinamis menggunakan modul wallet client.

#### Scenario: Status bar menampilkan saldo dompet yang benar
- **GIVEN** dompet pengguna terhubung dengan saldo 1.5 CELO dan 12.0 cUSD pada jaringan Celo Sepolia
- **WHEN** dApp memuat halaman utama atau halaman event
- **THEN** sistem menampilkan bar status RPG di header berisi `[BAG: 12.00 cUSD]` dan `[GAS: 1.50 CELO]` dengan font monospace retro 8-bit

---

### Requirement: Gamer Tag Otomatis 8-Bit
Sistem HARUS secara otomatis menghasilkan nama samaran (Gamer Tag) bergaya retro 8-bit untuk peserta yang tidak memiliki username kustom di database. Gamer Tag HARUS berformat `PLAYER_` atau `HERO_` diikuti oleh 4 karakter hex terakhir dari alamat dompet mereka.

#### Scenario: Gamer Tag digenerate otomatis
- **GIVEN** peserta dengan alamat dompet `0x003DC53295c2849Aec366F8D07fE5519C5605C19` terdaftar tanpa username
- **WHEN** daftar roster atau leaderboard dimuat di dApp
- **THEN** sistem menampilkan nama peserta sebagai `HERO_5C19` di antarmuka pengguna

