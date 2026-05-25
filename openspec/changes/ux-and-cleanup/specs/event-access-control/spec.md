## ADDED Requirements

### Requirement: Pembuatan Event Publik dari UI Create
Sistem MUST menyediakan tipe akses `public` sebagai opsi default pada selector access-type
di form pembuatan event (`frontend/src/app/events/create/page.tsx`). Saat `public` dipilih,
UI MUST TIDAK menampilkan field password maupun builder whitelist/Social Connect, dan body
permintaan `POST /api/events` MUST mengirim `access_type: "public"` tanpa `password`
maupun `whitelist`.

#### Scenario: Creator membuat turnamen publik
- **WHEN** creator membuka form create dan membiarkan access-type pada `public` (default)
- **THEN** UI tidak menampilkan field password maupun builder whitelist
- **AND** form mengirim `access_type: "public"` tanpa `password`/`whitelist`
- **AND** event berhasil dibuat dengan `access_type=public`

#### Scenario: Field rahasia hanya muncul untuk tipe yang relevan
- **WHEN** creator mengganti access-type menjadi `password`
- **THEN** UI menampilkan field Room Password (wajib)
- **AND** ketika access-type diganti menjadi `invite_only`, UI menampilkan builder
  whitelist/Social Connect, bukan field password

#### Scenario: Siapa pun dapat mendaftar ke event publik
- **GIVEN** sebuah event dibuat dengan `access_type=public`
- **WHEN** alamat mana pun memanggil `/register` dengan deposit on-chain terverifikasi
- **THEN** registrasi diterima tanpa memerlukan password maupun keanggotaan whitelist
