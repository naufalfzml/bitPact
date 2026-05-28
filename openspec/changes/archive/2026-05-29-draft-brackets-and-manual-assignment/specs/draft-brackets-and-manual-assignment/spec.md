## ADDED Requirements

### Requirement: Batas Kuota Peserta & Penutupan Pendaftaran Progresif
Sistem HARUS memungkinkan Kreator membatasi pendaftaran lewat `max_participants` saat inisialisasi turnamen, dan menyediakan tombol **■ CLOSE SIGNUPS ■** untuk menutup pendaftaran secara manual yang menyetel `roster_locked = true` secara eksklusif.

#### Scenario: Pendaftaran tertutup otomatis ketika kuota Max Participants tercapai
- **GIVEN** turnamen dibuat dengan `max_participants = 4`
- **WHEN** pemain ke-4 berhasil terdaftar di database
- **THEN** sistem menyembunyikan formulir pendaftaran di frontend bagi calon pendaftar berikutnya dan menampilkan pesan kuota penuh

#### Scenario: Kreator menutup registrasi secara manual
- **GIVEN** turnamen dalam fase setup dengan 3 pemain terdaftar
- **WHEN** Kreator mengklik tombol **■ CLOSE SIGNUPS ■**
- **THEN** sistem memanggil API untuk menyetel `roster_locked = true` di database, menutup pendaftaran bagi pemain baru, dan menampilkan opsi pemilihan Game Mode bagi Kreator

---

### Requirement: Pemilihan Game Mode Dinamis Pasca-Kunci Roster
Sistem HARUS menyajikan pilihan format pertandingan kepada Kreator setelah roster pendaftaran dikunci, dan men-generate draf bagan kosong yang disesuaikan dengan game mode terpilih.

#### Scenario: Kreator memilih mode PvP 1v1 untuk draf bagan
- **GIVEN** turnamen dalam status `setup` dan `roster_locked = true`
- **WHEN** Kreator memilih game mode `1v1 PvP Bracket` dan mengklik **■ GENERATE BRACKET DRAFT ■**
- **THEN** sistem memperbarui kolom `game_mode = '1v1'` pada database turnamen dan menghasilkan bagan draf kosong untuk pertandingan Ronde 1

---

### Requirement: Pengisian Draf Bagan & Finalisasi Turnamen
Sistem HARUS menyediakan konsol interaktif di mana Kreator dapat memilih pemain secara manual via dropdown select retro pada draf bagan atau mengklik **■ AUTO SHUFFLE ■**, lalu memfinalisasinya dengan tombol **■ START EVENT ■**.

#### Scenario: Pemilihan pemain manual pada slot draf bagan
- **GIVEN** draf bagan kosong dihasilkan untuk 4 peserta
- **WHEN** Kreator memilih nama peserta "Alice" dari dropdown slot Pertandingan 1 Pemain A
- **THEN** sistem memperbarui bagan draf secara lokal dan menyembunyikan "Alice" dari dropdown slot Pemain B atau slot Pertandingan 2
- **AND** Kreator mengklik **■ START EVENT ■** untuk memfinalisasi bagan tersebut dan mengubah status turnamen menjadi `active`
