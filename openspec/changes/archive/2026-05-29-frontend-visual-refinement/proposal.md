## Why

Frontend bitPact sudah punya identitas retro yang kuat, tetapi hierarki visualnya masih
terlalu seragam: terlalu banyak elemen memakai warna primer terang, body copy memakai font
display yang berat, dan panel-panel penting di halaman utama/detail event saling bersaing
untuk perhatian. Ini membuat UI terasa padat, lebih melelahkan dibaca, dan kurang tegas
dalam membedakan informasi, aksi, warning, dan status.

## What Changes

- Tambah **refinement pass** pada design system frontend agar setiap warna punya peran
  semantik yang lebih jelas: primary untuk brand/headline, green untuk success/final action,
  cyan untuk info/system state, red untuk destructive/error, orange untuk warning.
- Pisahkan **display typography** dan **body typography** sehingga font pixel-display tetap
  dipakai untuk identitas, badge, CTA, dan label status, sementara body text, helper text,
  tabel, dan form memakai font pendamping yang lebih terbaca.
- Perlebar dan rapikan **desktop layout density** pada container, section spacing, dan
  card grouping agar dashboard/event detail tidak terasa terlalu sempit atau penuh.
- Perjelas **panel hierarchy** pada halaman event detail: info/register state, admin/jury
  controls, whitelist management, voting progress, dan arena/bracket board harus terbaca
  sebagai blok dengan prioritas yang berbeda.
- Kurangi hover/motion yang terlalu seragam pada card dan blok statis, sehingga hanya
  elemen interaktif utama yang terasa “aktif”.

## Capabilities

### New Capabilities
- `frontend-visual-system`: Menentukan semantic color roles, typography hierarchy,
  container/layout spacing, dan panel priority rules untuk halaman frontend utama bitPact.

### Modified Capabilities

## Impact

- **Frontend**:
  - `frontend/src/app/globals.css`: palette roles, typography tokens, container width,
    spacing, hover rules, dan panel styling.
  - `frontend/src/app/layout.tsx`: header/footer hierarchy bila perlu penyelarasan visual.
  - `frontend/src/app/page.tsx`: hero, feature cards, filter bar, dan event list hierarchy.
  - `frontend/src/app/events/[id]/page.tsx`: pemisahan visual panel info, admin controls,
    roster/whitelist, voting, dan arena board.
  - `frontend/src/app/events/create/page.tsx`, `frontend/src/app/events/[id]/vote/page.tsx`,
    `frontend/src/app/leaderboard/page.tsx`: penyelarasan typography, status styling, dan
    card density.
- **Backend / API / Smart Contract**: tidak berubah.
- **Migration / Data**: tidak ada migrasi schema atau data.
