## Context

Lifecycle event bitPact: `setup → active → voting → ended/disputed`. Dua jalur tak
pernah mencapai status akhir:

1. **FFA macet di `setup`.** Saat roster terkunci, frontend menampilkan selector mode.
   `select-game-mode` ([events.js:633-655](../../../backend/routes/events.js#L633-L655))
   hanya membuat bracket untuk `1v1`/`team`; untuk `ffa` tidak ada cabang sehingga
   `bracketInserts.length === 0`. Lalu `/start`
   ([events.js:874](../../../backend/routes/events.js#L874)) menolak event yang
   bracket Ronde 1-nya kosong. Frontend pun menampilkan selector hanya selama
   `event.brackets.length === 0` ([page.tsx:1087](../../../frontend/src/app/events/[id]/page.tsx#L1087)),
   jadi FFA terjebak di tampilan selector tanpa jalur ke `/start`. Catatan: UI state
   `active` untuk FFA (input top-3 winner) sudah ada
   ([page.tsx:1223](../../../frontend/src/app/events/[id]/page.tsx#L1223)) dan tipe
   `game_mode` sudah mencakup `"ffa"` ([page.tsx:30](../../../frontend/src/app/events/[id]/page.tsx#L30)).

2. **Event tanpa vote macet di `voting`.** `resolveConsensus`
   ([events.js:1293](../../../backend/routes/events.js#L1293)) `return` saat
   `votes.length === 0`. Cron `autoAbstain`
   ([autoAbstain.js:42](../../../backend/cron/autoAbstain.js#L42)) memanggil
   `resolveConsensus(event.id)` tanpa argumen apa pun, jadi event yang lewat 24 jam
   tanpa vote tetap kembali tanpa aksi → status tetap `voting` selamanya, dana terkunci.

**Constraint:** 69 test existing (Foundry + `npm test`) harus tetap hijau kecuali
`backend/test/consensus.test.js` yang sengaja diperbarui. `resolveConsensus` dipanggil
dari tiga tempat: distribute-flow ([events.js:782](../../../backend/routes/events.js#L782),
[events.js:1210](../../../backend/routes/events.js#L1210)) dan cron — perubahan
signature harus backward-compatible.

## Goals / Non-Goals

**Goals:**
- FFA bisa dipilih, di-`/start`, dan berjalan `active → top-3 → /end → voting` tanpa
  macet di `setup`.
- Setiap event `voting` mencapai status akhir saat deadline 24 jam lewat, termasuk
  kasus 0 vote (di-refund).
- Perubahan minimal, backward-compatible, dan tidak mengganggu jalur `1v1`/`team`
  maupun resolusi normal.

**Non-Goals:**
- Tidak mengubah perhitungan pool/shares atau gerbang status settlement (itu ranah
  `escrow-payout-integrity` / F1-F2). Change ini memakai `emergencyRefund` &
  `distributePrize` apa adanya.
- Tidak menambah penjadwalan auto-resolve presisi tepat pada `winners_submitted_at + 24h`
  (opsi di FIX_PLAN); cron per jam yang sudah ada cukup.
- Tidak mengubah aturan ambang konsensus, band minority, atau quorum.
- Tidak menambah status enum baru (`settlement_failed` adalah ranah change lain).

## Decisions

### D1 — `/start`: lewati guard bracket khusus `ffa`
Saat ini guard "bracket harus ada" berjalan untuk semua mode sebelum percabangan
mode-spesifik. Ubah agar guard bracket-kosong dan validasi slot 1v1 **dilewati** ketika
`event.game_mode === "ffa"`; validasi minimal 2 peserta tetap berlaku untuk semua mode.

```
if (event.game_mode !== "ffa") {
  // guard "Draf bagan belum di-generate" + validasi slot 1v1 (tetap seperti sekarang)
}
// minimal 2 peserta tetap dicek untuk semua mode
```

**Alternatif ditolak:** men-generate bracket dummy untuk FFA hanya agar lolos guard —
menambah baris bracket palsu yang tak punya makna dan bisa membingungkan UI.

### D2 — `select-game-mode`: `ffa` adalah mode sah dengan 0 bracket
`select-game-mode` sudah mem-persist `game_mode` lalu hanya menyisipkan bracket bila
`bracketInserts.length > 0`. Untuk `ffa`, tidak ada cabang generate → 0 insert, yang
sudah ditangani tanpa error. Yang perlu dipastikan: nilai `ffa` lolos validasi mode di
awal endpoint (jika ada whitelist mode) dan respons mengembalikan `matches_count: 0`.

### D3 — Frontend: opsi `ffa` + jalur start tanpa draf
Tambah `<option value="ffa">` di selector, perluas tipe `selectedGameMode` menjadi
`"1v1" | "team" | "ffa"`. Karena FFA tak punya draf bracket, tampilan selector
(`brackets.length === 0`) harus menyediakan aksi start untuk FFA: ketika
`selectedGameMode === "ffa"`, tombol utama memanggil `select-game-mode` (persist mode)
lalu langsung `/start`, alih-alih hanya "GENERATE BRACKET DRAFT". Untuk `1v1`/`team`
perilaku tombol tidak berubah (tetap generate draf dulu).

**Alternatif ditolak:** membuat panel draf khusus FFA — tidak perlu karena pemenang FFA
ditentukan manual saat `active`, bukan via bracket.

### D4 — `resolveConsensus(eventId, isTimeout = false)`
Tambah parameter kedua opsional `isTimeout` default `false` agar tiga pemanggil yang
ada tetap kompatibel. Ganti early-return 0-vote menjadi:

```
if (!votes || votes.length === 0) {
  if (!isTimeout) return;          // perilaku lama dipertahankan untuk resolve manual
  // TIMEOUT + 0 vote → emergencyRefund (D2/keputusan FIX_PLAN), lalu keluar
  const eventIdBytes32 = uuidToBytes32(eventId);
  try {
    const txHash = await walletClient.writeContract({ ...emergencyRefund });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  } catch (chainErr) { console.error("On-chain emergencyRefund (timeout, 0 vote) failed:", chainErr); }
  await supabase.from("events").update({ status: "ended" }).eq("id", eventId);
  return;
}
// ≥1 vote → jalur resolusi normal yang sudah ada (tak berubah)
```

Cron memanggil `resolveConsensus(event.id, true)`. Karena cron hanya menyeleksi event
yang `winners_submitted_at < now-24h`, `isTimeout: true` di cron memang selalu berarti
timeout.

**Keputusan D2 (FIX_PLAN):** 0 vote saat timeout → `emergencyRefund`, BUKAN `disputed`.
Refund adalah default aman: tidak ada satu pun jury yang memvalidasi hasil, jadi dana
dikembalikan ke peserta alih-alih dibekukan menunggu appeal yang mungkin tak datang.

**Alternatif ditolak:** set status `disputed` pada 0 vote — meninggalkan dana terkunci
menunggu creator appeal; bertentangan dengan tujuan "selalu mencapai status akhir".

### D5 — Pola refund konsisten dengan jalur "konsensus tidak tercapai"
Cabang 0-vote-timeout memakai pola try/catch + `update status ended` yang identik dengan
cabang refund existing ([events.js:1363-1381](../../../backend/routes/events.js#L1363-L1381)),
agar perilaku settlement seragam dan mudah diselaraskan bila F2 (`settlement_failed`)
diterapkan kemudian.

## Risks / Trade-offs

- **[Status `ended` di-set walau `emergencyRefund` revert]** → cabang 0-vote mewarisi
  kelemahan F2 (error ditelan, status tetap `ended`). Itu di luar scope change ini dan
  ditangani oleh `escrow-payout-integrity`. Kita sengaja menyamakan polanya agar
  perbaikan F2 nanti menyentuh satu pola yang konsisten.
- **[`emergencyRefund` pada event yang sebenarnya tak punya deposit on-chain]** → bila
  tak ada peserta yang deposit, refund bisa no-op/revert; ditelan oleh catch dan status
  tetap maju ke `ended`, sehingga tidak macet. Dapat diterima untuk tujuan lifecycle.
- **[Frontend FFA: dua panggilan jaringan berurutan (select-game-mode lalu /start)]** →
  jika `/start` gagal setelah mode ter-persist, event berada di `setup` dengan
  `game_mode=ffa` dan 0 bracket; refresh akan menampilkan kembali selector FFA dan
  creator bisa menekan start lagi (idempoten). Tidak ada state korup.
- **[Perubahan signature `resolveConsensus`]** → mitigasi: parameter opsional default
  `false`; pemanggil non-cron tidak berubah dan test pure-logic tetap mencerminkan
  kedua mode (timeout vs bukan).

## Migration Plan

Tidak ada migrasi schema. Murni perubahan kode:
1. Backend `events.js` (`/start`, `select-game-mode`, `resolveConsensus`).
2. `cron/autoAbstain.js` (teruskan `true`).
3. Frontend `page.tsx` (opsi + tipe + jalur start FFA).
4. Update `backend/test/consensus.test.js` sesuai tabel dampak test.
5. Jalankan `cd contracts && forge test` dan `cd backend && npm test` — semua hijau.

Rollback: revert commit; tidak ada perubahan data persisten yang perlu di-undo.

## Open Questions

Tidak ada — keputusan D2 (0 vote → `emergencyRefund`) sudah ditetapkan oleh pemberi
tugas.
