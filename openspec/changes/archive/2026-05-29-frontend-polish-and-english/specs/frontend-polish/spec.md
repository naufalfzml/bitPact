## ADDED Requirements

### Requirement: Toast notifications menggantikan `alert()` positive
Frontend MUST menyediakan komponen toast 8-bit kustom yang dipakai untuk
feedback positif (success / info / warning) dan error non-destruktif.
`alert()` browser native tidak boleh dipakai lagi untuk feedback semacam itu.
`confirm()` boleh tetap untuk operasi destruktif (mis. remove participant)
sampai modal pixel pengganti dibuat.

#### Scenario: Registrasi sukses
- **WHEN** user berhasil register ke tournament
- **THEN** toast `success` muncul dengan pesan "Registration successful! Welcome, player."
- **AND** toast auto-dismiss setelah ~4 detik
- **AND** tidak ada `alert()` browser yang muncul

#### Scenario: Error registrasi
- **WHEN** registrasi gagal (mis. password salah)
- **THEN** toast `destructive` muncul berisi pesan error dari backend
- **AND** banner password error tetap muncul di form (untuk konteks)

### Requirement: RPG status bar visible di semua viewport
RPG status bar yang menampilkan HP / USDC / CELO MUST tetap terlihat saat
viewport mobile (≤720px). Layout boleh berbeda dengan desktop, tapi
informasi MUST NOT disembunyikan.

#### Scenario: Mobile viewport menampilkan status
- **GIVEN** user terhubung wallet dan membuka di viewport ≤720px
- **WHEN** halaman manapun di-render
- **THEN** chip HP / USDC / CELO terlihat (mungkin pada baris terpisah di bawah header)

### Requirement: Voter melihat vote yang sudah diberikan
Halaman vote MUST menampilkan banner yang memberi tahu user apakah ia sudah
AGREE / REJECT pada event tersebut, dan MUST men-disable tombol vote bila
sudah pernah vote. Backend MUST mengekspos field `my_vote` di
`GET /api/events/:id?wallet=<addr>`.

#### Scenario: Voter sudah AGREE
- **GIVEN** wallet voter sudah submit vote AGREE
- **WHEN** voter membuka halaman vote
- **THEN** banner "You voted AGREE" muncul
- **AND** tombol AGREE & REJECT di-disable

#### Scenario: Voter belum vote
- **GIVEN** wallet voter belum submit vote
- **WHEN** halaman vote dibuka
- **THEN** banner my-vote tidak ada
- **AND** tombol AGREE & REJECT enable

#### Scenario: Wallet bukan peserta
- **GIVEN** wallet yang terhubung bukan peserta
- **WHEN** halaman vote dibuka
- **THEN** banner audit-only muncul dan tombol tetap disabled (perilaku existing)

### Requirement: Photo upload menampilkan preview & validasi ukuran
Frontend MUST menampilkan preview thumbnail file yang dipilih sebelum upload.
File yang lebih besar dari 5 MB MUST ditolak client-side dengan toast error.
Backend MUST menolak file > 5 MB atau non-image lewat multer config.

#### Scenario: Pilih file dalam batas
- **GIVEN** user winner memilih JPG 2 MB
- **WHEN** dialog file ditutup
- **THEN** thumbnail file terlihat di bawah input
- **AND** tombol "Submit Proof" enable

#### Scenario: File terlalu besar
- **GIVEN** user memilih file 10 MB
- **THEN** toast error muncul "Photo must be 5MB or smaller."
- **AND** file tidak di-set
- **AND** tombol submit tetap disabled

#### Scenario: File non-image diunggah ke backend (defense in depth)
- **GIVEN** request multipart dengan mimetype `application/zip`
- **WHEN** backend memproses
- **THEN** respons `400` dengan pesan "Only image uploads are allowed"

### Requirement: WalletConnect projectId dari env
Frontend MUST membaca `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` dari environment.
Fallback ke placeholder dev boleh, tetapi MUST mengeluarkan warning di console
agar developer tahu perlu disetel sebelum production.

#### Scenario: Env var diset
- **WHEN** `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="real-project-id"`
- **THEN** RainbowKit / WalletConnect menggunakan value tersebut
- **AND** tidak ada warning di console

#### Scenario: Env var kosong
- **WHEN** `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` tidak diset
- **THEN** WalletConnect menggunakan fallback dev
- **AND** console.warn memberi instruksi setup

### Requirement: Brand monogram text-free
Logo header MUST text-free (tidak boleh mengandung huruf / wordmark). MUST
direpresentasikan sebagai SVG pixel art (atau setara) yang merefleksikan
salah satu motif: bracket tree, vault block, atau coin stack — sesuai pilihan
yang diambil pada implementasi.

#### Scenario: Logo header tanpa teks
- **WHEN** user membuka halaman manapun
- **THEN** logo di header bukan teks `_bP_`
- **AND** logo adalah SVG monogram tanpa karakter alfabet

### Requirement: User-facing strings konsisten dalam English
Semua label UI, banner, pesan error API (frontend menerima dari backend),
button text, dan placeholder MUST ditulis dalam English. String Bahasa
Indonesia tidak boleh muncul di halaman manapun.

#### Scenario: Smoke text scan
- **WHEN** reviewer membuka home / create / detail / vote pages
- **THEN** tidak ada teks Indonesia (mis. "Pendaftaran", "Kreator",
  "Anda", "tidak diizinkan") yang muncul
- **AND** error message backend (response body `error`) juga English

#### Scenario: Backend error response
- **WHEN** registrasi ditolak karena roster locked
- **THEN** response berisi `error: "Registration is closed (roster locked)"`
- **AND** bukan teks Indonesia
