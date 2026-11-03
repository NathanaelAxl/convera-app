# Convera

SaaS yang mengubah percakapan WhatsApp bisnis menjadi event konversi Meta lewat Meta Conversions API, lalu menampilkan hasilnya di dashboard, Event Log, dan laporan.

**Sumber kebenaran proyek ini adalah `PRD.md`.** Selalu baca bagian yang relevan sebelum mengerjakan tugas. Peta bagian:
- 3 Core Features (fitur per fase + acceptance criteria)
- 4 User Flow
- 5 Architecture (5.4 modul backend, 5.5 struktur repositori)
- 6 Database Schema (6.1 konvensi)
- 7 API Contract (7.1 konvensi umum)
- 8 Halaman & Komponen UI (8.1 peta route, 8.2 komponen bersama)
- 9 Pertanyaan Terbuka

## Struktur & stack
- `apps/web`: Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, TanStack Table, react-hook-form + zod, chart shadcn/ui (Recharts)
- `services/api`: Go + Gin. `cmd/api` (REST API), `cmd/worker` (dispatcher Meta CAPI + scheduler), `internal/<modul>` dengan susunan handler → service → repository (pgx), `migrations` (SQL berversi)
- `services/api/openapi.yaml`: kontrak API, diterjemahkan dari bagian 7 PRD. Tipe TypeScript di `apps/web/lib/api` di-generate dari file ini, jangan ditulis manual.
- Database: PostgreSQL, koneksi lewat `DATABASE_URL` di `.env`

## Aturan kerja
- Kerjakan hanya fitur atau tugas yang diminta. Jangan menyentuh fitur lain.
- Nama tabel, kolom, field JSON, endpoint, dan route harus sama persis dengan PRD. Kalau menurutmu perlu diubah, tanya dulu dan jangan ubah diam-diam.
- Bagian 9 PRD berisi Pertanyaan Terbuka. Selama belum saya putuskan, pakai kolom "Default di PRD ini". Kalau tugas bergantung pada salah satunya, sebutkan nomornya di ringkasan.
- Hal bertanda [asumsi] di PRD tetap diimplementasikan seperti tertulis, tapi daftarkan yang kamu sentuh di ringkasan supaya bisa saya konfirmasi.
- Fitur bertanda Fase 2 sampai 5 tidak dikerjakan sebelum fasenya, termasuk kolom UI atau field yang hanya dipakai fase itu.
- Setiap selesai satu tugas: beri ringkasan perubahan, checklist acceptance criteria, dan daftar [asumsi]/Pertanyaan Terbuka yang terkait, lalu berhenti dan tunggu konfirmasi.
- Saya memakai Windows. Perintah yang kamu sarankan untuk saya jalankan harus bisa jalan di PowerShell (jangan bergantung pada `make`).
- Jangan pernah commit `.env` atau rahasia apa pun.

## Aturan frontend (`apps/web`)
- Halaman dan komponen mengambil data hanya lewat `lib/api`, tidak pernah `fetch` langsung.
- `lib/api/config.ts` berisi daftar modul yang masih memakai data mock (`lib/api/mocks`). Tahap integrasi = mengeluarkan modul dari daftar itu; halaman tidak perlu diubah.
- Klien API mengikuti PRD 7.1: request ke `/api/v1/...` (diteruskan ke Go lewat `rewrites` di `next.config`), cookie httpOnly, header `X-CSRF-Token` dari cookie `csrf_token` untuk POST/PUT/PATCH/DELETE, dan bila 401 panggil `POST /auth/refresh` sekali lalu ulangi request.
- Respons sukses dibaca dari `data` (+ `meta` untuk paginasi); error dari `error.code`, `error.message`, `error.details` (tampilkan per field di form).
- Filter halaman (periode, jenis event, halaman tabel, urutan, tab) selalu disimpan di query string.
- Pakai komponen bersama dari PRD 8.2 (`PeriodFilter`, `KpiCard`, `DataTable`, `EmptyState`, `ConfirmDialog`, `CopyField`, `SecretInput`, `StatusBadge`, dst.) sebelum membuat komponen baru.
- Warna lewat token CSS shadcn/ui agar mudah diganti; dukung tema terang dan gelap.
- Setiap komponen shadcn yang baru dipasang di `components/ui` wajib diberi varian `touch:` (didefinisikan di `app/globals.css`) agar target sentuh minimal 44 px (NFR-16), misalnya `touch:h-11`, `touch:size-11`, atau `touch:min-h-11`.

