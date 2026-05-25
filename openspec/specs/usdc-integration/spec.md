# usdc-integration Specification

## Purpose
TBD - created by archiving change usdc-integration. Update Purpose after archive.
## Requirements
### Requirement: Integrasi Alamat Kontrak USDC Native Circle
Kontrak `BitPactVault` dan seluruh konfigurasi environment (`backend/.env` dan `frontend/.env.local`) SHALL/MUST dikonfigurasi menggunakan alamat kontrak native USDC resmi dari Circle untuk ekosistem Celo:
- **Celo Sepolia Testnet**: `0x01C5C0122039549AD1493B8220cABEdD739BC44E`
- **Celo Mainnet**: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`

#### Scenario: Deployment Kontrak Vault Sukses dengan USDC Native
- **WHEN** skrip deployment `Deploy.s.sol` dijalankan pada testnet Celo Sepolia
- **THEN** sistem men-deploy kontrak `BitPactVault` yang valid dengan menyematkan alamat resmi USDC Sepolia (`0x01C5C0122039549AD1493B8220cABEdD739BC44E`) sebagai konstruktor token stablecoin
- **AND** file `.env` diisi dengan alamat kontrak vault baru tersebut secara akurat

---

### Requirement: Penanganan Presisi 6 Desimal untuk USDC
Seluruh kalkulasi matematis transaksi, approval token, pendaftaran turnamen, serta penayangan saldo stablecoin di frontend dan backend SHALL/MUST disesuaikan secara konsisten menggunakan **6 desimal** (standar USDC native global) menggantikan standar 18 desimal lama.

#### Scenario: Kueri Saldo dan Persetujuan Transaksi Terformat Sesuai 6 Desimal
- **GIVEN** saldo USDC pengguna di testnet terdeteksi sebagai `10000000` unit (setara 10 USDC)
- **WHEN** status bar memformat saldo tersebut menggunakan helper `formatUnits` dengan nilai `6` desimal
- **THEN** RPG Status Bar menampilkan saldo secara tepat sebagai `10.00` USDC
- **AND** tombol persetujuan (`approve`) mengirimkan transaksi dengan nilai presisi 6 desimal (`parseUnits(ticketPrice, 6)`) tanpa mengalami kegagalan/revert akibat overflow nominal

---

### Requirement: Penyelarasan UI dari cUSD ke USDC
Seluruh visualisasi elemen antarmuka, penjelasan platform, label HP/bag status bar, form input pembuatan event, placeholder tiket, dan pesan status pendaftaran turnamen SHALL/MUST diselaraskan dari `cUSD` / `USDm` menjadi `USDC`.

#### Scenario: Visual Antarmuka Menampilkan Label USDC Secara Menyeluruh
- **WHEN** pengguna memuat halaman utama, halaman detail turnamen, atau halaman pembuatan event
- **THEN** semua teks, label form input, penjelasan keamanan, HP HP/bag status bar header, dan tombol register menampilkan representasi simbol mata uang yang konsisten yakni `USDC`

---

### Requirement: Sinkronisasi Transaksi Sekuensial & Sinkronisasi Desimal Backend
Seluruh alur transaksi transaksi kontrak multi-tahap (seperti persetujuan token dilanjutkan dengan deposit escrow) dan komputasi nilai on-chain di backend SHALL/MUST terkoordinasi secara sinkron dan menggunakan skala desimal 6 desimal USDC yang seragam untuk mencegah kegagalan *allowance* dan transaksi *reverted*.

#### Scenario: Menunggu Konfirmasi On-Chain untuk Transaksi Persetujuan (Approve)
- **WHEN** pengguna menyetujui transaksi persetujuan token `approve` di frontend
- **THEN** sistem Next.js SHALL/MUST menunggu konfirmasi blok transaksi persetujuan selesai dikonfirmasi on-chain (`waitForTransactionReceipt`) sebelum memicu transaksi pendaftaran (`register`)
- **AND** wallet pengguna terhindar dari warning kegagalan simulasi akibat saldo/allowance bernilai 0

#### Scenario: Backend Menggunakan 6 Desimal untuk Pendaftaran & Distribusi Hadiah
- **WHEN** backend mendaftarkan event baru (`createEvent`) ke kontrak pintar atau menghitung pembagian hadiah (`distributePrize`)
- **THEN** backend Express.js SHALL/MUST memformat nominal harga tiket dan total pool menggunakan utilitas `parseUnits` dengan ketetapan **6 desimal**
- **AND** nominal tiket on-chain di kontrak pintar sejalan dengan persetujuan token di frontend sehingga transfer dana berjalan lancar tanpa revert dari kontrak token USDC

