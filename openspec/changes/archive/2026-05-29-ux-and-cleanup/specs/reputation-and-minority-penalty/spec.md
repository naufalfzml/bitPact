## MODIFIED Requirements

### Requirement: Peringatan Penalti Minoritas pada Halaman Voting
Sistem MUST menampilkan pesan peringatan retro pada halaman voting yang menjelaskan
penalti minoritas secara AKURAT: penalti −10 HP reputasi HANYA berlaku bila hasil akhir
konsensus bersifat sepihak (≥85% atau ≤15% setuju) DAN pemilih berada di pihak minoritas.
Teks MUST TIDAK menyiratkan bahwa setiap suara minoritas selalu dikenai penalti, karena
pada hasil 16%–84% tidak ada penalti.

#### Scenario: Pemilih melihat peringatan penalti yang akurat sebelum memberikan suara
- **GIVEN** peserta berada di halaman voting turnamen aktif
- **WHEN** halaman voting dimuat dan peserta bersiap memilih
- **THEN** sistem menampilkan banner peringatan yang menyatakan penalti −10 HP hanya
  berlaku jika hasil akhir ≥85% sepihak dan peserta berada di pihak minoritas

#### Scenario: Teks tidak menjanjikan penalti pada hasil non-sepihak
- **WHEN** banner peringatan ditampilkan
- **THEN** teks MUST TIDAK menyatakan bahwa memilih di minoritas SELALU mengurangi 10 HP
- **AND** teks mencerminkan band penalti aktual (≥85% / ≤15%) yang ditegakkan backend

## ADDED Requirements

### Requirement: Base Penalti Minoritas Dihitung dari HP Ter-regenerasi
Ketika menerapkan penalti minoritas pada resolusi konsensus, sistem MUST menghitung skor
baru dari HP reputasi yang sudah diregenerasi saat ini — `getRegeneratedReputation(addr).current_hp`
— BUKAN dari nilai `reputation_score` baris terakhir yang tersimpan. Skor baru MUST
`Math.max(0, current_hp - 10)`. Regenerasi pasif (yang sudah berjalan sejak penalti
terakhir) TIDAK boleh diabaikan saat menentukan base penalti.

#### Scenario: User yang sudah pulih dikenai penalti dari HP saat ini
- **GIVEN** seorang pemilih pernah turun ke 80 HP namun telah beregenerasi menjadi 100 HP
  saat resolusi
- **WHEN** ia berada di pihak minoritas pada hasil sepihak (≥85%) dan dikenai penalti
- **THEN** base penalti adalah 100 (HP ter-regenerasi) sehingga skor baru tersimpan = 90
- **AND** base BUKAN diambil dari nilai tersimpan lama (80 → 70)

#### Scenario: Penalti tidak menjadikan HP negatif
- **GIVEN** seorang pemilih memiliki HP ter-regenerasi 5
- **WHEN** ia dikenai penalti minoritas −10
- **THEN** skor baru yang tersimpan adalah 0 (di-clamp via `Math.max(0, …)`)
