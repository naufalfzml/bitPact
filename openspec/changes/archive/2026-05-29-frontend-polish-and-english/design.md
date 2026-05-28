## Context

Frontend bitPact saat ini berfungsi end-to-end (create → register → start →
vote → settle) tetapi penuh "rough edges" yang menurunkan kualitas demo dan
membuat MiniPay user (mobile-first) mendapatkan pengalaman kurang. Sebagian
dari masalah ini sudah ditargetkan di change `frontend-visual-refinement` lama
(masih di `openspec/changes/`), tapi sub-area UX (toast, my-vote, photo,
mobile) belum dibahas.

Hal-hal yang sudah jadi assumption:
- Backend telah memperbaiki settlement + reputation + FFA + dll. Change ini
  pure di permukaan UX, kecuali endpoint kecil `my_vote` (extend `GET
  /:id`) dan `multer limits`.
- Toast library: **custom**, no new npm dependency (per pilihan user).
- Logo: **draft 2-3 opsi SVG** (per pilihan user), nanti dipilih.

## Goals / Non-Goals

**Goals:**
- Hilangkan `alert()` / `confirm()` browser native untuk feedback feedback
  positive flow. (`confirm()` untuk destruksi boleh tetap sementara — lihat
  D3.)
- UI mobile MiniPay tetap menampilkan informasi player core (HP / USDC / CELO).
- Voter melihat status vote mereka sendiri tanpa harus mencoba klik.
- Halaman leaderboard yang tidak relevan dihilangkan untuk mengurangi surface.
- WalletConnect projectId & USDC env naming sinkron dengan branding.
- Branding logo lebih sesuai dengan aturan "text-free monogram".
- Semua user-facing string konsisten English.

**Non-Goals:**
- Redesign global tata letak / palette warna (sudah di
  `frontend-visual-refinement`).
- Migrasi i18n full (next-intl / dll) — saat ini cukup hardcoded English.
- Mengganti `confirm()` destruktif → modal kustom (potensi follow-up change).
- Username custom override (di luar scope — kolom `participants.username`
  dihapus di `backend-correctness-cleanup`).

## Decisions

### D1 (N8): Mobile RPG bar — wrap, not hide
Saat ini `@media (max-width: 720px) { .bp-rpg-status { display: none; } }`.
Ubah jadi visible namun layout berbeda:

```css
@media (max-width: 720px) {
  .bp-header-inner {
    flex-direction: column;
    align-items: stretch;
  }
  .bp-rpg-status {
    /* visible — pindah ke baris bawah */
    order: 2;
    width: 100%;
    justify-content: space-between;
    font-size: 0.5rem;
    padding: 6px 8px;
  }
}
```

Penyesuaian persis di-tune saat implementasi.

### D2 (N11): Toast custom — minimal API
Komponen `BpToast` + provider:

```tsx
// frontend/src/app/components/Toast.tsx
type ToastTone = "success" | "info" | "warning" | "destructive";
interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
  ttl?: number; // default 4000ms
}
// Context exposes: pushToast(tone, message, ttl?)
```

Setiap toast adalah `bp-card bp-panel-<tone>` (style sudah ada) + posisi
`position: fixed; bottom: 24px; right: 24px;` (mobile: full-width bottom).
Animation: fade-in + slide-up via CSS keyframes (no JS animation lib).

Hook helper:
```tsx
export function useToast() {
  const ctx = useContext(ToastContext);
  return {
    success: (msg: string) => ctx.push("success", msg),
    info: (msg: string) => ctx.push("info", msg),
    warning: (msg: string) => ctx.push("warning", msg),
    error: (msg: string) => ctx.push("destructive", msg),
  };
}
```

Pemakaian:
```tsx
const toast = useToast();
toast.success("Registration successful! Welcome, player.");
toast.error(`Registration failed: ${err.message}`);
```

### D3 (N11): `confirm()` destruktif sementara tetap native
Untuk operasi destruktif (mis. remove participant, retry settlement, distribute),
`confirm()` masih dipakai karena: (a) mengganti dengan modal pixel butuh design
lebih, (b) `confirm()` modal browser justru sudah memberi UX yang familiar untuk
"are you sure". Tandai dengan TODO comment + buat follow-up change.

### D4 (N12): `my_vote` di response detail
Ekstensi minimal backend:

```js
// GET /api/events/:id?wallet=0x...
// In handler: bila ?wallet=0x... ada, fetch votes where voter_address=wallet
// → add field my_vote: "agree" | "reject" | null ke response.
```

Tidak menambah endpoint baru (avoid surface bloat). Frontend di vote page
pass `?wallet=${address}` saat fetch. Render:
```tsx
{event.my_vote === "agree" && <Banner success>You voted AGREE — funds will payout if quorum is met.</Banner>}
{event.my_vote === "reject" && <Banner destructive>You voted REJECT — funds will refund if quorum is met.</Banner>}
```
Bila `my_vote !== null`, tombol AGREE/REJECT dirender disabled.

