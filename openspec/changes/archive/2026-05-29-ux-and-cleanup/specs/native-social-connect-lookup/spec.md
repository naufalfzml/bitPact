## ADDED Requirements

### Requirement: Resolusi Hanya pada Network dengan Alamat FederatedAttestations Valid
Sistem MUST memilih alamat kontrak `FederatedAttestations` sesuai `CELO_NETWORK` aktif.
Resolusi on-chain HANYA didukung pada network yang punya alamat valid (saat ini `mainnet`
dan `alfajores`). Untuk network yang TIDAK punya alamat (mis. `sepolia`, default kode),
`resolveSocialIdentifier` MUST mengembalikan `{ status: "NOT_RESOLVED", address: null }`
SETELAH cache miss dan SEBELUM kueri ODIS/kontrak apa pun, serta MUST mencatat log
peringatan "unsupported network". Sistem MUST TIDAK menembak alamat network lain (mis.
alamat Alfajores saat berjalan di chain Sepolia).

#### Scenario: Network tak didukung digate sebelum kueri
- **GIVEN** `CELO_NETWORK=sepolia` (tidak ada alamat FederatedAttestations terdaftar)
- **AND** identifier tidak ada di cache Supabase
- **WHEN** backend menerima permintaan lookup
- **THEN** backend mengembalikan status `NOT_RESOLVED` dengan alamat `null`
- **AND** mencatat log peringatan "unsupported network"
- **AND** tidak melakukan kueri ODIS maupun `readContract` ke alamat network lain

#### Scenario: Network didukung memilih alamat yang benar
- **GIVEN** `CELO_NETWORK=mainnet`
- **WHEN** pemilihan alamat FederatedAttestations dijalankan
- **THEN** sistem menggunakan alamat mainnet `0x0aD5b1d0C25ecF6266Dd951403723B2687d6aff2`
- **AND** ketika `CELO_NETWORK=alfajores`, sistem menggunakan alamat alfajores
  `0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3`

#### Scenario: Cache tetap dilayani meski network tak didukung
- **GIVEN** `CELO_NETWORK=sepolia` dan identifier sudah ter-cache di `social_mappings`
- **WHEN** backend menerima permintaan lookup untuk identifier tersebut
- **THEN** backend mengembalikan `RESOLVED` dari cache tanpa menyentuh jalur on-chain
