# 📄 Smart Contract Reference: BitPatchVault.sol

Dokumen ini menyediakan spesifikasi antarmuka teknis dan manual integrasi untuk smart contract **BitPatchVault.sol** yang dideploy di jaringan **Celo** (Alfajores Testnet / Mainnet) sebagai modul jaminan (*escrow vault*).

---

## 🔒 Desain Keamanan & Kepercayaan

Kontrak pintar ini dirancang sebagai **blind escrow** yang buta terhadap detail permainan nyata, tetapi patuh secara penuh pada aturan penguncian aset:
* **Token yang Didukung:** **cUSD** (Celo Dollar) ERC20 Token.
* **Otoritas Ganda:** Transaksi pendaftaran dilakukan secara langsung dan sukarela oleh peserta. Sementara itu, eksekusi pencairan atau pengembalian dana hanya bisa dipicu oleh dompet backend terotorisasi (*authorized backend admin wallet*) setelah konsensus demokratis selesai dihitung.
* **Keamanan Reentrancy:** Memanfaatkan `ReentrancyGuard` pada seluruh fungsi penarikan/transfer dana untuk mencegah serangan re-entrancy.

---

## 💾 Struktur Data & Variabel State

### 1. Struktur Data `EventInfo`
Menyimpan konfigurasi on-chain dan metadata keuangan untuk setiap event turnamen:
```solidity
struct EventInfo {
    uint256 ticketPrice;       // Harga tiket masuk turnamen (dalam cUSD unit wei, e.g. 10^18)
    address creator;           // Alamat wallet pembuat turnamen (Creator)
    uint256 totalPrizePool;    // Total akumulasi dana hadiah yang saat ini terkunci di vault
    bool isDistributed;        // Status penanda apakah dana sudah dicairkan/selesai didistribusikan
    address[] participants;    // Array penyimpan seluruh alamat dompet peserta terdaftar
}
```

### 2. Variabel State Utama
```solidity
// Alamat kontrak token ERC20 cUSD resmi di jaringan Celo
IERC20 public immutable cUSDToken;

// Alamat dompet backend/admin yang memiliki otoritas memanggil fungsi administratif
address public adminWallet;

// Mapping utama pencari informasi event berdasarkan eventId (ke-32 byte hash unik)
mapping(bytes32 => EventInfo) public events;

// Double mapping untuk melacak registrasi guna mencegah pendaftaran ganda peserta
// mapping(eventId => mapping(participantAddress => isRegistered))
mapping(bytes32 => mapping(address => bool)) public isRegistered;
```

---

## 🛠️ Antarmuka Fungsi (Functions API)

### 1. `createEvent`
Membuat instance event turnamen baru on-chain. Hanya dapat dipanggil oleh `adminWallet` atau `owner`.
```solidity
function createEvent(
    bytes32 eventId,
    uint256 ticketPrice,
    address creator
) external onlyAdmin;
```
* **Parameter:**
  - `eventId`: Hash bytes32 unik hasil komputasi string UUID event.
  - `ticketPrice`: Nilai nominal tiket dalam cUSD (1 cUSD = `1000000000000000000` wei).
  - `creator`: Alamat dompet pembuat turnamen asli.
* **Persyaratan / Validasi:**
  - `eventId` tidak boleh kosong dan belum pernah didaftarkan sebelumnya.
  - `ticketPrice` harus lebih besar dari 0.
  - Penelepon transaksi harus merupakan `adminWallet`.

### 2. `register`
Peserta menyetorkan dana tiket masuk turnamen secara langsung ke vault.
```solidity
function register(bytes32 eventId) external nonReentrant;
```
* **Parameter:**
  - `eventId`: Hash bytes32 dari event turnamen target yang sedang dibuka.