### D5 (N13): Hapus tombol di event detail page
Tombol "Distribute Prize" di
[events/[id]/page.tsx:1325-1346](../../../frontend/src/app/events/[id]/page.tsx#L1325-L1346)
dihapus seluruh blok-nya. Vote page jadi single source of truth karena di
sana creator + voters bisa lihat konteks vote sekaligus aksi distribusi.

### D6 (N14): Photo preview + size validation
Frontend:
```tsx
{photoFile && (
  <img src={URL.createObjectURL(photoFile)} alt="preview"
       style={{ maxWidth: 200, maxHeight: 200, border: "2px solid var(--bp-border)" }} />
)}
```
Validasi pre-upload:
```tsx
if (photoFile.size > 5 * 1024 * 1024) {
  toast.error("Photo must be 5MB or smaller.");
  return;
}
```
Backend `multer`:
```js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image uploads are allowed"));
  },
});
```

### D7 (N16): env var rename
`NEXT_PUBLIC_CUSD_TOKEN_ADDRESS` → `NEXT_PUBLIC_USDC_TOKEN_ADDRESS`.
Backward compat: untuk dev yang sudah `.env.local`, support fallback:
```ts
export const USDC_TOKEN_ADDRESS = (
  process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
  process.env.NEXT_PUBLIC_CUSD_TOKEN_ADDRESS ||
  "0x01C5C0122039549AD1493B8220cABEdD739BC44E"
) as `0x${string}`;
```
Bila keduanya tidak diset, fallback hardcoded Sepolia. Tambahkan deprecation
warning di console saat fallback ke nama lama.

### D8 (N19): Logo SVG — opsi yang akan didraft
Tiga opsi monogram pixel text-free:

1. **Bracket Tree**: dua kotak kecil → satu kotak besar di kanan (bentuk
   diagram bracket single-elimination 2-deep).
2. **Vault Block**: 3×3 grid pixel dengan corner cuts (kombinasi kotak +
   slot, like a pixel vault icon).
3. **Coin Stack**: 4 kotak vertikal bertumpuk dengan offset 1px (uang piksel
   ditumpuk).

Implementasi: SVG inline 24×24, viewBox `0 0 24 24`, `shape-rendering="crispEdges"`,
`fill="var(--bp-primary)"`. Akan dirender sebagai komponen `<LogoMark />`.

User memilih satu opsi sebelum implementasi (kita prepare ketiga draft di
issue / komentar tasks).

### D9 (N15): Sapu bahasa — token list
Daftar string Indonesia yang perlu di-update ke English (tidak exhaustive,
tetapi mencakup semua user-facing yang kelihatan):

Frontend:
| Lokasi | Sekarang | Jadi |
|---|---|---|
| events/[id]/page.tsx:659 | "KREATUR TIDAK BISA IKUT BERMAIN" | "CREATOR CANNOT PLAY" |
| events/[id]/page.tsx:666 | "REGISTRASI DITUTUP" | "REGISTRATION CLOSED" |
| events/[id]/page.tsx:678 | "SLOT PENUH" | "SLOTS FULL" |
| events/[id]/page.tsx:716 | "AKSES TERBATAS: ANDA TIDAK DIUNDANG" | "RESTRICTED: YOU ARE NOT INVITED" |
| events/[id]/page.tsx:727 | "ANDA TERDAFTAR DI WHITELIST" | "YOU ARE WHITELISTED" |
| events/[id]/page.tsx:902 | "MENAMBAHKAN..." / "TAMBAHKAN KE WHITELIST" | "ADDING..." / "ADD TO WHITELIST" |
| events/[id]/page.tsx:1110 | "DRAF MATCHUP RONDE 1" | "ROUND 1 MATCH DRAFT" |

Backend (`routes/events.js`):
| Line | Indonesian | English |
|---|---|---|
| 237 | "Pendaftaran turnamen ini sudah ditutup (Roster Locked)" | "Registration is closed (roster locked)" |
| 247 | "Pendaftaran ditolak. Kapasitas maksimum turnamen (...) sudah terpenuhi." | "Registration rejected. Tournament is full (...)" |
| 252 | "Kreator tidak diizinkan untuk mendaftar ke turnamen buatan sendiri" | "Creator cannot register to their own tournament" |
| 261 | "Pendaftaran ditolak. Skor HP Reputasi Anda (...) masih dalam masa hukuman/pemulihan..." | "Registration rejected. Your reputation HP (...) is in penalty/recovery period (min 50). HP regenerates over time." |

Plus seluruh "■ ..." Indonesian label di alert/banner → English.

### D10 (N10): WalletConnect env
```ts
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "a6873523dfdbd96e5eb9816035105e1d"; // dev fallback
if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  console.warn("[bitPact] Using dev WalletConnect projectId fallback. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID for production.");
}
```

## Risks / Trade-offs

- **Custom toast vs library**: kita reinvent sederhana, lebih ringan. Risiko:
  edge case (multiple toast stack, focus management) butuh polish. Acceptable
  untuk hackathon.
- **`my_vote` via query param**: meng-expose data per-wallet via query
  parameter — voter address sudah public di blockchain, tidak ada privacy
  leak baru.
- **Logo SVG**: subjektif. User pilih final design sebelum implementasi.
- **English-only**: target audience Indonesia mungkin lebih nyaman dengan
  Bahasa. Trade-off: konsistensi sekarang lebih penting; i18n bisa dibangun
  nanti via locale files.

## Migration Plan

1. **Phase A — non-breaking infra**: tambah Toast + LogoMark draft, RPG mobile,
   env walletconnect. Tidak ada perubahan API.
2. **Phase B — UX**: photo preview, my-vote (backend extend + FE banner), dedup
   distribute, hapus leaderboard.
3. **Phase C — i18n + rename**: sapu bahasa, rename env var, smoke test full.
4. **Smoke**: `cd frontend && npm run build`, jalankan dev server, demo flow
   end-to-end.

Rollback: per-commit revertible.

## Open Questions

- Untuk N19 final logo: nanti perlu user pilih dari 3 opsi yang kita render.
  Tasks 8.1 menggambar 3 SVG dengan inline preview di PR description.
- Apakah `confirm()` destructive akan diganti modal pixel di follow-up change?
  Default: ya — buat follow-up `pixel-confirm-modal` after this change ships.
