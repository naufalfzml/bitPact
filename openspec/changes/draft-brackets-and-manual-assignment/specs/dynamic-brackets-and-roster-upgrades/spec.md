## MODIFIED Requirements

### Requirement: Kontrol Kreator Auto-Shuffle vs Manual Fill
Sistem HARUS menyediakan opsi bagi Kreator Turnamen di halaman manajemen untuk mengisi bagan draf pertandingan secara acak otomatis (**AUTO SHUFFLE**) atau membiarkan bagan draf kosong agar kreator dapat menyusun draf matchup secara manual (**MANUAL INPUT**) menggunakan dropdown interaktif retro.

#### Scenario: Kreator memilih Auto Shuffle
- **GIVEN** pendaftaran turnamen telah ditutup (`roster_locked = true`) dan kreator berada di halaman admin turnamen
- **WHEN** kreator menekan tombol **■ AUTO SHUFFLE BRACKETS ■**
- **THEN** sistem memasangkan seluruh peserta secara acak ke dalam draf bagan pertandingan Ronde 1 secara lokal atau sementara di database

#### Scenario: Kreator memilih Manual Input dan Menghapus Peserta
- **GIVEN** draf bagan turnamen kosong dan kreator berada di halaman admin turnamen
- **WHEN** kreator menekan tombol **■ DELETE PLAYER ■** di samping nama peserta tertentu pada daftar roster
- **THEN** peserta tersebut dihapus dari database peserta turnamen dan opsi dropdown pemilihan draf bracket terupdate secara real-time

---

### Requirement: Tombol Close Event / Lock Roster
Sistem HARUS menyediakan tombol **■ CLOSE SIGNUPS ■** bagi kreator turnamen untuk menutup pendaftaran peserta secara manual. Logika ini akan menetapkan `roster_locked = true` pada turnamen tanpa langsung mengubah status turnamen menjadi `active`, melainkan membuka fase draf penyusunan bagan terlebih dahulu.

#### Scenario: Lock Roster berhasil dilakukan oleh kreator
- **GIVEN** turnamen dalam status `setup` dan setidaknya ada 2 peserta terdaftar
- **WHEN** kreator mengklik tombol **■ CLOSE SIGNUPS ■** di panel admin turnamen
- **THEN** sistem mengubah kolom turnamen `roster_locked = true`, menutup pendaftaran baru bagi peserta, dan membuka panel draf penyusunan bagan pertandingan
