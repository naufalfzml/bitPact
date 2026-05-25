## Context

Untuk meningkatkan nilai utilitas dan fleksibilitas bitPact, alur manajemen turnamen kini diatur secara berurutan:
1. **Open Signups**: Pendaftaran terbuka bebas dengan pembatasan kuota `max_participants` (tanpa dipaksa memilih game mode di awal).
2. **Close Signups**: Kreator menutup registrasi, menyetel `roster_locked = true`.
3. **Select Mode & Draft Bracket**: Setelah roster terkunci, Kreator memilih format game mode asli (PvP 1v1 / Team Mode) sesuai jumlah peserta aktual, lalu merancang bagan (Auto-Shuffle atau manual dropdowns).
4. **Start Event**: Kreator memfinalisasi bagan pertandingan dan mengubah status turnamen menjadi `'active'`.

## Goals / Non-Goals

**Goals:**
- Pembuat turnamen dapat membatasi kuota peserta (`max_participants`) saat inisialisasi turnamen secara dinamis.
- Pembuat turnamen dapat menutup pendaftaran secara manual kapan saja, yang menyetel `roster_locked = true` di database.
- Pembuat turnamen dapat memilih game mode pertandingan yang paling relevan pasca-registrasi ditutup berdasarkan turnout aktual.
- Pembuat turnamen dapat mengocok ulang (*auto-shuffle*) draf atau menetapkan pemain ke slot pertandingan secara manual via dropdown select retro tanpa panah.
- Turnamen resmi dimulai hanya setelah draf bagan final di-submit via "■ START EVENT ■".

**Non-Goals:**
- Menghapus kolom `game_mode` yang ada di database (kita tetap menggunakannya, diisi dengan default placeholder `'1v1'` saat inisialisasi, lalu diperbarui dengan pilihan akhir Kreator setelah registrasi ditutup).
- Menggunakan drag-and-drop HTML5 yang kompleks (kami mempertahankan dropdown select retro pixel-art 8-bit yang bersih dan responsif di layar ponsel MiniPay).

## Decisions

### 1. Placeholder `game_mode` saat Inisialisasi
* **Pilihan:** Menyetel `game_mode: '1v1'` secara default di backend saat `POST /api/events` dipanggil oleh form Create Event.
* **Rasional:** Kolom `game_mode` pada database PostgreSQL/Supabase memiliki constraint `NOT NULL CHECK (game_mode IN ('1v1', 'team', 'ffa'))`. Mengubah check constraint database memerlukan migrasi DDL besar yang berisiko. Dengan menyetel placeholder `'1v1'`, kita tetap mematuhi schema database, dan nilai ini akan diperbarui secara bersih dengan nilai akhir pilihan Kreator saat API `/select-game-mode` dipanggil pasca-penutupan roster.

### 2. Penambahan kolom `max_participants`
* **Pilihan:** Menambahkan kolom `max_participants INTEGER DEFAULT 16` pada tabel `events`.
* **Rasional:** Memberikan batasan kuota pendaftar di frontend untuk kenyamanan Kreator saat inisialisasi turnamen, menggantikan keharusan memilih mode game sejak awal.

### 3. Penyetelan Roster Locked pada Close Signups
* **Pilihan:** Penyetelan `roster_locked = true` dilakukan *hanya* ketika Kreator menekan tombol **■ CLOSE SIGNUPS ■**.
* **Rasional:** Tindakan ini berfungsi sebagai pembatas tegas antara fase registrasi terbuka (siapa saja bisa gabung) dengan fase rancangan bagan (daftar pemain dikunci, tidak bisa mendaftar atau membatalkan lagi).

## Risks / Trade-offs

- **[Risk]** Pemain membatalkan pendaftaran (*withdraw*) atau mendaftar di saat Kreator sedang menyusun draf bagan secara manual.
  * **Mitigasi:** Karena `roster_locked = true` disetel terlebih dahulu di awal sebelum fase draf bagan terbuka, roster pemain dijamin 100% statis selama Kreator menyusun draf. Tidak ada pemain baru yang bisa mendaftar dan tidak ada pemain terdaftar yang bisa keluar, mencegah kegagalan integritas data matchup.
