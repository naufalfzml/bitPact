## ADDED Requirements

### Requirement: Draf Bagan Turnamen Interaktif
Sistem HARUS menyediakan fase draf bagan setelah pendaftaran ditutup, di mana Kreator dapat melihat susunan pertandingan sementara dan melakukan penyusunan manual menggunakan dropdown pilihan peserta yang belum terisi.

#### Scenario: Kreator melihat draf bagan kosong setelah pendaftaran ditutup
- **GIVEN** pendaftaran turnamen telah ditutup secara sukses (`roster_locked = true`)
- **WHEN** Kreator membuka halaman manajemen turnamen
- **THEN** sistem menampilkan bagan kosong dengan tombol dropdown retro pada setiap slot pemain

#### Scenario: Kreator menetapkan pemain secara manual di draf bracket
- **GIVEN** Kreator berada di panel draf bagan turnamen
- **WHEN** Kreator memilih nama peserta "Alice" dari dropdown slot Pemain A untuk Pertandingan 1
- **THEN** sistem mengupdate draf bagan secara lokal dan menandai "Alice" sebagai sudah terisi agar tidak muncul di dropdown slot lain

#### Scenario: Kreator mengacak draf bagan secara otomatis
- **GIVEN** Kreator berada di panel draf bagan turnamen
- **WHEN** Kreator menekan tombol **■ AUTO SHUFFLE ■**
- **THEN** sistem secara acak memasangkan seluruh peserta ke dalam draf bagan tanpa mengaktifkan turnamen secara langsung
