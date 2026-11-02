---
description: Review menyeluruh setelah semua fitur dalam satu fase terintegrasi
argument-hint: Fase N
---
Semua fitur $ARGUMENTS sudah terintegrasi. Lakukan review terhadap PRD.md:

1. Buat tabel status setiap FR dan acceptance criteria milik $ARGUMENTS: terpenuhi, sebagian, atau belum, beserta bukti singkat (file, test, atau langkah uji).
2. Cek kebutuhan non-fungsional (PRD 2.2) yang relevan dengan fase ini.
3. Cek keamanan: kepemilikan proyek di setiap endpoint `/projects/{slug}/...` (coba akses proyek milik user lain), endpoint admin, CSRF di semua mutasi, rate limit login, signature webhook, rahasia tidak muncul di respons atau log, isi pesan WhatsApp tidak tersimpan.
4. Jalankan semua test backend dan build frontend; perbaiki yang gagal.
5. Hapus mock yang sudah tidak dipakai, rapikan kode, dan pastikan `openapi.yaml` sesuai dengan implementasi.
6. Perbarui README (install, menjalankan API, worker, dan web, environment variable) dan bagian "Perintah" di CLAUDE.md.
7. Daftar [asumsi] dan Pertanyaan Terbuka (PRD bagian 9) yang dipakai selama fase ini dan masih perlu saya putuskan.
