# reputation-and-minority-penalty Specification

## Purpose
TBD - created by archiving change sepolia-testing-upgrades. Update Purpose after archive.
## Requirements
### Requirement: Tampilan HP Reputasi di Header RPG Status Bar
Sistem HARUS menampilkan skor reputasi pengguna saat ini dalam bentuk visual HP (Hit Points) pada bar status RPG di header dApp. Skor dasar reputasi adalah 100, dan HARUS direpresentasikan sebagai `HP: [Reputasi]/100`.

#### Scenario: HP Reputasi ditampilkan penuh untuk pengguna baru
- **GIVEN** pengguna baru pertama kali menghubungkan dompet Web3 mereka ke dApp
- **WHEN** header dimuat dan dompet terhubung
- **THEN** sistem menampilkan `HP: 100/100` pada status bar RPG dengan gaya 8-bit retro tanpa ikon panah atau chevron

#### Scenario: HP Reputasi berkurang setelah penalti
- **GIVEN** pengguna memiliki skor reputasi 80 karena mendapatkan penalti minoritas sebelumnya
- **WHEN** pengguna terhubung ke dApp dan status bar memproses datanya
- **THEN** sistem menampilkan status `HP: 80/100`

---

### Requirement: Peringatan Penalti Minoritas pada Halaman Voting
Sistem HARUS menampilkan pesan peringatan retro berwarna kuning/jingga yang memperingatkan pemilih bahwa jika pilihan mereka berada di pihak minoritas setelah konsensus selesai, skor reputasi (HP) mereka akan dikurangi sebesar 10 poin.

#### Scenario: Pemilih melihat peringatan penalti sebelum memberikan suara
- **GIVEN** peserta berada di halaman voting turnamen aktif
- **WHEN** halaman voting dimuat dan peserta bersiap memilih tim pemenang
- **THEN** sistem menampilkan banner teks retro double border: `■ WARNING: MEMILIH DI MINORITAS AKAN MENGURANGI 10 HP REPUTASI ANDA ■`

---

### Requirement: Papan Peringkat (Leaderboard) Reputasi
Sistem HARUS menyediakan halaman atau panel khusus Papan Peringkat (Leaderboard) yang menampilkan daftar peserta dengan reputasi tertinggi (HP) secara real-time dari database.

#### Scenario: Pengunjung melihat papan peringkat reputasi
- **GIVEN** pengunjung berada di halaman dApp
- **WHEN** pengunjung membuka tab atau menu "LEADERBOARD"
- **THEN** sistem menampilkan tabel bergaya retro 8-bit berisi daftar nama samaran gamer tag, alamat dompet ringkas, dan skor HP mereka diurutkan dari yang tertinggi, tanpa ikon panah atau chevron

