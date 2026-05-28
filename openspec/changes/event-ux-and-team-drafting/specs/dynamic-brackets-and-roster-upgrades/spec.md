## MODIFIED Requirements

### Requirement: Pembagian Tim Kustom Tidak Seimbang (Asymmetrical Team Sizing)
Pada mode Tim, sistem MUST mengizinkan pembagian tim secara tidak seimbang jika jumlah peserta terdaftar ganjil, dengan batasan ukuran salah satu tim maksimal tidak boleh melebihi $\lceil N/2 \rceil$ (N dibagi 2 dibulatkan ke atas). Penamaan tim yang ditampilkan MUST memakai label 1-based "Team 1" dan "Team 2" (dipetakan dari `team_id` 0 dan 1).

#### Scenario: Pembagian Tim ganjil 3 vs 2
- **GIVEN** ada 5 peserta terdaftar pada turnamen bertipe tim (N = 5)
- **WHEN** turnamen dikunci untuk dimulai dengan mode 2-tim (Team 1 vs Team 2)
- **THEN** sistem membagi peserta secara dinamis menjadi Team 1 (3 pemain) dan Team 2 (2 pemain) dan menampilkan visual pengelompokan tim di roster detail turnamen

### Requirement: Panel Roster dengan Pengelompokan Visual Tim Retro
Sistem MUST menampilkan roster peserta turnamen terkelompok berdasarkan tim dengan gaya visual retro 8-bit yang menggunakan warna latar belakang atau garis tepi retro yang berbeda secara kontras, tanpa menggunakan ikon panah atau chevron. Label tim yang ditampilkan MUST seragam dengan bracket board, memakai 1-based "Team 1"/"Team 2" yang dipetakan dari `team_id` 0/1 dan token bracket `team-0`/`team-1`.

#### Scenario: Roster menampilkan visual Team 1 dan Team 2
- **GIVEN** turnamen bertipe tim telah dikunci dan terbagi menjadi dua tim
- **WHEN** peserta mengunjungi halaman detail turnamen
- **THEN** daftar roster menampilkan dua blok terpisah bergaya piksel retro dengan tajuk `■ TEAM 1 ■` dan `■ TEAM 2 ■` berisi anggota masing-masing tim

#### Scenario: Label tim konsisten antara roster dan bracket
- **GIVEN** turnamen bertipe tim sudah aktif dengan match `team-0` vs `team-1`
- **WHEN** peserta melihat roster dan bracket board pada halaman detail
- **THEN** keduanya menampilkan label yang sama, yaitu "Team 1" untuk `team_id 0`/`team-0` dan "Team 2" untuk `team_id 1`/`team-1`
- **AND** tidak ada lagi label "TEAM RED"/"TEAM BLUE" maupun "TEAM-0"/"TEAM-1"

### Requirement: Kontrol Kreator Auto-Shuffle vs Manual Fill
Sistem MUST menyediakan opsi bagi Kreator Turnamen di halaman manajemen untuk mengisi bagan pertandingan secara acak otomatis (**AUTO SHUFFLE**) atau membiarkan bagan kosong agar kreator dapat menyeret/memilih peserta secara manual (**MANUAL INPUT**). Untuk mode Tim, sistem MUST pula menyediakan penetapan tim secara manual (memilih tim tiap peserta) maupun acak otomatis. Saat memulai turnamen mode Tim, sistem MUST menghormati penetapan tim manual yang sudah tersimpan dan hanya melakukan pengacakan otomatis bila belum ada penetapan tim.

#### Scenario: Kreator memilih Auto Shuffle
- **GIVEN** pendaftaran turnamen telah dikunci (Lock Roster) dan kreator berada di halaman admin turnamen
- **WHEN** kreator menekan tombol **■ AUTO SHUFFLE BRACKETS ■**
- **THEN** sistem memasangkan seluruh peserta secara acak ke dalam bagan pertandingan Ronde 1 dan menyimpannya ke database

#### Scenario: Kreator memilih Manual Input dan Menghapus Peserta
- **GIVEN** bagan turnamen kosong dan kreator berada di halaman admin turnamen
- **WHEN** kreator menekan tombol **■ DELETE PLAYER ■** di samping nama peserta tertentu
- **THEN** peserta tersebut dihapus dari daftar roster dan bagan pertandingan terupdate secara real-time

#### Scenario: Penetapan tim manual mode Tim
- **GIVEN** mode Tim dipilih dan roster terkunci
- **WHEN** kreator menetapkan tiap peserta ke "Team 1" atau "Team 2" lewat dropdown lalu menyimpan
- **THEN** `team_id` tiap peserta tersimpan sesuai pilihan (Team 1 → 0, Team 2 → 1)
- **AND** saat turnamen dimulai, pembagian tim mengikuti penetapan manual tersebut tanpa diacak ulang

#### Scenario: Auto-assign tim acak mode Tim
- **GIVEN** mode Tim dipilih dan roster terkunci, belum ada penetapan tim manual
- **WHEN** kreator menekan tombol acak tim otomatis (atau langsung memulai turnamen)
- **THEN** sistem membagi peserta ke dua tim secara acak (`ceil(N/2)` ke Team 1) dan menyimpan `team_id`
