---
description: Bangun frontend satu fitur dari PRD.md memakai data mock
argument-hint: Fase N — Nama Fitur (persis seperti judul di PRD bagian 3)
---
Kerjakan FRONTEND untuk fitur: $ARGUMENTS

Baca di PRD.md: deskripsi dan acceptance criteria fitur ini (bagian 3), user flow terkait (bagian 4), endpoint fitur ini (bagian 7), serta route dan detail halamannya (bagian 8). Kalau fitur ini tidak punya halaman UI sama sekali, katakan itu dan berhenti.

Tugas:
1. Tambahkan endpoint fitur ini dari bagian 7 ke `services/api/openapi.yaml` (path, parameter, request, response, status code, auth), lalu generate ulang tipe TypeScript.
2. Tambahkan fungsi di modul `lib/api` yang sesuai dengan modul backend di PRD 5.4, beserta data mock di `lib/api/mocks` yang bentuknya persis contoh respons di PRD (data Indonesia yang realistis, nomor HP format 62...). Pastikan modulnya terdaftar sebagai mock di `lib/api/config.ts`.
3. Bangun halaman dan komponen fitur ini sesuai bagian 8.3, memakai komponen bersama dari 8.2.
4. Ikuti user flow di bagian 4 langkah demi langkah.
5. Validasi form dengan zod memakai aturan yang sama dengan server (panjang, format, wajib/opsional). Simulasikan juga respons error di mock agar pesan error per field bisa dicek.
6. Tangani state loading, kosong (`EmptyState`), error, dan sukses (toast).
7. Responsif mobile dan desktop, bisa dipakai dengan keyboard, label aksesibilitas sesuai yang disebut PRD.

Jangan sentuh fitur lain. Di akhir, beri checklist acceptance criteria (mana yang terpenuhi dan mana yang baru bisa dicek setelah integrasi), daftar [asumsi] dan Pertanyaan Terbuka yang terkait, lalu tunggu konfirmasi.
