## ADDED Requirements

### Requirement: Sistem dapat menerjemahkan nomor telepon atau email menjadi alamat dompet Celo
Sistem HARUS menyediakan endpoint API `/api/social-connect/lookup` yang menerima identifikasi sosial (nomor telepon dengan format internasional atau email) dan mengembalikan alamat dompet Celo 0x yang terasosiasi dari database ODIS mock (`social_mappings`).

#### Scenario: Pencarian email terdaftar sukses
- **GIVEN** data "player@example.com" terdaftar dengan dompet "0x1234567890123456789012345678901234567890" di tabel `social_mappings`
- **WHEN** backend menerima permintaan lookup dengan identifier "player@example.com"
- **THEN** backend mengembalikan status "RESOLVED" dan alamat dompet tersebut

#### Scenario: Pencarian nomor telepon terdaftar sukses
- **GIVEN** data "+6281234567890" terdaftar dengan dompet "0x9876543210987654321098765432109876543210" di tabel `social_mappings`
- **WHEN** backend menerima permintaan lookup dengan identifier "+6281234567890"
- **THEN** backend mengembalikan status "RESOLVED" dan alamat dompet tersebut

#### Scenario: Pencarian tidak terdaftar
- **GIVEN** identifier "unknown@example.com" tidak terdaftar di tabel `social_mappings`
- **WHEN** backend menerima permintaan lookup dengan identifier "unknown@example.com"
- **THEN** backend mengembalikan status "NOT_RESOLVED" dan alamat dompet null

---

### Requirement: Frontend terintegrasi dengan pencarian Social Connect untuk whitelist turnamen invite-only
Antarmuka pembuatan turnamen HARUS menyediakan input pencarian berbasis Social Connect (email/nomor telepon) untuk whitelist turnamen `invite_only`. Jika pencarian berhasil, alamat dompet harus secara otomatis ditambahkan ke roster whitelist.

#### Scenario: Kreator sukses melakukan lookup dan menambahkan peserta ke whitelist
- **GIVEN** kreator berada di formulir pembuatan turnamen dan memilih tipe akses "Private (Invite-Only)"
- **WHEN** kreator memasukkan "player@example.com" dan menekan tombol "■ CARI DAN UNDANG ■"
- **THEN** frontend memanggil API lookup, menyelesaikan alamat dompet "0x1234567890...", menampilkan indikator sukses retro, dan memasukkan alamat dompet tersebut ke dalam daftar whitelist
