---
description: Setup awal backend Go + Gin (services/api), migrasi database, dan seed
---
Baca PRD.md bagian 5 (Architecture), 6 (Database Schema), dan 7.1 (konvensi API). Sekarang kerjakan BACKEND SETUP. Jangan ubah apa pun di `apps/web`.

Tugas:
1. Inisialisasi Go module di `services/api` dengan struktur PRD 5.5: `cmd/api`, `cmd/worker`, `internal/<modul>` untuk modul di PRD 5.4 (cukup kerangka handler → service → repository), `internal/ingest/adapters`, `migrations`.
2. Konfigurasi dari environment variable, beserta `.env.example` yang lengkap: `DATABASE_URL`, port API, secret JWT, kunci enkripsi AES-256-GCM untuk kolom `_enc`, origin aplikasi, dan variabel SMTP.
3. Pilih tool migrasi SQL berversi yang jalan di Windows (jelaskan pilihanmu), lalu buat migrasi dari bagian 6: extension `citext`, semua tipe enum (6.2), dan semua tabel beserta PK, FK (termasuk `ON DELETE` sesuai relasi 6.4), unique, dan index. Tabel bertanda Fase 5 jangan dibuat dulu.
4. Siapkan akses database dengan pgx; kalau memakai sqlc seperti usulan PRD, siapkan konfigurasinya.
5. Middleware dasar: request ID, logging (tanpa isi pesan WhatsApp dan tanpa rahasia), recovery, dan error handler yang menghasilkan format error PRD 7.1.
6. Endpoint health check, serta `cmd/worker` yang sudah bisa jalan dan terhubung ke database (logika dispatcher menyusul di fitur Pipeline Webhook).
7. Seed data: satu user admin dan satu user biasa, isi `default_keywords`, serta proyek contoh yang datanya mirip mock di `apps/web/lib/api/mocks`.
8. Siapkan cara menjalankan test dengan database terpisah (`TEST_DATABASE_URL`).

Setelah selesai: perbarui bagian "Perintah" di CLAUDE.md (run API, run worker, migrasi naik/turun, seed, test), jelaskan langkah menjalankannya di PowerShell, lalu tunggu konfirmasi.
