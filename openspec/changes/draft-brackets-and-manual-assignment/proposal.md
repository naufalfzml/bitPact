## Why

Saat ini, memulai turnamen (*Start Tournament*) pada platform bitPatch langsung mengacak peserta dan mengaktifkan pertandingan secara instan. Kreator tidak memiliki kontrol untuk memeriksa, mengocok ulang (*reshuffle*), atau menyusun bagan pertandingan secara manual (*manual assignment*) sebelum pertandingan resmi dimulai. Hal ini dapat menyebabkan masalah UX jika ada bagan yang tidak seimbang atau jika kreator ingin menyusun draf bagan secara spesifik terlebih dahulu.

## What Changes

Pembaruan ini memperkenalkan fase baru yaitu **Draf Bagan (Draft Bracket)** dan kemampuan penyusunan secara manual (*manual assignment*) bagi Kreator sebelum turnamen resmi aktif:

- **Penghapusan Tombol Tunggal Roster:** Menghilangkan tombol terpisah "LOCK ROSTER" dan menggabungkannya ke dalam rangkaian alur progresif.
- **Fase Draf Bagan (Draft Bracket Phase):** Memperkenalkan status `roster_locked` pada turnamen untuk menutup pendaftaran pemain dan membuka panel draf penyusunan bagan.
- **Penyusunan Bagan Manual (Manual Assignment):** Menyediakan kontrol dropdown interaktif retro pada setiap slot pertandingan draf (Pemain A / Pemain B), sehingga Kreator dapat memilih peserta terdaftar secara manual.
- **Auto-Shuffle di Fase Draf:** Tombol acak bagan kini mengisi slot draf terlebih dahulu tanpa langsung meluncurkan turnamen secara *real-time*.
- **Finalisasi & Start Event:** Tombol khusus "■ START EVENT ■" untuk mengunci bagan draf final dan secara resmi memulai turnamen (mengubah status menjadi `'active'`).

## Capabilities

### New Capabilities
- `draft-brackets-and-manual-assignment`: Kemampuan menyusun draf bagan turnamen secara otomatis maupun manual dengan dropdown pilihan peserta sebelum turnamen resmi dimulai.

### Modified Capabilities
- `dynamic-brackets-and-roster-upgrades`: Mengubah tombol lock roster menjadi penutupan pendaftaran progresif dan mengubah mekanisme shuffle agar memicu fase draf bagan dan manual assignment terlebih dahulu.

## Impact

- **Database:** Penambahan kolom `roster_locked` (Boolean, default `false`) pada tabel `events` di Supabase untuk mengunci pendaftaran secara independen dari status turnamen.
- **Backend API:**
  - `/api/events/:id/lock-roster` (atau `/api/events/:id/close-signups`) akan mengatur kolom `roster_locked = true` dan mengembalikan draf awal bagan.
  - `/api/events/:id/start` akan divalidasi hanya jika `roster_locked = true` dan akan menyimpan susunan bagan draf final ke database lalu mengaktifkan turnamen (`status = 'active'`).
  - Penambahan rute baru `/api/events/:id/draft-bracket` untuk menyimpan susunan draf bagan sementara yang sedang dirancang secara manual oleh Kreator.
- **Frontend UI:**
  - Halaman detail event `frontend/src/app/events/[id]/page.tsx` akan diperbarui dengan panel Creator Control Console progresif 3-fase: `Close Signups` $\rightarrow$ `Draft & Review Brackets` (Auto Shuffle / Manual Dropdowns) $\rightarrow$ `Start Event`.
