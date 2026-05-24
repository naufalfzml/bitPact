## MODIFIED Requirements

### Requirement: Kontrol Kreator Auto-Shuffle vs Manual Fill pada Draf Bagan
Sistem HARUS menyediakan opsi bagi Kreator Turnamen di halaman manajemen setelah pendaftaran ditutup (`roster_locked = true`) untuk mengisi bagan draf pertandingan secara acak otomatis (**AUTO SHUFFLE**) atau menyusun draf matchup secara manual (**MANUAL INPUT**) menggunakan dropdown interaktif retro dari daftar pemain terdaftar.

#### Scenario: Kreator memilih Auto Shuffle pada draf bagan
- **GIVEN** turnamen dalam status `setup` dan `roster_locked = true` serta draf bagan kosong telah di-generate
- **WHEN** Kreator menekan tombol **■ AUTO SHUFFLE ■**
- **THEN** sistem secara acak memasangkan seluruh peserta terdaftar ke dalam slot draf bagan Ronde 1 di database secara sementara
- **AND** memperbarui UI draf bagan agar menampilkan nama-nama peserta pada masing-masing slot dropdown secara instan

#### Scenario: Penghapusan Peserta Terdaftar Memperbarui Pilihan Dropdown Draf secara Real-Time
- **GIVEN** turnamen dalam status `setup` dan `roster_locked = false`
- **WHEN** Kreator menekan tombol **■ DEL ■** di samping nama peserta tertentu pada tabel roster
- **THEN** peserta tersebut dihapus dari database peserta turnamen dan opsi dropdown pemilihan draf bracket terupdate secara otomatis saat pendaftaran ditutup nanti
