## ADDED Requirements

### Requirement: Create Event hanya tipe akses privat
Form Create Event MUST hanya menawarkan tipe akses privat: `password` dan
`invite_only`. Opsi "Public" MUST dihapus dari form. Default tipe akses MUST
`password`. UI MUST TIDAK pernah mengirim `access_type: "public"` saat membuat
event baru.

#### Scenario: Opsi Public tidak tersedia
- **WHEN** kreator membuka form Create Event
- **THEN** dropdown Access Type hanya menampilkan "PRIVATE: PASSWORD" dan
  "PRIVATE: INVITE ONLY"
- **AND** tidak ada opsi "PUBLIC"
- **AND** nilai default terpilih adalah `password`

#### Scenario: Event baru selalu privat
- **WHEN** kreator submit Create Event tanpa mengubah tipe akses
- **THEN** payload yang dikirim memiliki `access_type` bernilai `password`
  (atau `invite_only` bila dipilih), tidak pernah `public`

#### Scenario: Event publik lama tetap dirender
- **GIVEN** ada event lama dengan `access_type = "public"` di database
- **WHEN** peserta membuka halaman detail event tersebut
- **THEN** halaman tetap dirender dan alur registrasi publik lama tetap berfungsi
  (tidak dihapus demi backward-compat)
