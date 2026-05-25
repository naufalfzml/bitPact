## Context

`resolveConsensus` di [backend/routes/events.js](../../../backend/routes/events.js#L1309-L1381)
adalah satu-satunya jalur yang mencairkan escrow. Hari ini ia (a) menghitung pool dari
`parseUnits(String(ticket_price * dbParticipantCount), 6)`, (b) menelan error on-chain
lalu tetap men-set `status: "ended"`, dan (c) bergantung pada endpoint register yang
mem-bypass verifikasi on-chain saat `tx_hash === "social-connect-invite"`
([events.js:306-310](../../../backend/routes/events.js#L306-L310)).

Kontrak `BitPatchVault` menegakkan `sum(shares) === prizePool` (revert `SharesMismatch`).
ABI sudah mengekspos sumber kebenaran: `getEventInfo(bytes32) → (creator, ticketPrice,
prizePool, distributed, participantCount)` ([blockchain.js:48](../../../backend/lib/blockchain.js#L48)).
Pendekatan yang benar telah dibuktikan oleh Foundry
`test_flow_poolFromOnChainState_distributesCorrectly` dan kontra-buktinya
`test_flow_phantomParticipant_causesSharesMismatch`.

Schema `events` saat ini membatasi `status` lewat CHECK constraint (lihat migrasi
sebelumnya di `backend/migrations/`), sehingga nilai status baru butuh migrasi.

## Goals / Non-Goals

**Goals:**
- Pool & shares pada distribusi SELALU berasal dari `prizePool` on-chain (F1).
- Status `ended` HANYA tercapai setelah receipt on-chain `success`; kegagalan menjadi
  `settlement_failed` yang terlihat & bisa di-retry (F2/D4).
- Tidak ada baris `participants` tanpa deposit on-chain terverifikasi (F3/D1).
- Semua 69 test tetap hijau kecuali yang sengaja diubah di tabel "Dampak ke test".

**Non-Goals:**
- Mengubah smart contract `BitPatchVault.sol` (read-only `getEventInfo` sudah cukup).
- Menyelesaikan timeout / 0-vote (itu F5, change `consensus-timeout-resolution`).
- Mengubah logika penalti reputasi (F7, change `reputation-penalty-accuracy`).
- Mengubah alur lookup Social Connect itu sendiri; hanya tujuan tulisnya (whitelist).

## Decisions

### D-F1: Pool dibaca dari `getEventInfo`, bukan jumlah baris DB
Sebelum distribusi, baca `prizePool` on-chain dan bagi ke pemenang:
```js
const [, , prizePool] = await publicClient.readContract({
  address: VAULT_ADDRESS, abi: VAULT_ABI,
  functionName: "getEventInfo", args: [eventIdBytes32],
});
const sharePerWinner = prizePool / BigInt(winners.length);
const shares = winners.map(() => sharePerWinner);
const sumShares = shares.reduce((a, b) => a + b, 0n);
if (sumShares < prizePool) shares[shares.length - 1] += prizePool - sumShares;
```
**Alternatif ditolak:** mempertahankan `ticket_price × count` tapi memakai jumlah
*depositor on-chain* — masih bergantung pada hitungan DB yang bisa drift; pool on-chain
adalah satu-satunya sumber yang dijamin cocok dengan saldo vault.

### D-F2 / D4: Status `settlement_failed` + endpoint retry
Bungkus distribusi/refund dengan kontrol alur eksplisit:
- `writeContract` → `waitForTransactionReceipt`. Jika `receipt.status === "success"` →
  `update({ status: "ended", settlement_tx_hash: txHash, settlement_error: null })`.
- Jika `writeContract`/receipt melempar ATAU `receipt.status === "reverted"` →
  `update({ status: "settlement_failed", settlement_error: <msg>, settlement_tx_hash: <txHash|null> })`
  dan JANGAN set `ended`.

Endpoint retry baru `POST /api/events/:id/retry-settlement`:
- Guard: hanya creator event atau admin; hanya boleh saat `status === "settlement_failed"`.
- Menjalankan ulang jalur settlement yang sama (distribute jika konsensus tercapai, refund
  jika tidak) dengan pola gating yang sama. Sukses → `ended`; gagal → tetap
  `settlement_failed` dengan error terbaru.

Untuk memudahkan retry, settlement di-refactor menjadi helper internal
`settleEvent(event, { isDistribute })` yang dipakai `resolveConsensus` dan endpoint retry.

**Alternatif ditolak (D4 opsi B):** pertahankan `voting`/`disputed` saat gagal tanpa
status baru — menyamarkan kegagalan dengan keadaan "belum selesai", sulit dibedakan dari
event yang memang masih menunggu vote, dan tak punya tempat menyimpan error.

### D-F1 idempotensi distribusi
`distributePrize`/`emergencyRefund` revert bila event sudah `distributed`. Retry membaca
`getEventInfo` (`distributed` flag); jika sudah `true`, langsung set `ended` tanpa
mengirim transaksi baru — mencegah double-spend saat retry pada kasus "tx sebenarnya
sukses tapi pencatatan DB gagal".

### D-F3 / D1: Hapus total bypass `social-connect-invite`
Cabang `if (tx_hash === "social-connect-invite") { … }` dihapus seluruhnya dari endpoint
register, beserta semua guard `if (tx_hash !== "social-connect-invite")` yang menjadi
tak relevan. Verifikasi on-chain (Blockscout + RPC + `isParticipant`) berlaku untuk
SEMUA registrasi. Di frontend, `handleAddResolvedPlayer` (dead path) dihapus; alur invite
memakai `handleAddToWhitelist` → `POST /api/events/:id/whitelist`.

## Risks / Trade-offs

- **Data lama dengan peserta hantu** → setelah F1, distribusi memakai pool on-chain
  sehingga peserta hantu tidak lagi menyebabkan revert; baris hantu hanya jadi non-winner
  tanpa share. Tidak perlu backfill data untuk demo.
- **RPC `getEventInfo` gagal saat resolusi** → diperlakukan seperti kegagalan settlement:
  status `settlement_failed`, bisa di-retry. Tidak set `ended`.
- **Retry oleh non-creator** → dicegah guard kepemilikan + admin; endpoint menolak 403.
- **Migrasi pada DB yang sudah ada constraint** → `DROP CONSTRAINT IF EXISTS` +
  `ADD COLUMN IF NOT EXISTS` membuat migrasi idempoten dan aman dijalankan ulang.

## Migration Plan

1. Jalankan `backend/migrations/003_add_settlement_status.sql` (perluas CHECK status,
   tambah `settlement_error` + `settlement_tx_hash`).
2. Deploy backend (`resolveConsensus` + endpoint retry + register tanpa bypass).
3. Deploy frontend (hapus `handleAddResolvedPlayer`).
4. Rollback: kode bisa di-revert tanpa membatalkan migrasi (kolom & status baru bersifat
   aditif; tidak ada data lama yang melanggar constraint baru).

## Open Questions

- Tidak ada keputusan terbuka untuk change ini. D1 (hapus bypass) dan D4 (status
  `settlement_failed` + retry) sudah ditetapkan oleh perintah. D2/D3 di FIX_PLAN milik
  change lain (`consensus-timeout-resolution`, `social-connect-network-fix`).
