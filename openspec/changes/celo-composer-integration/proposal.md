## Why

Platform bitPatch saat ini menggunakan pustaka Ethers.js pada backend, yang sudah didepresiasi oleh Celo Foundation untuk pengembangan DApp baru. Selain itu, pendaftaran dan pencarian peserta masih sepenuhnya bergantung pada alamat wallet 0x yang rumit, sehingga kurang ramah bagi pengguna awam di dunia nyata. Migrasi backend ke Viem (pustaka standar Celo Composer) dan pengintegrasian protokol Social Connect (ODIS) Celo akan meningkatkan performa backend, menyelaraskan tipe data Web3 di seluruh tumpukan teknologi, dan menyajikan fitur pencarian peserta yang revolusioner menggunakan nomor telepon atau email.

## What Changes

- **Backend Blockchain Client Refactoring**: Mengganti pustaka blockchain backend dari Ethers.js ke Viem. Berkas `backend/lib/blockchain.js` akan sepenuhnya menggunakan Viem client (`createWalletClient`, `privateKeyToAccount`, `publicActions`, `getContract`).
- **Pustaka Dependensi**: Menghapus `ethers` dan menambahkan `viem` pada berkas `backend/package.json`.
- **Integrasi Social Connect (Identity Mapping)**: Membuat modul backend baru `backend/lib/socialConnect.js` yang menyimulasikan/mengintegrasikan kueri Social Connect (ODIS) Celo untuk menerjemahkan nomor telepon atau email ke alamat wallet 0x secara aman.
- **Peningkatan Roster & Invites (Frontend & Backend)**:
  * Menambahkan endpoint backend baru `POST /api/social-connect/lookup` untuk resolusi identitas sosial.
  * Memperbarui antarmuka pengguna Next.js untuk memungkinkan kreator mencari, memvalidasi, atau menambahkan peserta ke roster turnamen cukup menggunakan email atau nomor telepon mereka.
- **Deteksi MiniPay Environment (Frontend)**: Mengoptimalkan `providers.tsx` dan landing layout untuk mendeteksi status injected provider MiniPay (`window.ethereum?.isMiniPay`) secara eksplisit guna menyajikan penyesuaian tampilan mobile-first.

## Capabilities

### New Capabilities
- `celo-sdk-migration`: Migrasi backend penuh ke Viem, penghapusan dependensi Ethers.js, dan optimalisasi deteksi platform MiniPay di frontend.
- `social-connect-lookup`: Layanan identitas Sosial Connect (ODIS) Celo untuk menerjemahkan no. telepon / email peserta menjadi wallet 0x secara on-chain dan off-chain.

### Modified Capabilities
<!-- None -->

## Impact

- **Backend**: Berkas `backend/package.json` (penghapusan `ethers`, penambahan `viem`), `backend/lib/blockchain.js` (refaktorisasi total ke Viem client), `backend/routes/events.js` (penyesuaian pemanggilan contract read/write dengan Viem client), berkas baru `backend/lib/socialConnect.js` dan endpoint `/api/social-connect/lookup`.
- **Frontend**: Berkas `frontend/src/app/providers.tsx` (optimasi deteksi MiniPay) dan halaman `frontend/src/app/events/[id]/page.tsx` (fitur input pencarian peserta via identitas sosial).
