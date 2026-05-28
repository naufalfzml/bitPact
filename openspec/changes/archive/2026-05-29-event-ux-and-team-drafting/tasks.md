> Tiap section = satu commit terpisah (per feature/fix).

## 1. Create Event — privat saja (commit: `feat(frontend): private-only access on create event`)

- [x] 1.1 `events/create/page.tsx`: hapus `<option value="public">`; sisakan
      `password` + `invite_only`.
- [x] 1.2 Ubah default state `accessType` dari `"public"` → `"password"`;
      sempitkan tipe union ke `"password" | "invite_only"` (state + handler
      `onChange`).
- [x] 1.3 Pastikan tidak ada cabang UI Create yang mengirim `access_type:
      "public"`. (Detail event untuk event publik lama TIDAK diubah.)

## 2. Copy tombol & loading (commit: `fix(frontend): accurate create button + loading copy`)

- [x] 2.1 `events/create/page.tsx`: tombol submit → idle "■ Create Tournament",
      loading "CREATING TOURNAMENT..." (ganti "Deploy Contract" /
      "INITIALIZING_ON_CHAIN_CONTRACT...").
- [x] 2.2 `events/[id]/page.tsx`: ganti loading "LOADING_DASHBOARD_PANEL..." →
      copy bersih konsisten (mis. "LOADING EVENT...").
- [x] 2.3 (opsional) selaraskan gaya copy loading vote page bila perlu konsistensi.

## 3. Perbaikan toast dobel (commit: `fix(frontend): toast fires once (strictmode-safe)`)

- [x] 3.1 `components/Toast.tsx`: pindahkan id-counter ke `useRef` (atau
      `useReducer`); panggil `setToasts` di luar updater murni sehingga satu
      `push` = satu toast (dev & prod).
- [x] 3.2 Verifikasi manual di dev (StrictMode): satu aksi → satu toast; cek aksi
      bracket tidak lagi dobel.

## 4. Modal popup reusable + migrasi konfirmasi/error (commit: `feat(frontend): reusable confirm/error modal`)

- [x] 4.1 Tambah `components/Modal.tsx`: overlay + panel terpusat bergaya retro,
      props `title`, `message`/`children`, aksi (`onClose`, opsional `onConfirm` +
      label tombol).
- [x] 4.2 Migrasi error/konfirmasi penting ke Modal di `events/[id]/page.tsx`
      dan `events/[id]/vote/page.tsx` (mis. error registrasi/distribusi,
      konfirmasi aksi penting). Sukses transien & tx hash tetap toast.

## 5. Penetapan tim manual/otomatis — backend (commit: `feat(backend): manual or random team assignment`)

- [x] 5.1 `routes/events.js`: tambah endpoint `POST /api/events/:id/assign-teams`
      (creator-only; status `setup` + `roster_locked` + `game_mode === "team"`)
      yang meng-update `team_id` peserta dari payload.
- [x] 5.2 Ubah `POST /api/events/:id/start` (mode tim): hormati `team_id` yang
      sudah diset (manual); hanya acak otomatis bila ada peserta `team_id` null.
- [x] 5.3 `cd backend && npm test` — hijau (tambah/ubah test bila ada yang
      menyentuh logika start tim).

## 6. Drafting tim manual/otomatis + label tim konsisten — frontend (commit: `feat(frontend): team drafting UI + consistent team labels`)

- [x] 6.1 Helper `teamLabel(idOrToken)` → `0`/`team-0` = "Team 1", `1`/`team-1` =
      "Team 2"; pakai di roster + bracket board + panel draft.
- [x] 6.2 `events/[id]/page.tsx` roster: ganti "TEAM RED/BLUE" → `teamLabel`.
- [x] 6.3 Bracket board: render token `team-0/1` lewat `teamLabel` (ganti
      "TEAM-0/1").
- [x] 6.4 Panel draft tim (mode `team`, fase setup + roster_locked): dropdown
      pilih "Team 1"/"Team 2" per peserta (manual) + tombol acak otomatis;
      simpan via `assign-teams`.

## 7. Verifikasi akhir (commit: digabung ke commit terkait / verifikasi saja)

- [x] 7.1 `cd frontend && npm run build` — sukses.
- [x] 7.2 `cd backend && npm test` — hijau (76 pass).
- [ ] 7.3 *(user)* Uji manual di browser: create event (tanpa Public), toast tidak
      dobel, modal muncul untuk error/konfirmasi, mode tim manual & acak, label
      "Team 1/2" konsisten di roster & bracket.
