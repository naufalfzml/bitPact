# 📜 bitPact Documentation

Selamat datang di pusat dokumentasi teknis **bitPact** — *Generalized Tournament & Campaign Maker* berbasis Web3 yang dirancang khusus untuk mengubah permainan nyata (*real-life matches*) menjadi turnamen berhadiah kripto secara aman, transparan, dan instan via **Opera MiniPay** pada jaringan **Celo**.

---

## 🎮 Konsep & Esensi bitPact

bitPact menjembatani keseruan kompetisi sosial fisik/nyata (seperti catur tongkrongan, basket 3v3, turnamen Tekken lokal, hingga kompetisi sederhana batu-gunting-kertas) dengan keunggulan Web3. Platform ini bertindak sebagai jaminan pihak ketiga (*blind escrow vault*) yang buta, mengunci dana pendaftaran secara desentralisasi penuh, dan mendistribusikannya ke pemenang berdasarkan keputusan konsensus demokratis dari para peserta sendiri.

---

## 🎨 Identitas Visual & Aturan Desain (MANDATORY)

Untuk menjaga keunikan estetika platform, setiap pengembangan antarmuka (frontend) wajib mematuhi aturan ketat berikut:
* **Tema Estetika:** *Minimalist 8-Bit Retro / Pixel Art*. Menggunakan tata letak geometris kotak yang tegas, garis batas piksel tebal, dan palet warna retro HSL yang terkurasi (menolak warna generik polos).
* **Logo Monogram:** Berupa siluet piksel geometris murni tanpa teks (*text-free*).
* **Aturan Tanpa Panah (NO ARROWS):** Seluruh elemen antarmuka **sama sekali tidak boleh menggunakan ikon panah, chevron, atau bentuk penunjuk arah apa pun**. Penanda arah atau navigasi harus digantikan oleh penempatan teks taktis, efek melayang (*hover-effects*), atau transisi state geometris.

---

## 🔄 Alur Utama Sistem (The Core Loop)

Setiap turnamen di bitPact berjalan melalui siklus hidup state terstruktur sebagai berikut:

```
[ Setup ] ──► [ Active ] ──► [ Voting ] ──► [ Ended / Disputed ]
```

1. **Setup (Pembuatan):** *Creator* membuat *Event* baru di platform dengan menentukan mode tanding, harga tiket (USDC), dan aturan audit.
2. **Registration (Pendaftaran):** Peserta mendaftar dengan mendepositkan USDC sesuai harga tiket ke dalam smart contract *escrow vault*.
3. **Active (Jalannya Laga):** *Creator* memulai event secara resmi. Peserta melakukan pertandingan fisik atau sosial di dunia nyata.
4. **Result Input (Klaim Pemenang):** *Creator* menutup event dan memasukkan daftar pemenang pilihan juri ke sistem backend.
5. **Consensus Voting (Pemungutan Suara):** Seluruh peserta melakukan voting kolektif secara demokratis untuk menyetujui atau menolak hasil juri.
6. **Distribution / Refund (Penyelesaian):** 
   - Jika kuorum voting setuju $\rightarrow$ Dana didistribusikan otomatis ke dompet pemenang.
   - Jika voting mayoritas menolak $\rightarrow$ Dana dikembalikan penuh (*emergency refund*) ke seluruh peserta.

---

## 📂 Panduan Direktori Dokumentasi (Index)

Gunakan daftar di bawah ini untuk menavigasi dokumen referensi teknis bitPact secara mendalam:

* 🏗️ **System Architecture** (`ARCHITECTURE.md`) *(belum tersedia)*  
  *Arsitektur tingkat tinggi dan detail interaksi komponen (Wagmi, Express, Supabase, Celo).*
* 📄 **Smart Contract Reference** (`SMART-CONTRACT.md`) *(belum tersedia)*  
  *Panduan lengkap variabel, fungsi `register()`, `distributePrize()`, dan `emergencyRefund()` pada `BitPactVault.sol`.*
* 💾 **Database Schema Guide** (`DATABASE.md`) *(belum tersedia)*  
  *Skema SQL DDL Supabase PostgreSQL untuk tabel events, participants, votes, dan brackets.*
* 🛣️ **Backend API Reference** (`API.md`) *(belum tersedia)*  
  *Referensi lengkap rute endpoint, payload request/response JSON, dan status error Express.js.*
* 🎮 **Game Modes & Bracket Logic** (`GAME-MODES.md`) *(belum tersedia)*  
  *Panduan matematis penentuan bracket untuk Solo PvP (1v1), Team PvP (XvX), dan Free-For-All (FFA).*
* 🛡️ **Consensus & Anti-Troll Engine** (`CONSENSUS.md`) *(belum tersedia)*  
  *Mekanisme 24h timeouts, 50/50 tie disputes, second appeals, serta formula hukuman troll (Minority Penalty).*
* 🛠️ **Developer Setup & Celo MCP Integration** (`SETUP.md`) *(belum tersedia)*  
  *Panduan konfigurasi lingkungan lokal (Foundry, Supabase CLI, Node.js) dan aktivasi Celo MCP Server untuk AI coding assistants.*