* **Persyaratan / Validasi:**
  - Event harus sudah terdaftar (valid).
  - Pendaftaran ganda ditolak (`isRegistered[eventId][msg.sender]` harus bernilai `false`).
  - Event belum mengalami distribusi hadiah (`isDistributed` harus `false`).
  - Peserta wajib melakukan transaksi `approve()` cUSD token ke alamat kontrak vault sebesar `ticketPrice` terlebih dahulu.
* **Cara Kerja:** Kontrak akan mengeksekusi `transferFrom` dari dompet peserta ke saldo kontrak pintar, mencatat alamat peserta ke array `participants`, menandai `isRegistered` sebagai `true`, dan menambahkan total saldo `totalPrizePool`.

### 3. `distributePrize`
Mendistribusikan seluruh saldo hadiah (*prize pool*) ke para pemenang. Hanya dapat dipanggil oleh `adminWallet`.
```solidity
function distributePrize(
    bytes32 eventId,
    address[] calldata winners,
    uint256[] calldata shares
) external onlyAdmin nonReentrant;
```
* **Parameter:**
  - `eventId`: Hash bytes32 unik turnamen target.
  - `winners`: Array berisi alamat dompet peserta yang dinyatakan sebagai juara.
  - `shares`: Array nilai nominal hadiah (dalam cUSD wei) yang akan ditransfer ke masing-masing juara secara sejajar dengan index array `winners`.
* **Persyaratan / Validasi:**
  - Status event belum didistribusikan (`isDistributed == false`).
  - Panjang array `winners` harus sama dengan panjang array `shares`.
  - Jumlah total nilai nominal `shares` yang dikirimkan harus **tepat sama** dengan nilai `totalPrizePool` yang terkunci di dalam event tersebut.
* **Cara Kerja:** Mengirimkan token cUSD langsung ke dompet masing-masing pemenang, mengubah state `isDistributed` menjadi `true` untuk mencegah pencairan ganda.

### 4. `emergencyRefund`
Mengembalikan seluruh tiket peserta tanpa potongan jika konsensus menyatakan juri bersalah. Hanya dapat dipanggil oleh `adminWallet`.
```solidity
function emergencyRefund(bytes32 eventId) external onlyAdmin nonReentrant;
```
* **Parameter:**
  - `eventId`: Hash bytes32 unik turnamen target.
* **Persyaratan / Validasi:**
  - Status event belum didistribusikan (`isDistributed == false`).
  - Array `participants` minimal harus berisi 1 alamat terdaftar.
* **Cara Kerja:** Melakukan iterasi ke seluruh alamat di array `participants`, mentransfer kembali cUSD sebesar harga tiket masuk (`ticketPrice`) asal ke masing-masing alamat dompet, dan mengosongkan nilai `totalPrizePool`.

---

## 📢 Event Emisi (Emission Events)

Kontrak mengemisi event berikut ke jaringan blockchain Celo agar backend (Express.js) dan frontend (Next.js) dapat melacak status transaksi secara asinkron:

### 1. `EventCreated`
Diemisi ketika turnamen baru berhasil didaftarkan di jaringan blockchain.
```solidity
event EventCreated(
    bytes32 indexed eventId,
    uint256 ticketPrice,
    address indexed creator
);
```

### 2. `ParticipantRegistered`
Diemisi setiap kali ada peserta baru yang sukses mendepositkan dana pendaftaran.
```solidity
event ParticipantRegistered(
    bytes32 indexed eventId,
    address indexed participant
);
```

### 3. `PrizeDistributed`
Diemisi setelah backend admin berhasil mencairkan seluruh total hadiah turnamen kepada para juara.
```solidity
event PrizeDistributed(
    bytes32 indexed eventId,
    address[] winners,
    uint256[] shares
);
```

### 4. `EmergencyRefundExecuted`
Diemisi ketika pengembalian dana darurat dipicu dan berhasil mengembalikan cUSD peserta.
```solidity
event EmergencyRefundExecuted(
    bytes32 indexed eventId,
    uint256 totalRefunded
);
```