## Aturan backend (`services/api`)
- Format respons dan error persis PRD 7.1. JSON `snake_case`, waktu ISO 8601 UTC, tanggal `YYYY-MM-DD` Asia/Jakarta.
- `error.code` wajib memakai enum `ErrorCode` di `services/api/openapi.yaml`. Kode baru ditambahkan di sana dulu (lalu `npm run gen:api` di `apps/web`), baru dipakai di kode Go.
- Setiap endpoint `/projects/{slug}/...` wajib mengecek kepemilikan proyek; proyek yang tidak ada atau milik user lain dijawab 404 (bukan 403). Endpoint `/admin/*` wajib role admin (403).
- Kolom berakhiran `_enc` dienkripsi AES-256-GCM dengan kunci dari environment variable; nilai rahasia tidak pernah dikembalikan utuh di respons maupun log.
- Isi pesan WhatsApp tidak pernah disimpan ke database maupun log.
- Webhook: verifikasi signature dulu, idempoten berdasarkan ID pesan, jawab cepat; pengiriman ke Meta hanya dilakukan worker.
- Waktu disimpan `TIMESTAMPTZ` UTC; agregasi memakai `AT TIME ZONE 'Asia/Jakarta'`. Nomor HP disimpan format `62xxxxxxxxxx`. Uang `NUMERIC(14,2)` IDR.
- Setiap endpoint punya test (sukses, validasi gagal, tanpa login, akses proyek milik user lain).

## Aturan Git
- Setiap fitur dikerjakan di branch sendiri yang dibuat dari `main`, dengan awalan sesuai tahap: `fe/` (frontend), `be/` (backend), atau `int/` (integrasi). Contoh: `fe/autentikasi-akun`.
- Commit setelah fitur selesai.
- Merge ke `main` hanya setelah saya konfirmasi.
- Setelah branch fitur di-merge ke `main`, hapus branch-nya.
- Jangan push kecuali saya minta.

## Perintah
<!-- Diisi oleh Claude Code setelah /setup-frontend dan /setup-backend: cara install, run dev, test, generate types, migration, seed. -->

### Frontend (`apps/web`, PowerShell)
- Install: `cd apps/web; npm install`
- Konfigurasi lokal: `Copy-Item .env.example .env.local` (isi `API_URL`, default `http://localhost:8080`)
- Run dev: `npm run dev` → http://localhost:3000. Selama modul ada di `lib/api/config.ts`, data memakai mock; masuk/keluar mock lewat panel di `/login`.
- Generate tipe API dari `services/api/openapi.yaml`: `npm run gen:api` (menulis `lib/api/schema.d.ts`; jalankan setiap kali `openapi.yaml` berubah)
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build produksi: `npm run build`, lalu `npm run start`
- Uji unit, klien API, dan mock (Vitest, `tests/**/*.test.ts`): `npm test`; mode watch: `npm run test:watch`
- Uji E2E (Playwright, `tests/e2e/*.spec.ts`): sekali di awal `npm run test:e2e:install` (mengunduh Chromium), lalu `npm run test:e2e`. Dev server di port 3000 dipakai bila sudah jalan; bila belum, dinyalakan otomatis. Laporan uji yang gagal: `npx playwright show-report`
- Next.js 16.4 berbeda dari versi lama (Cache Components aktif). Baca panduan di `apps/web/node_modules/next/dist/docs/` sebelum memakai API Next.js yang belum pernah dipakai di repo.
