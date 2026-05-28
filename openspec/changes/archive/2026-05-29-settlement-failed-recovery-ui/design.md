## Context

Backend kontrak (sudah ada):
- `settleEvent` di [backend/routes/events.js:1271-1371](../../../backend/routes/events.js#L1271-L1371)
  set status `settlement_failed` + simpan `settlement_error` + `settlement_tx_hash`
  saat receipt gagal/revert.
- `POST /api/events/:id/retry-settlement` di
  [events.js:1535-1581](../../../backend/routes/events.js#L1535-L1581):
  body `{ caller_address }`, guard `authorizeRetrySettlement` (creator atau admin,
  status harus `settlement_failed`), output `{ status: "ended", tx_hash }`
  atau `502 { error, detail }`.
- Migrasi 003 sudah memperluas CHECK constraint dan menambah dua kolom.

Frontend hari ini:
- `EventDetail.status` di
  [events/[id]/page.tsx:35](../../../frontend/src/app/events/[id]/page.tsx#L35):
  `"setup" | "active" | "voting" | "ended" | "disputed"` — tidak ada `settlement_failed`.
- Creator panel ([events/[id]/page.tsx:1371-1373](../../../frontend/src/app/events/[id]/page.tsx#L1371))
  fallback ke `"No admin actions required in state {event.status}."` — yang akan tampil
  saat `settlement_failed`. Tidak actionable.
- Home page filter `"ended"` (page.tsx:53-55) hanya mencakup `ended | voting | disputed`,
  tidak `settlement_failed`.

Block explorer untuk tx link: bergantung `CELO_NETWORK` (mainnet → celo.blockscout.com,
sepolia → celo-sepolia.blockscout.com). Sudah dipakai backend di
[getBlockscoutApiUrl](../../../backend/routes/events.js#L209). Frontend bisa pakai pola
yang sama via `process.env.NEXT_PUBLIC_CELO_NETWORK` atau hardcoded fallback ke
explorer mainnet.

## Goals / Non-Goals

**Goals:**
- Setiap event berstatus `settlement_failed` MUST punya UI yang menampilkan error
  + jalur retry untuk creator.
- Status `settlement_failed` MUST muncul di home list (tidak tersembunyi dari filter
  default).
- Pesan error `settlement_error` ditampilkan apa adanya (jangan generic).

**Non-Goals:**
- Mengubah perilaku backend `settleEvent` / `retry-settlement` (sudah benar).
- Notifikasi otomatis ke creator (email/push) saat settlement gagal — di luar scope.
- Logging telemetri kegagalan settlement (di luar scope).

## Decisions

### D1: Banner full-width di atas dashboard layout
Banner kegagalan ditempatkan di atas `bp-overview-card` (sebelum dashboard grid),
bukan di salah satu panel — agar **mustahil dilewatkan** dan tetap terlihat saat
user scroll panel manapun. Format:

```
■ SETTLEMENT FAILED ■
<settlement_error apa adanya, monospace>
[ View Failed Tx on Blockscout ]   (jika tx_hash)
[ ■ RETRY SETTLEMENT ■ ]            (creator only)
```

Gaya pakai class baru `bp-settlement-banner` (turunan `bp-card bp-panel-destructive`).

### D2: Tombol retry idempoten + optimistic refetch
Handler:
```ts
const handleRetrySettlement = async () => {
  setIsRetrying(true);
  try {
    const res = await fetch(`${API_BASE_URL}/events/${event.id}/retry-settlement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caller_address: address }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.detail || "Retry failed");
    // Sukses → status ended; backend sudah update DB.
    await fetchEventDetail();
  } catch (err) {
    // Sengaja TIDAK alert() — pakai BpToast (lihat change frontend-polish-and-english)
    console.error("Retry settlement error:", err);
    setRetryError(err.message);
  } finally {
    setIsRetrying(false);
  }
};
```

Catatan: change ini DIDAHULUI oleh implementasi BpToast (change `frontend-polish-and-english`).
Bila change polish belum landed, sementara pakai `alert()` lalu refactor di pass kedua.
Untuk keamanan urutan eksekusi, pakai *lokal* state `retryError` sebagai banner kecil
di bawah tombol — independent dari toast.

### D3: `settlement_failed` masuk filter `"ended"` (D-default home)
Filter stage `"ended"` di [page.tsx:53-55](../../../frontend/src/app/page.tsx#L53-L55)
diperluas: `event.status === "ended" || "voting" || "disputed" || "settlement_failed"`.
Alasan: event ini "secara praktis selesai" tapi butuh recovery — biarkan tetap muncul
agar kreator/peserta yang scan list bisa nemu.

**Alternatif ditolak:** filter terpisah `"failed"` → menambah tab tapi event yang
butuh attention paling kritis justru paling layak di-default-visible.

### D4: Badge & class CSS
`.bp-badge-settlement_failed` mewarisi base `.bp-badge` dengan:
- `border-color: var(--bp-destructive)`
- `color: var(--bp-destructive)`
- `background: rgba(255, 92, 122, 0.12)`
- isi teks "RECOVERY" (lebih spesifik daripada "FAILED" → mengarahkan creator ke aksi).

### D5: Link Blockscout (transaksi gagal)
URL builder client-side:
```ts
function getTxExplorerUrl(txHash: string): string {
  const net = process.env.NEXT_PUBLIC_CELO_NETWORK || "sepolia";
  const base = net === "mainnet"
    ? "https://celo.blockscout.com/tx/"
    : net === "alfajores"
      ? "https://celo-alfajores.blockscout.com/tx/"
      : "https://celo-sepolia.blockscout.com/tx/";
  return base + txHash;
}
```
Bisa dijadikan helper di `frontend/src/constants/index.ts` atau di file
`frontend/src/lib/explorer.ts` (file baru, kecil). Pilih `constants/index.ts`
agar tidak menambah file baru.

## Risks / Trade-offs

- **Race condition**: creator memencet retry lalu tx settlement-failed sebelumnya
  ternyata sukses (delayed confirmation). Mitigasi: helper `settleEvent` sudah
  membaca `getEventInfo.distributed` dan langsung set `ended` tanpa mengirim tx
  baru bila sudah ter-distribusi — idempoten.
- **`settlement_error` panjang/sensitif**: pesan error dari viem bisa berisi data
  internal (mis. revert reason raw). Aman ditampilkan di UI internal/demo; kalau
  nanti production-grade, sanitize ke pesan yang ramah user. Saat ini tampilkan
  apa adanya dalam `<pre>` monospace.
- **`NEXT_PUBLIC_CELO_NETWORK` belum di-set di `.env`** → fallback `sepolia` benar.
  Tidak break.

## Migration Plan

1. Update type `EventDetail` (extend status union).
2. Tambah banner + retry handler + filter perluasan + badge class.
3. Smoke test manual: paksa `UPDATE events SET status='settlement_failed',
   settlement_error='test error', settlement_tx_hash='0x...' WHERE id=...;` →
   buka UI sebagai creator → lihat banner, klik retry (akan gagal lagi di demo
   karena event mungkin sudah distributed; cek log).
4. Tidak ada rollback DB — perubahan murni FE.

## Open Questions

- Apakah peserta non-creator juga perlu lihat tombol retry (mis. lewat admin
  override)? Untuk MVP: **tidak** — endpoint backend hanya menerima creator atau
  admin wallet. UI hanya render tombol untuk creator (cek `isCreator`).
