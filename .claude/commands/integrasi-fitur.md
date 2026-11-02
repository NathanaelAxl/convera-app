---
description: Sambungkan frontend ke backend untuk satu fitur
argument-hint: Fase N — Nama Fitur (persis seperti judul di PRD bagian 3)
---
Kerjakan INTEGRASI untuk fitur: $ARGUMENTS

Baca acceptance criteria fitur ini (PRD bagian 3) dan user flow terkait (bagian 4).

Tugas:
1. Pastikan `openapi.yaml` sesuai dengan implementasi Go, generate ulang tipe TypeScript, lalu laporkan setiap perbedaan antara mock dan respons asli sebelum memperbaikinya.
2. Keluarkan modul fitur ini dari daftar mock di `lib/api/config.ts`. Halaman dan komponen sebisa mungkin tidak diubah; kalau terpaksa, jelaskan alasannya.
3. Pastikan alur cookie, CSRF, dan refresh token berjalan lewat rewrites Next.js ke API Go.
4. Tangani error API sesuai PRD 7.1 (400, 401, 402, 403, 404, 409, 422, 429, 500, 502) dengan pesan yang jelas; error 422 tampil per field di form.
5. Jalankan user flow terkait dari awal sampai akhir dengan API dan database sungguhan, lalu perbaiki bug yang ditemukan.
6. Kalau fitur ini memakai endpoint publik (webhook atau tracker), berikan cara mengujinya secara lokal, misalnya contoh request webhook dengan signature yang valid.

Di akhir, beri checklist acceptance criteria dan user flow yang sudah berjalan end-to-end, lalu tunggu konfirmasi.
