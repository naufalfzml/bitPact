## Context

bitPact sudah memiliki visual language yang khas: pixel-art, no-arrows, warna neon di atas
latar gelap, dan CTA bergaya arcade. Masalahnya bukan kurang identitas, tetapi kurang
hierarki. Saat ini banyak elemen memakai warna primer yang sama, font display yang sama,
dan pola hover/shadow yang sama, sehingga headline, helper text, informasi sistem, warning,
dan aksi utama terlihat sama-sama penting.

Kondisi ini paling terasa pada:
- `frontend/src/app/page.tsx`, di mana hero, filter bar, feature cards, dan event cards
  sama-sama “keras” secara visual.
- `frontend/src/app/events/[id]/page.tsx`, di mana info event, state registrasi, whitelist,
  kontrol creator/jury, progress voting, dan arena board tampil sebagai blok yang sama
  kuatnya.
- `frontend/src/app/events/create/page.tsx`, `frontend/src/app/events/[id]/vote/page.tsx`,
  dan `frontend/src/app/leaderboard/page.tsx`, yang masih mewarisi density dan typography
  yang lebih cocok untuk display daripada body/interface copy.

Perubahan ini sengaja dibatasi pada frontend visual system. Tidak ada perubahan backend,
schema DB, API, atau smart contract.

## Goals / Non-Goals

**Goals:**
- Menetapkan peran warna yang semantik dan konsisten pada UI.
- Memisahkan font display dan font body agar copy panjang, input, dan tabel lebih mudah
  dibaca tanpa kehilangan identitas retro.
- Memperbaiki layout density desktop dengan container yang lebih lega dan spacing antar
  section/panel yang lebih jelas.
- Menata ulang hierarchy panel pada halaman event detail agar user langsung tahu blok mana
  yang informatif, mana yang actionable, dan mana yang berstatus warning/system.
- Menjaga estetika bitPact tetap retro, tajam, dan non-generic.

**Non-Goals:**
- Tidak mengubah flow produk, state machine, atau perilaku API.
- Tidak mengganti identitas visual bitPact menjadi gaya modern minimal biasa.
- Tidak mengubah copy secara substantif selain bila diperlukan agar selaras dengan panel
  hierarchy baru.
- Tidak menambah dependency UI framework atau design library baru.

## Decisions

### D1: Semantic color roles, bukan semua elemen memakai primary
`--bp-primary` tetap menjadi warna brand/headline, tetapi tidak lagi menjadi aksen default
untuk semua elemen penting. Palet akan diposisikan sebagai:
- `primary/yellow`: logo, section title, brand emphasis
- `green`: success, final CTA, confirmed/approved state
- `cyan`: info, neutral system state, data/status panels
- `orange`: warning, caution, contextual alerts
- `red`: destructive action, deny/error

- **Rationale:** mengurangi kompetisi visual antar komponen dan membuat scanning lebih
  cepat.
- **Alternatif ditolak:** mengganti total palet menjadi lebih muted. Itu akan mengurangi
  karakter retro yang justru sudah jadi kekuatan produk.

### D2: Split typography antara display dan body
Font pixel-display tetap dipakai untuk judul, badge, tombol, dan status label. Body copy,
helper text, form field text, dan tabel akan memakai font pendamping yang lebih terbaca.
Implementasi idealnya lewat token baru seperti `--bp-font-display` dan `--bp-font-body`.

- **Rationale:** meningkatkan readability di halaman yang padat tanpa mengorbankan branding.
- **Alternatif ditolak:** mempertahankan satu font untuk seluruh UI. Ini menjaga konsistensi
  superfisial, tetapi membuat density tinggi terasa melelahkan.

### D3: Layout density desktop diperlebar, tetapi ritme mobile dipertahankan
Container utama dinaikkan dari layout saat ini ke lebar desktop yang lebih lega
(sekitar 1120–1200px), sementara mobile tetap single-column dan ringkas. Spacing section,
card, dan panel akan diatur ulang agar ada perbedaan level antara area hero, filters,
data panels, dan actions.

- **Rationale:** halaman event detail dan dashboard listing saat ini menabrak batas 960px
  terlalu cepat, sehingga panel penting terasa sempit.
- **Alternatif ditolak:** tetap mempertahankan container sempit dan hanya mengurangi ukuran
  font. Itu menyelesaikan gejala, bukan struktur layout.

### D4: Panel hierarchy eksplisit di halaman event detail
Halaman event detail akan diperlakukan sebagai dashboard dua tingkat:
- informasi event + participation state
- admin/jury controls
- whitelist & roster management
- voting/progress state
- arena board / bracket visual

Masing-masing blok harus dibedakan lewat border role, background treatment, title tone,
dan spacing; bukan hanya lewat urutan vertikal panjang.

- **Rationale:** ini adalah halaman paling kompleks dan paling membutuhkan hierarchy.
- **Alternatif ditolak:** redesign total ke layout baru berbasis tabs. Itu lebih invasif
  dan berisiko mengubah flow pengguna.

### D5: Hover/motion hanya untuk elemen interaktif yang benar-benar penting
Card statis tidak perlu semua mengangkat diri, berpindah, atau menyala seperti tombol.
Hover besar akan dibatasi pada CTA, nav link, actionable cards, atau pilihan yang memang
klik-able.

- **Rationale:** terlalu banyak micro-motion membuat semua blok terasa aktif sekaligus.
- **Alternatif ditolak:** menghapus motion sepenuhnya. Sedikit motion tetap penting untuk
  rasa arcade/pixel yang hidup.

## Risks / Trade-offs

- **[Readability vs branding]** → font pendamping body bisa terasa “kurang retro” jika
  terlalu netral. Mitigasi: batasi pemakaian ke paragraph, table, input, dan helper text;
  display text tetap pixel-font.
- **[Visual drift]** → pelebaran container dan panel hierarchy bisa terasa seperti redesign
  baru. Mitigasi: pertahankan logo, palette dasar, blocky borders, dan pixel shadows.
- **[Layout regression]** → halaman event detail punya banyak conditional state. Mitigasi:
  implementasi bertahap dimulai dari tokens/layout wrappers, lalu review tiap state utama.
- **[Over-correction]** → jika hover terlalu dikurangi, UI bisa terasa datar. Mitigasi:
  sisakan highlight kuat pada primary CTA dan interactive controls.

## Migration Plan

Tidak ada migrasi data atau deployment khusus. Perubahan dapat dirilis sebagai frontend-only
update.

Urutan implementasi yang aman:
1. Perbarui design tokens global (font, color roles, container width, hover primitives).
2. Terapkan hierarchy baru pada homepage dan card/listing patterns.
3. Terapkan panel hierarchy pada event detail.
4. Selaraskan create, vote, dan leaderboard pages.
5. Verifikasi build frontend dan uji manual di desktop/mobile.

Rollback: revert perubahan frontend/CSS; tidak ada state persisten yang terpengaruh.

## Open Questions

- Font pendamping body yang dipilih akan memakai web-safe stack atau tambahan Google Font.
  Default yang direkomendasikan: font tambahan ringan khusus body, selama tidak mengurangi
  performa secara signifikan.
