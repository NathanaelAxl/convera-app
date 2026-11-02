---
description: Setup awal frontend Next.js (apps/web) dan kerangka openapi.yaml, dengan data mock
---
Baca PRD.md bagian 5.1, 5.5, 7.1, dan 8. Kita membangun Convera per fase dengan urutan frontend (data mock), backend, lalu integrasi. Sekarang kerjakan FRONTEND SETUP saja. Jangan buat isi halaman fitur dulu.

Tugas:
1. Inisialisasi Next.js (App Router) + TypeScript di `apps/web`, pasang Tailwind CSS dan shadcn/ui, lalu tambahkan komponen shadcn/ui yang disebut di PRD 8.2.
2. Buat struktur folder sesuai PRD 5.5: `app/(auth)`, `app/(app)/projects`, `app/(app)/admin`, `components/ui`, `components/app`, `lib/api`.
3. Buat `services/api/openapi.yaml` berisi kerangka saja: info, server `/api/v1`, skema bersama dari PRD 7.1 (pembungkus `data`/`meta`, objek `error`, paginasi, parameter `period`, keamanan cookie + header `X-CSRF-Token`). Endpoint fitur ditambahkan nanti per fitur.
4. Siapkan script untuk generate tipe TypeScript dari `openapi.yaml` ke `apps/web/lib/api` (misalnya openapi-typescript).
5. Buat klien API di `lib/api` sesuai aturan frontend di CLAUDE.md: rewrites `/api/v1` ke `API_URL` di `next.config`, CSRF, refresh sekali saat 401, pembacaan `data`/`meta`/`error`.
6. Buat `lib/api/config.ts` (daftar modul yang masih mock) dan folder `lib/api/mocks`. Di mode mock, simulasikan sesi login sederhana supaya halaman yang butuh login bisa dibuka.
7. Siapkan TanStack Query provider, toast Sonner, dan theme provider (terang/gelap).
8. Buat AppShell dari PRD 8.2 (`AppSidebar` dengan menu lengkap, `ProjectSwitcher`, `PageHeader`, `UserCard`; sidebar menjadi `Sheet` di bawah 1024 px). Menu untuk fase berikutnya boleh tampil sebagai placeholder.
9. Buat semua route Fase 1 dari PRD 8.1 sebagai halaman placeholder, plus `not-found.tsx` dan halaman 403. `/projects/[slug]` mengarah ke `/projects/[slug]/dashboard`.
10. Buat komponen bersama dari PRD 8.2 yang dipakai Fase 1: `PageHeader`, `PeriodFilter`, `KpiCard`, `DataTable`, `EmptyState`, `ConfirmDialog`, `CopyField`, `SecretInput`, `StatusBadge`.
11. Tema warna memakai token shadcn/ui di `globals.css` (Pertanyaan Terbuka 25 belum diputuskan).

Setelah selesai: isi bagian "Perintah" di CLAUDE.md (install, run dev, generate types), jelaskan struktur yang dibuat, lalu tunggu konfirmasi.
