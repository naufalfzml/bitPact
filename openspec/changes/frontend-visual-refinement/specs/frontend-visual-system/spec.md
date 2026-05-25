## ADDED Requirements

### Requirement: Semantic Visual Roles for Core UI States
Frontend bitPact MUST menerapkan semantic color roles yang konsisten pada elemen utama UI.
Warna primary/brand MUST diprioritaskan untuk identitas, heading, dan emphasis merek;
warna success MUST dipakai untuk aksi final atau state approved; warna info MUST dipakai
untuk state sistem netral dan data panel; warna warning MUST dipakai untuk caution banner
dan contextual alerts; warna destructive MUST dipakai untuk error dan aksi penghapusan.
Sistem MUST menghindari pola di mana semua panel, title, dan CTA penting memakai emphasis
visual yang setara.

#### Scenario: User dapat membedakan CTA final dari heading dan warning
- **WHEN** user melihat halaman dengan heading, warning panel, dan final action button
- **THEN** heading brand tidak memakai treatment yang sama dengan warning panel
- **AND** final action button memakai role success yang berbeda jelas dari warning/error

#### Scenario: Info panel tidak bersaing dengan destructive state
- **WHEN** user melihat panel status netral dan panel error pada halaman yang sama
- **THEN** info panel memakai role visual netral/informatif
- **AND** panel error memakai role destructive yang lebih tegas

### Requirement: Split Typography for Display and Interface Copy
Frontend bitPact MUST memisahkan typography display dan typography body. Font display retro
MUST tetap digunakan untuk title, badge, CTA, dan status label. Font body yang lebih mudah
dibaca MUST digunakan untuk paragraph, helper text, input content, tabel, dan copy
panjang. Sistem MUST menjaga nuansa retro tanpa memaksa font display dipakai di seluruh
isi halaman.

#### Scenario: Paragraph dan helper copy lebih mudah dibaca
- **WHEN** user membaca deskripsi panel, helper text form, atau copy tabel
- **THEN** sistem menampilkan copy tersebut dengan typography body yang lebih readable
- **AND** heading serta CTA tetap menggunakan typography display

#### Scenario: Form dan tabel tidak memakai treatment display penuh
- **WHEN** user berinteraksi dengan input, select, dan leaderboard table
- **THEN** isi field dan baris data menggunakan typography body
- **AND** label status atau tombol aksi tetap mempertahankan gaya display retro

### Requirement: Desktop Layout Density and Section Rhythm
Frontend bitPact MUST menyediakan container desktop yang lebih lega daripada layout sempit
saat ini untuk halaman dashboard dan event detail, sambil tetap mempertahankan ritme mobile
single-column. Sistem MUST membedakan spacing antar section utama, card informatif, dan
panel aksi sehingga halaman tidak terasa padat atau rata visualnya.

#### Scenario: Desktop dashboard memiliki ruang baca yang lebih lega
- **WHEN** user membuka homepage atau event detail pada viewport desktop
- **THEN** container utama memberi ruang horizontal yang lebih luas untuk panel-panel utama
- **AND** spacing antar section membuat daftar, filter, dan content blocks tidak saling
  menabrak

#### Scenario: Mobile tetap ringkas dan terbaca
- **WHEN** user membuka halaman yang sama pada viewport mobile
- **THEN** layout tetap runtuh ke satu kolom yang rapi
- **AND** perubahan density desktop tidak merusak keterbacaan mobile

### Requirement: Explicit Panel Hierarchy on Event Detail
Halaman event detail MUST menampilkan hierarchy panel yang jelas antara informasi event,
participation state, creator/jury controls, whitelist or roster management, voting status,
dan arena/bracket board. Sistem MUST membedakan blok-blok tersebut dengan kombinasi title
treatment, spacing, border/background role, atau grouping visual yang cukup untuk
menunjukkan prioritas tanpa mengubah flow produk.

#### Scenario: Participant cepat mengenali blok yang relevan untuk dirinya
- **WHEN** peserta non-creator membuka halaman event detail
- **THEN** blok status partisipasi dan aksi registrasi tampil lebih jelas daripada panel
  admin internal
- **AND** arena board tetap terbaca sebagai area visual utama pertandingan

#### Scenario: Creator cepat mengenali panel kontrol operasional
- **WHEN** creator membuka halaman event detail
- **THEN** panel admin/jury controls tampil sebagai kelompok tindakan operasional yang
  terpisah dari info pasif
- **AND** whitelist, roster, voting progress, dan bracket controls tidak tampak sebagai
  satu kolom panjang dengan prioritas yang sama

### Requirement: Selective Motion and Hover Emphasis
Frontend bitPact MUST membatasi motion dan hover emphasis besar pada elemen yang memang
interaktif atau prioritas tinggi, seperti CTA utama, nav links, dan pilihan actionable.
Card atau panel informatif yang statis MUST TIDAK memiliki treatment interaksi yang sama
dengan tombol utama.

#### Scenario: Static card tidak terasa seaktif tombol utama
- **WHEN** user mengarahkan pointer ke card informatif yang tidak menjadi aksi utama
- **THEN** feedback visual card tetap halus
- **AND** tombol utama mempertahankan emphasis hover yang lebih kuat

#### Scenario: Motion tetap mendukung identitas arcade
- **WHEN** user berinteraksi dengan CTA atau navigation element penting
- **THEN** sistem tetap menampilkan motion singkat yang terasa hidup
- **AND** motion tersebut tidak diterapkan berlebihan ke semua panel statis
