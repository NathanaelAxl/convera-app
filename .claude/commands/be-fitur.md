---
description: Implementasikan backend satu fitur dari PRD.md (Go + Gin)
argument-hint: Fase N — Nama Fitur (persis seperti judul di PRD bagian 3)
---
Kerjakan BACKEND untuk fitur: $ARGUMENTS

Baca di PRD.md: deskripsi dan acceptance criteria fitur ini (bagian 3), user flow terkait (bagian 4), modul terkait (5.4), tabel terkait (bagian 6), dan endpoint fitur ini (bagian 7). Jangan ubah apa pun di `apps/web`.

Tugas:
1. Implementasikan endpoint fitur ini persis seperti PRD bagian 7 dan `services/api/openapi.yaml`: method, path, request, response, status code, dan field turunan (tabel di 7.1). Kalau PRD dan `openapi.yaml` berbeda, atau ada yang menurutmu perlu diubah, tanya dulu.
2. Ikuti susunan handler → service → repository di `internal/<modul>`.
3. Validasi input di server dengan aturan yang sama seperti di PRD, dan hasilkan error `422 VALIDATION_ERROR` dengan `details` per field.
4. Terapkan auth sesuai kolom "Auth" endpoint: User (plus cek kepemilikan proyek, 404 bila bukan miliknya), Admin (403), Signature (401 bila tidak valid), atau publik. Untuk mutasi, cek CSRF.
5. Terapkan aturan bisnis dan acceptance criteria fitur ini di service, termasuk kasus tepi yang disebut PRD (rate limit, idempoten, transaksi atomik, enkripsi `_enc`, status proyek nonaktif/expired bila relevan).
6. Kalau fitur ini butuh kerja di `cmd/worker` (misalnya dispatcher Meta CAPI dan retry/backoff), kerjakan juga.
7. Tulis test untuk setiap endpoint: sukses, validasi gagal, tanpa login, dan akses ke proyek milik user lain. Tambahkan test untuk setiap acceptance criteria yang bisa diuji di backend.

Di akhir, tampilkan daftar endpoint yang sudah jadi beserta contoh request PowerShell (`Invoke-RestMethod`) atau `curl.exe`, checklist acceptance criteria, daftar [asumsi] dan Pertanyaan Terbuka yang terkait, lalu tunggu konfirmasi.
