## Context

Frontend `handleRegister` ([events/[id]/page.tsx:182](../../../frontend/src/app/events/[id]/page.tsx#L182))
urutannya: approve → `register()` on-chain (deposit) → POST `/register`.
Password baru dicek di backend `/register` (step terakhir). Jadi deposit
irreversible terjadi sebelum validasi password.

Backend `/register` ([events.js:224](../../../backend/routes/events.js#L224))
punya rangkaian guard off-chain (status, roster_locked, kapasitas, creator,
reputasi, password, whitelist, duplikat) DI ATAS verifikasi on-chain
(Blockscout/RPC/isParticipant). Guard off-chain itulah yang harus bisa
dijalankan lebih dulu via endpoint terpisah.

`remove-participant` ([events.js:800](../../../backend/routes/events.js#L800))
hanya `DELETE` baris DB; tidak menyentuh on-chain. Setelah F3, tiap baris =
depositor, jadi removal selalu menimbulkan dana nyangkut.

## Goals / Non-Goals

**Goals:**
- Tidak ada deposit yang terjadi kalau validasi off-chain (terutama password)
  gagal.
- Hilangkan jalur yang membuat dana peserta nyangkut akibat aksi creator.
- Tidak ada contract change / redeploy.
- Test tetap hijau; tambah guard test untuk endpoint baru.

**Non-Goals:**
- Refund per-user di kontrak (V2).
- Menutup edge case "on-chain register sukses tapi insert DB gagal" sepenuhnya
  (jarang; butuh refundParticipant V2).

## Decisions

### D1: Ekstrak `checkRegistrationEligibility`
Pindahkan guard off-chain `/register` ke helper async yang mengembalikan
`{ ok: true, event } | { ok: false, code, error }`. Deps (`supabase`,
`getRegeneratedReputation`) injectable agar unit-testable.

Cakupan cek (urut, fail-fast):
1. `wallet_address` ada → else 400
2. event ada → else 404
3. `status === "setup"` → else 400 "Event registration is closed"
4. `!roster_locked` → else 400 "Registration is closed (roster locked)"
5. kapasitas (`max_participants`) → else 400 penuh
6. bukan creator → else 403
7. reputasi `current_hp >= 50` → else 403
8. password (jika `access_type==="password"`): ada + `bcrypt.compare` → else 400/403
9. whitelist (jika `invite_only`) → else 403
10. tidak duplikat (belum ada baris DB) → else 409

### D2: `/register` pakai helper, on-chain tetap
`/register` memanggil helper; jika `!ok` → `res.status(code).json({error})`.
Lalu lanjut verifikasi on-chain (Blockscout/RPC/isParticipant) + insert.
Defense-in-depth: walau frontend sudah pre-check, API tetap memvalidasi.

### D3: Endpoint baru `POST /:id/verify-access`
Body `{ wallet_address, password? }`. Jalankan `checkRegistrationEligibility`;
`ok` → `200 { ok: true }`, else `code` + `error`. Tidak menyentuh chain, tidak
membuat baris apa pun — murni gate.

### D4: Frontend pre-check di `handleRegister`
Sebelum approve, panggil:
```ts
const pre = await fetch(`${API_BASE_URL}/events/${event.id}/verify-access`, {
  method: "POST", headers: {...},
  body: JSON.stringify({ wallet_address: address, password: passwordOverride }),
});
const preData = await pre.json();
if (!pre.ok) { toast.error(preData.error || "Cannot register"); setRegistering(false); return; }
```
Hanya jika lolos → lanjut approve + register + POST /register. Untuk
access_type `password`, `passwordError` tetap di-set agar inline error muncul.

### D5: Hapus remove-participant
- Backend: hapus blok `router.post("/:id/remove-participant", ...)`.
- Frontend: hapus tombol `bp-btn-delete` + handler-nya di tabel roster, dan
  kolom "ACTION" yang hanya berisi tombol itu.
- Test: hapus smoke test `remove-participant without fields => 400`.

**Alternatif ditolak**: pertahankan endpoint tapi return 410/403. Menyisakan
dead code + tombol membingungkan. Lebih bersih dihapus.

## Risks / Trade-offs

- **Pre-check menambah 1 round-trip** sebelum deposit. Murah; mencegah deposit
  sia-sia jauh lebih berharga.
- **Race antara verify-access dan register**: kapasitas/duplikat bisa berubah
  di antara keduanya (user lain mendaftar). Aman karena `/register`
  menjalankan ulang eligibility + insert punya unique index
  `(event_id, wallet_address)`; paling buruk user dapat error setelah deposit
  — tetapi password (penyebab utama) sudah tervalidasi lebih dulu, dan kasus
  kapasitas-penuh sangat jarang untuk turnamen privat kecil.
- **Edge case sisa**: on-chain register sukses tapi insert DB gagal (transient)
  → dana nyangkut. Di luar scope; ditutup penuh oleh refundParticipant V2.

## Migration Plan

1. Backend: helper + verify-access + register refactor + hapus remove-participant.
2. Frontend: pre-check + hapus tombol DEL.
3. Test: hapus remove-participant smoke, tambah verify-access guard.
4. `cd backend && npm test`, `cd frontend && npm run build`.
5. Tidak ada migrasi DB / contract.

Rollback: revert PR; tidak ada efek persisten.

## Open Questions

- Apakah `refundParticipant` (V2) akan dikerjakan sebelum mainnet? Ditunda;
  bila ya, akan jadi change terpisah dan `remove-participant` bisa
  dihidupkan kembali sebagai "kick + refund".
