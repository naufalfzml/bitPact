## Why

Integrasi Social Connect sebelumnya masih menggunakan simulasi (mock) berbasis tabel database Supabase tersentralisasi. Untuk mencapai fungsionalitas desentralisasi penuh, interoperabilitas lintas aplikasi (cross-DApp), dan perlindungan privasi PII (Personally Identifiable Information) pengguna sesuai standar resmi Celo, kita perlu meningkatkan modul lookup ini untuk menggunakan protokol Celo SocialConnect asli (ODIS) dan smart contract on-chain Celo.

## What Changes

- **Pustaka Dependensi Backend**: Menambahkan SDK resmi `@celo/identity` ke `backend/package.json`.
- **Modul Lookup Asli**: Mengubah `backend/lib/socialConnect.js` dari pembacaan Supabase murni menjadi kueri ODIS yang sebenarnya (menggunakan `@celo/identity` ODIS client) dan on-chain contract lookup (melalui contract `FederatedAttestations` dari Celo SDK/Viem).
- **Caching Cerdas di Supabase**: Menambahkan sistem cache di mana alamat yang berhasil di-resolve dari ODIS on-chain disimpan di database Supabase lokal (`social_mappings`) untuk meminimalkan kueri ODIS berulang yang memakan waktu lama dan biaya gas kueri ODIS.
- **Konfigurasi Kunci Enkripsi (DEK) & Issuer**: Menambahkan konfigurasi variabel lingkungan (.env) untuk Issuer Address, Issuer Private Key, dan Data Encryption Key (DEK) untuk interaksi dengan ODIS.

## Capabilities

### New Capabilities
- `native-social-connect-lookup`: Layanan identitas Social Connect (ODIS) asli menggunakan SDK `@celo/identity` untuk lookup email/nomor telepon peserta ke on-chain contract `FederatedAttestations` Celo, terintegrasi dengan layer caching database lokal untuk efisiensi biaya.

### Modified Capabilities
<!-- None -->

## Impact

- **Backend**: Berkas `backend/package.json` (penambahan `@celo/identity`), `backend/lib/socialConnect.js` (refaktorisasi total dari kueri Supabase ke SDK ODIS dengan *fallback caching*), `backend/.env` (penambahan variabel lingkungan ODIS issuer/DEK).
- **Frontend**: Modul frontend tidak mengalami perubahan besar (non-breaking) karena bentuk respons dari endpoint `/api/social-connect/lookup` dipertahankan sama (`{ status: "RESOLVED"|"NOT_RESOLVED", address: string|null }`) untuk kompatibilitas ke belakang (backward compatibility).
