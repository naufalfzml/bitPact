## 1. F6 — Tipe `public` bisa dibuat dari UI

- [ ] 1.1 Di `frontend/src/app/events/create/page.tsx`, ubah tipe & default state `accessType` menjadi `"public" | "password" | "invite_only"` dengan default `"public"` ([create/page.tsx:19](../../../frontend/src/app/events/create/page.tsx#L19))
- [ ] 1.2 Tambah `<option value="public">` sebagai opsi pertama pada selector access-type ([create/page.tsx:164-166](../../../frontend/src/app/events/create/page.tsx#L164-L166))
- [ ] 1.3 Pastikan field Room Password hanya render saat `accessType === "password"` dan blok whitelist/Social Connect hanya saat `accessType === "invite_only"` (sudah ada gating; verifikasi `public` menyembunyikan keduanya)
- [ ] 1.4 Pastikan body POST mengirim `access_type: "public"` tanpa `password`/`whitelist` saat publik (cek `password`/`whitelist` ternary di [create/page.tsx:52-70](../../../frontend/src/app/events/create/page.tsx#L52-L70))

## 2. F9 — Peringatan minoritas akurat (frontend)

- [ ] 2.1 Di `frontend/src/app/events/[id]/vote/page.tsx`, ganti teks banner `.bp-penalty-warning` menjadi pernyataan akurat: penalti −10 HP hanya bila hasil akhir ≥85% sepihak DAN pemilih di pihak minoritas ([vote/page.tsx:182-184](../../../frontend/src/app/events/[id]/vote/page.tsx#L182-L184))

## 3. F7 — Penalti minoritas pakai HP ter-regenerasi (backend)

- [ ] 3.1 Di `backend/routes/events.js` blok minority penalty, ganti pembacaan baris `reputation_tracking` (`select reputation_score … single`) dengan `const currentHp = (await getRegeneratedReputation(v.voter_address)).current_hp;` ([events.js:1391-1401](../../../backend/routes/events.js#L1391-L1401))
- [ ] 3.2 Set `const newScore = Math.max(0, currentHp - 10);` lalu `insert` baris penalti seperti semula (helper sudah di-import di [events.js:12](../../../backend/routes/events.js#L12))

## 4. F8 — Social Connect alamat sesuai network (backend, Keputusan D3)

- [ ] 4.1 Di `backend/lib/socialConnect.js`, tambah helper `getSupportedNetwork()` yang mengembalikan `"mainnet" | "alfajores" | null` dari `process.env.CELO_NETWORK`
- [ ] 4.2 Refactor `getFederatedAttestationsAddress()` agar mengembalikan `FEDERATED_ATTESTATIONS_ADDRESS[net]` bila didukung, atau `null` bila tidak ([socialConnect.js:101-105](../../../backend/lib/socialConnect.js#L101-L105))
- [ ] 4.3 Di `resolveSocialIdentifier`, setelah cache miss dan sebelum kueri ODIS/kontrak, gate: jika `getFederatedAttestationsAddress()` `null` → `console.warn` "unsupported network" + `return { status: "NOT_RESOLVED", address: null }`
- [ ] 4.4 (Opsional) export `getSupportedNetwork`/`getFederatedAttestationsAddress` untuk diuji unit

## 5. F10 — Bersihkan config & docs

- [ ] 5.1 `backend/.env.example`: ubah komentar menjadi `CELO_NETWORK=sepolia # atau mainnet / alfajores` (sesuai default kode di [blockchain.js:17](../../../backend/lib/blockchain.js#L17))
- [ ] 5.2 `backend/.env.example`: rename `CUSD_TOKEN_ADDRESS` → `USDC_TOKEN_ADDRESS` dengan nilai USDC Sepolia `0x01C5C0122039549AD1493B8220cABEdD739BC44E` (var hanya dokumentasi; tidak dibaca kode)
- [ ] 5.3 `docs/README.md`: ganti semua tautan absolut `file:///Users/ibanana/...` ke dok yang belum ada menjadi penanda `(belum tersedia)` tanpa hyperlink rusak
- [ ] 5.4 Konsistensi nama: standarkan prosa ke **bitPact** dan istilah mata uang ke **USDC** di `docs/README.md`, `README.md`, `PROJECT_OVERVIEW.md` (JANGAN mengubah identifier kode `BitPatchVault`)

## 6. Test — jaga 69 test hijau + tambah unit test F7 & F8

- [ ] 6.1 Tambah unit test penalti minoritas: dengan `getRegeneratedReputation` di-stub mengembalikan `current_hp` ter-regenerasi, assert `newScore === current_hp - 10` dan `Math.max(0, …)` (mock supabase + helper)
- [ ] 6.2 Tambah unit test Social Connect: `CELO_NETWORK=sepolia` → `NOT_RESOLVED` tanpa kueri; `mainnet`/`alfajores` → alamat yang benar terpilih
- [ ] 6.3 Jalankan `cd backend && npm test` dan `cd contracts && forge test`; pastikan seluruh suite hijau (69 test existing + test baru)
