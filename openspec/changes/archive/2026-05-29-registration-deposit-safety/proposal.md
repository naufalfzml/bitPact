## Why

Dua case menghasilkan **deposit USDC nyangkut** di vault — user sudah bayar
on-chain tapi berakhir di state limbo (tidak ada baris DB, tidak bisa daftar
ulang karena `register()` revert `AlreadyRegistered`):

1. **Salah password.** Frontend `handleRegister` melakukan approve + `register()`
   on-chain LEBIH DULU, baru POST ke backend `/register` yang mengecek password.
   Kalau password salah → backend 403, baris DB tidak dibuat, **tapi deposit
   sudah masuk vault**. Ini murni salah ketik user.
2. **Creator menghapus peserta.** `POST /:id/remove-participant` hanya menghapus
   baris DB; deposit on-chain + `isRegistered` tetap. Setelah fix F3
   (escrow-payout-integrity) SETIAP baris peserta = depositor terverifikasi,
   jadi removal SELALU desync DB ↔ chain.

Kontrak tidak punya refund per-user (hanya `emergencyRefund` semua atau
`distributePrize`), jadi dana nyangkut tidak bisa dikembalikan satuan tanpa
contract change.

Keputusan (per arahan): **selesaikan tanpa contract change** —
(a) cek kelayakan + password di backend SEBELUM deposit on-chain, dan
(b) hilangkan fitur remove-participant.

## What Changes

- **Pre-deposit eligibility check (backend)**: ekstrak semua guard off-chain
  registrasi (status setup, roster_locked, kapasitas, creator guard, reputasi
  ≥50 HP, password, whitelist, duplikat) menjadi helper
  `checkRegistrationEligibility`. Tambah endpoint `POST /:id/verify-access`
  yang menjalankan helper itu **tanpa** butuh `tx_hash`/deposit.
- **Frontend gating**: `handleRegister` memanggil `/verify-access` LEBIH DULU.
  Kalau gagal (mis. password salah, HP kurang, tidak di-whitelist) → toast
  error dan **berhenti** — tidak ada approve/register on-chain, jadi tidak ada
  deposit sia-sia. Hanya kalau lolos baru lanjut approve + register.
- **Register tetap defense-in-depth**: endpoint `/register` tetap menjalankan
  `checkRegistrationEligibility` (plus verifikasi on-chain) sehingga API tetap
  aman walau dipanggil langsung.
- **Hapus remove-participant**: hilangkan endpoint `POST /:id/remove-participant`
  dan tombol "DEL" di roster frontend. Karena tiap peserta sudah deposit,
  removal tidak punya jalur aman tanpa refund per-user (di luar scope).

## Capabilities

### New Capabilities
- `registration-deposit-safety`: User tidak boleh kehilangan deposit akibat
  validasi off-chain yang gagal SETELAH deposit. Validasi yang bisa dilakukan
  off-chain MUST terjadi sebelum transaksi on-chain. Peserta yang sudah deposit
  tidak bisa dihapus secara sepihak (menghindari dana terkunci).

## Impact

- **Backend** (`backend/routes/events.js`):
  - Helper baru `checkRegistrationEligibility` (pure-ish, deps injectable).
  - `/register` refactor memakai helper.
  - Endpoint baru `POST /:id/verify-access`.
  - Hapus endpoint `POST /:id/remove-participant`.
- **Frontend** (`frontend/src/app/events/[id]/page.tsx`):
  - `handleRegister` memanggil `/verify-access` sebelum approve+register.
  - Hapus tombol DEL + handler-nya di tabel roster.
- **Tests** (`backend/test/`):
  - Hapus test smoke `remove-participant`.
  - Tambah test guard `verify-access` (400 tanpa wallet, 404 event tidak ada).
  - Tambah/eksisting unit test untuk `checkRegistrationEligibility` bila perlu.
- **Tidak ada contract change / redeploy.**

## Non-Goals

- Refund per-user di kontrak (Lapis 2 / V2) — ditunda. Edge case "deposit sukses
  tapi insert DB gagal karena transient error" masih bisa terjadi (jarang) dan
  baru tertutup penuh oleh `refundParticipant` di kontrak V2.
