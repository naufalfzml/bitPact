## ADDED Requirements

### Requirement: Pairing match round berikutnya deterministic
Saat menghasilkan pasangan match untuk round berikutnya pada bracket
single-elimination, sistem MUST mengurutkan winners berdasarkan `match_index`
ascending dari round saat ini, lalu pasang `winners[i]` dengan `winners[i+1]`.
Urutan winners MUST NOT bergantung pada order default database (yang tidak
dijamin tanpa `ORDER BY`).

#### Scenario: Round 1 punya 4 match, semua winner di-input
- **GIVEN** round 1 memiliki match_index 0,1,2,3 dengan winner masing-masing A, B, C, D
- **WHEN** match terakhir di-resolve via `POST /:id/bracket/advance`
- **THEN** sistem generate round 2 dengan match_index 0 = (A vs B) dan
  match_index 1 = (C vs D)
- **AND** urutan ini sama setiap kali dijalankan (deterministic)

#### Scenario: Database mengembalikan urutan acak
- **GIVEN** mock supabase mengembalikan `currentRoundMatches` urutan
  [match_index 2, 0, 3, 1]
- **WHEN** generator round berikutnya dipanggil
- **THEN** pairing round 2 tetap mengikuti urutan match_index 0,1,2,3
  (bukan urutan return database)
