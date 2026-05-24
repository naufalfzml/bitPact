### Requirement: Resolusi Identitas Sosial Menggunakan Celo SocialConnect ODIS Asli
Sistem backend MUST menyediakan endpoint `/api/social-connect/lookup` yang secara dinamis melakukan kueri alamat wallet Celo dari ODIS (Oblivious Decentralized Identifier Service) Celo secara asli menggunakan SDK `@celo/identity` jika data tidak ditemukan di cache lokal.

#### Scenario: Lookup email pertama kali sukses dari ODIS (On-Chain)
- **GIVEN** data "user@example.com" belum ada di cache Supabase lokal, tetapi terdaftar di ODIS Celo dengan wallet "0x1234567890123456789012345678901234567890"
- **WHEN** backend menerima permintaan lookup untuk "user@example.com"
- **THEN** backend memanggil SDK `@celo/identity` untuk meminta pepper, menyelesaikan kueri ke smart contract `FederatedAttestations` on-chain Celo, mendapati wallet "0x1234567890...", menyimpannya ke cache database Supabase, dan mengembalikan status "RESOLVED" dengan alamat wallet tersebut

#### Scenario: Lookup no. telepon dari cache lokal Supabase sukses
- **GIVEN** data "+6281234567890" sudah ter-cache di tabel database `social_mappings` dengan wallet "0x9876543210987654321098765432109876543210"
- **WHEN** backend menerima permintaan lookup untuk "+6281234567890"
- **THEN** backend secara instan mengembalikan status "RESOLVED" dengan alamat wallet dari database lokal tanpa memicu kueri ODIS on-chain yang berbayar

#### Scenario: Lookup identitas yang tidak terdaftar gagal
- **GIVEN** email "unregistered@example.com" tidak ada di cache lokal dan tidak terdaftar di ODIS Celo
- **WHEN** backend menerima permintaan lookup untuk "unregistered@example.com"
- **THEN** backend mengembalikan status "NOT_RESOLVED" dan alamat dompet null
