## 1. Global Visual System

- [x] 1.1 Perbarui token di `frontend/src/app/globals.css` untuk memisahkan font display vs body (`--bp-font-display`, `--bp-font-body`) dan terapkan semantic color roles untuk primary, success, info, warning, dan destructive state.
- [x] 1.2 Naikkan dan rapikan aturan layout global di `frontend/src/app/globals.css` untuk container desktop, section spacing, card spacing, dan text rhythm tanpa merusak mobile single-column behavior.
- [x] 1.3 Sesuaikan hover, shadow, dan motion di `frontend/src/app/globals.css` agar emphasis besar hanya dipakai pada CTA/nav/actionable blocks, bukan semua card statis.

## 2. Homepage and Shared Layout Hierarchy

- [x] 2.1 Perbarui `frontend/src/app/layout.tsx` dan gaya terkait agar header/footer hierarchy selaras dengan visual system baru tanpa mengubah struktur navigasi utama.
- [x] 2.2 Refinement `frontend/src/app/page.tsx` untuk hero, feature cards, filter bar, dan event cards agar hierarchy visual lebih tegas dan warna primary tidak mendominasi semua blok sekaligus.
- [x] 2.3 Pastikan daftar event di homepage tetap nyaman dipindai pada desktop lebar maupun mobile, termasuk badge state, metadata, dan CTA per card.

## 3. Event Detail Dashboard Hierarchy

- [x] 3.1 Refactor presentasi panel di `frontend/src/app/events/[id]/page.tsx` agar info event, participation state, admin/jury controls, whitelist or roster management, voting progress, dan arena board terbaca sebagai kelompok dengan prioritas berbeda.
- [x] 3.2 Beri treatment visual yang lebih jelas untuk state participant vs creator/admin pada `frontend/src/app/events/[id]/page.tsx`, sehingga blok yang relevan untuk tiap role langsung terlihat.
- [x] 3.3 Rapikan density visual area bracket/arena, voting progress, dan creator controls pada `frontend/src/app/events/[id]/page.tsx` agar halaman tidak terasa seperti satu kolom panjang dengan bobot visual seragam.

## 4. Secondary Page Alignment

- [x] 4.1 Selaraskan `frontend/src/app/events/create/page.tsx` dengan typography body, spacing, dan semantic panel roles baru pada area form, password, whitelist, dan Social Connect lookup.
- [x] 4.2 Selaraskan `frontend/src/app/events/[id]/vote/page.tsx` agar warning banner, winners panel, vote actions, dan live ballot stats mengikuti hierarchy warna dan typography yang baru.
- [x] 4.3 Selaraskan `frontend/src/app/leaderboard/page.tsx` agar deskripsi, table readability, dan ranking emphasis mengikuti split typography dan spacing system yang baru.

## 5. Verification

- [ ] 5.1 Verifikasi manual halaman `/`, `/events/create`, `/events/[id]`, `/events/[id]/vote`, dan `/leaderboard` pada viewport desktop bahwa hierarchy visual, semantic color roles, dan panel grouping sudah lebih jelas.
- [ ] 5.2 Verifikasi manual halaman yang sama pada viewport mobile bahwa perubahan density desktop tidak merusak flow single-column atau keterbacaan.
- [ ] 5.3 Jalankan `cd frontend && npm run build` dan pastikan frontend tetap lolos build setelah refinement visual.
