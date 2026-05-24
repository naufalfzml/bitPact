## Context

Untuk memperluas fungsionalitas pengorganisasian turnamen, antarmuka Kreator memerlukan proses berurutan 3-fase: `Close Signups` (Mengunci roster) $\rightarrow$ `Draft Bracket` (Mengacak/Menyusun secara otomatis atau manual) $\rightarrow$ `Start Event` (Turnamen Aktif resmi dimulai). 
Saat pendaftaran ditutup, status turnamen tetap `'setup'`, namun kolom `roster_locked` diset menjadi `true`. Ini menutup formulir pendaftaran pemain baru dan membuka konsol interaktif penyusunan bagan draf.

## Goals / Non-Goals

**Goals:**
- Pembuat turnamen dapat menutup pendaftaran lebih awal tanpa langsung mengacak bracket secara *live*.
- Pembuat turnamen dapat mengacak draf bracket secara otomatis (*auto-shuffle*) berulang-ulang tanpa memengaruhi jalannya turnamen sesungguhnya.
- Pembuat turnamen dapat menyusun bracket secara manual (*manual assignment*) melalui dropdown selector interaktif dari daftar sisa pemain yang belum terisi.
- Turnamen resmi dimulai hanya ketika kreator melakukan finalisasi dengan mengklik "■ START EVENT ■".

**Non-Goals:**
- Menambahkan drag-and-drop visual HTML5 yang rumit (menggunakan dropdown select retro yang piksel-akurat agar selaras dengan estetika retro 8-bit).
- Mengubah struktur database Supabase di luar kolom penunjang `roster_locked`.

## Decisions

### 1. Kolom database `roster_locked` pada `events`
* **Pilihan:** Menambahkan kolom `roster_locked BOOLEAN DEFAULT false` ke dalam tabel `events` di Supabase.
* **Alternatif:** Menambahkan nilai `'draft'` baru ke dalam kolom `status` CHECK constraint.
* **Rasional:** Mengubah check constraint database di Supabase membutuhkan query DDL migrasi besar yang berisiko merusak kompatibilitas historis. Menggunakan kolom boolean `roster_locked` jauh lebih aman, bersih, dan memungkinkan pemantauan status registrasi secara terisolasi.

### 2. Antarmuka Draf Bagan Matchup Progresif
* **Pilihan:** Di halaman detail event, saat `status === 'setup' && roster_locked === true`, tampilkan draf bagan interaktif di mana slot `player_a` dan `player_b` dari setiap draf pertandingan dapat dipilih secara manual via dropdown select.
* **Rasional:** Dropdown select retro yang akurat memudahkan Kreator menyusun turnamen dari perangkat seluler (Opera MiniPay) dibandingkan antarmuka *drag-and-drop* mouse yang seringkali rusak di layar sentuh kecil.

## Risks / Trade-offs

- **[Risk]** Kreator keluar halaman sebelum draf bracket disimpan atau difinalisasi.
  * **Mitigasi:** Logika backend akan menyimpan draf bagan ke dalam tabel `brackets` dengan status sementara, atau frontend dapat menyusun draf secara lokal / langsung menyimpannya ke Supabase draf bracket. Kita akan langsung menyimpan draf bracket sementara ke tabel `brackets` agar persistensinya aman. Setiap kali Kreator mengocok ulang atau memodifikasi slot, sistem akan memperbarui baris bagan terkait.
