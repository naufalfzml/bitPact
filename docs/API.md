# 🛣️ Express.js Backend API Reference

Dokumen ini menyediakan spesifikasi lengkap untuk API Backend Core berbasis **Express.js** yang melayani platform **bitPatch**.

---

## 🔒 Konvensi Umum API

* **Base URL:** `http://localhost:3001/api` (Lokalan) atau `https://api.bitpatch.xyz/api` (Staging/Production)
* **Content-Type:** Seluruh request body wajib bertipe `application/json`.
* **Standardisasi HTTP Status Codes:**
  - `200 OK`: Aksi berhasil diselesaikan.
  - `201 Created`: Pembuatan resource baru (misal: Event) berhasil.
  - `400 Bad Request`: Validasi payload input gagal atau kondisi tidak valid.
  - `401 Unauthorized`: Panggilan gagal karena tanda tangan wallet/autentikasi salah.
  - `404 Not Found`: Turnamen atau resource tidak ditemukan di database.
  - `500 Internal Server Error`: Kegagalan tak terduga pada server atau transaksi Celo revert.

---

## 🚦 Endpoint Referensi

### 1. `POST /events`
Membuat turnamen baru. API akan menyimpan data di Supabase dan memicu pembuatan event di smart contract Celo via *admin wallet*.

* **Request Body:**
```json
{
  "title": "chess_tongkrongan_sabtu",
  "game_mode": "1v1",
  "team_size": 1,
  "ticket_price": 2.50,
  "photo_required": false,
  "creator_address": "0x9876543210abcdef9876543210abcdef98765432"
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Event successfully created on-chain and database.",
  "data": {
    "id": "e4b9c1d0-9988-4433-2211-aaccbbaadd99",
    "creator_address": "0x9876543210abcdef9876543210abcdef98765432",
    "title": "chess_tongkrongan_sabtu",
    "game_mode": "1v1",
    "team_size": 1,
    "ticket_price": 2.50,
    "photo_required": false,
    "status": "setup",
    "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }
}
```

---

### 2. `POST /events/:id/register`
Memverifikasi setoran tiket peserta turnamen. Dipanggil setelah frontend mendeteksi suksesnya fungsi `register()` on-chain.

* **Path Parameter:**
  - `id`: UUID dari turnamen target.
* **Request Body:**
```json
{
  "wallet_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "transaction_hash": "0x7777777777777777777777777777777777777777777777777777777777777777"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Participant registration verified and logged.",
  "data": {
    "event_id": "e4b9c1d0-9988-4433-2211-aaccbbaadd99",
    "wallet_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "team_id": null,
    "status": "registered"
  }
}
```

---

### 3. `POST /events/:id/start`
Memulai turnamen secara resmi. Hanya bisa dipanggil oleh `creator_address` turnamen terkait.

* **Path Parameter:**
  - `id`: UUID turnamen.
* **Request Body:**
```json
{
  "creator_address": "0x9876543210abcdef9876543210abcdef98765432"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Tournament officially started. Brackets generated.",
  "status": "active",
  "brackets_generated": 4
}
```

---

### 4. `POST /events/:id/winners`
Menginputkan daftar nama pemenang hasil penilaian juri (Creator). Menggeser state turnamen ke fase `voting`.

* **Path Parameter:**
  - `id`: UUID turnamen.
* **Request Body:**
```json
{
  "creator_address": "0x9876543210abcdef9876543210abcdef98765432",
  "winners": [
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "0xaaaaabbbbbcccccdddddeeeeefffffggggghhhhh"
  ],
  "shares": [
    "3750000000000000000",
    "1250000000000000000"
  ]
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Winners submitted. Event state transitioned to voting phase.",
  "status": "voting",
  "voting_ends_at": "2026-05-23T22:47:30+07:00"
}
```

---

### 5. `POST /events/:id/vote`
Mengirimkan suara konsensus setuju/tolak terhadap keputusan juri. Hanya boleh dipanggil oleh peserta terdaftar di turnamen terkait.

* **Path Parameter:**
  - `id`: UUID turnamen.
* **Request Body:**
```json
{
  "voter_address": "0x1111222233334444555566667777888899990000",
  "is_valid": true
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Consensus vote cast successfully.",
  "consensus_reached": false,
  "current_votes": {
    "total": 3,
    "valid": 3,
    "invalid": 0
  }
}
```
*Note:* Jika suara ini merupakan suara peserta terakhir yang ditunggu, backend akan otomatis memicu kalkulasi voting dan mengeksekusi `distributePrize()` atau `emergencyRefund()` on-chain.

---

### 6. `POST /events/:id/appeal`
Mengajukan banding kedua dengan merevisi nama pemenang apabila voting sebelumnya menghasilkan *TIE* (50/50). Hanya bisa dipanggil jika turnamen berstatus `disputed`.

* **Path Parameter:**
  - `id`: UUID turnamen.
* **Request Body:**
```json
{
  "creator_address": "0x9876543210abcdef9876543210abcdef98765432",
  "winners": [
    "0xaaaaabbbbbcccccdddddeeeeefffffggggghhhhh"
  ],
  "shares": [
    "5000000000000000000"
  ]
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Appeal submitted successfully. Resetting votes for secondary round.",
  "status": "voting",
  "appeal_round": 2
}
```

---

## 🚫 Standardisasi Format Error

Untuk menjaga kekonsistenan integrasi frontend-backend, seluruh error API wajib dikembalikan dengan struktur JSON berikut:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_BLOCKED_OR_INVALID",
    "message": "Cannot register for event. Registration is already closed.",
    "details": "Event status is currently 'active' instead of 'setup'."
  }
}
```
*Daftar Error Code Umum:*
- `AUTHORIZATION_FAILED`: Wallet memanggil fungsi admin atau creator tanpa hak akses.
- `DUPLICATE_RESOURCE`: Wallet peserta mencoba melakukan registrasi ganda.
- `INVALID_PAYLOAD`: Nilai nominal, array pemenang, atau format data tidak valid.
- `BLOCKCHAIN_REVERTED`: Kegagalan interaksi RPC atau kegagalan on-chain Celo.
