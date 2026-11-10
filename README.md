
# 📚 PustakaKu - Sistem Manajemen Perpustakaan Digital
> **Fullstack CRUD dengan Express.js, Prisma ORM 7, dan Cloud Database Neon PostgreSQL (Serverless)**

---

## 📑 Dokumen Laporan Evidence Lengkap
Dokumen laporan evidence pengujian dan pembuktian perubahan database dapat dilihat di:
👉 **[LAPORAN_EVIDENCE.md](LAPORAN_EVIDENCE.md)**

Laporan tersebut berisi:
- ✅ **Screenshot Skenario Antarmuka (GET, SEARCH, FILTER, POST, PUT, DELETE)**
- ✅ **Screenshot Perubahan Database Neon PostgreSQL (Before - After untuk setiap operasi)**
- ✅ **Tabel Analisis dan Perbandingan Data Before vs After**
- ✅ **Spesifikasi Arsitektur, Konfigurasi Prisma, dan Endpoint Controller**

---

## 🌟 Fitur Utama & Pembuktian CRUD (Prisma & Neon PostgreSQL)

1. **GET (Menampilkan Seluruh Data dari Neon)**
   - Mengambil seluruh koleksi buku langsung dari tabel cloud database Neon PostgreSQL melalui Prisma ORM (`GET /api/books`).
   - Menampilkan data secara dinamis ke tabel interaktif lengkap dengan ID, judul, penulis, kategori, tahun, stok, dan status.
   - Dashboard statistik real-time: Total Judul, Total Stok, Jumlah Kategori, dan Buku Siap Pinjam.
   - Fitur pencarian (*live search*) dan penyaringan (*filter kategori*).

2. **POST (Menambahkan Data melalui Form ke Neon)**
   - Formulir tambah buku dengan validasi input.
   - Request `POST /api/books` dieksekusi dengan Prisma `prisma.book.create()`.
   - Menghasilkan ID unik otomatis (`BK-XXX`) dan notifikasi sukses (toast).

3. **PUT (Mengubah Data melalui Fitur Edit)**
   - Tombol **"✏️ Edit"** di setiap baris memunculkan modal pop-up dengan input terisi otomatis.
   - Request `PUT /api/books/:id` memperbarui record di Neon PostgreSQL dengan `prisma.book.update()`.
   - Data tabel dan statistik langsung sinkron tanpa perlu refresh halaman.

4. **DELETE (Menghapus Data melalui Tombol Hapus)**
   - Tombol **"🗑️ Hapus"** memunculkan modal dialog konfirmasi penghapusan.
   - Request `DELETE /api/books/:id` menghapus data dari Neon PostgreSQL dengan `prisma.book.delete()`.
   - Menghilangkan baris data dan memperbarui ringkasan statistik.

---

## 📁 Struktur Direktori Proyek

```text
pustaka-express/
├── controllers/
│   └── bookController.js       # Controller CRUD Express menggunakan Prisma Client
├── prisma/
│   ├── migrations/             # Direktori migrasi Prisma
│   ├── seed.js                 # Skrip seeder data awal ke Neon PostgreSQL
│   └── schema.prisma           # Skema Prisma (Model Book & datasource PostgreSQL)
├── public/
│   ├── css/
│   │   └── style.css           # Desain modern & responsif (Slate, Indigo & Neon theme)
│   ├── js/
│   │   └── app.js              # Interaktivitas antarmuka & integrasi Fetch API
│   └── index.html              # Tampilan web semantik dengan indikator database
├── routes/
│   └── bookRoutes.js           # Rute API Express untuk operasi CRUD buku
├── screenshots/                # Bukti pengujian aplikasi terhubung ke Neon PostgreSQL
│   ├── 1_tampilan_web_get.png
│   ├── 2_post_form_input.png
│   ├── 3_post_sukses_tambah_data.png
│   ├── 4_put_fitur_edit_modal.png
│   ├── 5_put_sukses_ubah_data.png
│   ├── 6_delete_konfirmasi_modal.png
│   └── 7_delete_sukses_hapus_data.png
├── src/
│   ├── config/
│   │   └── prisma.js           # Inisialisasi Prisma Client & Neon Adapter (@prisma/adapter-neon)
│   └── generated/
│       └── prisma/             # Generated Prisma Client
├── .env                        # Variabel lingkungan koneksi Neon PostgreSQL
├── .env.example                # Template variabel lingkungan
├── .gitignore
├── package.json
├── prisma7.config.ts           # Konfigurasi Prisma 7
├── README.md
├── server.js                   # Server utama Express.js
├── take-screenshots.js         # Skrip otomatis pengujian & tangkapan layar
└── tsconfig.json
```

---

## ⚙️ Konfigurasi Database (Neon PostgreSQL)

File `.env` berisi URL koneksi ke cloud database Neon PostgreSQL:
```env
PORT=3000
DATABASE_URL="postgresql://neondb_owner:npg_9RLdwOtCn8xq@ep-frosty-snow-aos88kvb-pooler.c-2.ap-southeast-1.aws.neon.tech/mlbb_shop?sslmode=require&channel_binding=require&schema=pustaka"
DIRECT_URL="postgresql://neondb_owner:npg_9RLdwOtCn8xq@ep-frosty-snow-aos88kvb.c-2.ap-southeast-1.aws.neon.tech/mlbb_shop?sslmode=require&channel_binding=require&schema=pustaka"
```
> [!NOTE]
> Database menggunakan skema PostgreSQL terisolasi `schema=pustaka` sehingga tidak mengganggu tabel lain yang ada di database.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Instal Dependensi
```bash
npm install
```

### 2. Generate Prisma Client (Opsional jika baru clone)
```bash
npm run prisma:generate
```

### 3. Sinkronisasi Skema Database ke Neon (Opsional)
```bash
npm run prisma:push
```

### 4. Seeding Data Awal (Opsional)
```bash
npm run prisma:seed
```

### 5. Jalankan Server
```bash
npm start
```
Atau dalam mode pengembang (auto-reload):
```bash
npm run dev
```

### 6. Akses Antarmuka Web
Buka browser pada:
```
http://localhost:3000
```

---

## 📡 Dokumentasi Endpoint REST API

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/books` | Menampilkan seluruh data buku dari Neon PostgreSQL |
| `GET` | `/api/books/:id` | Mengambil detail buku berdasarkan ID |
| `GET` | `/api/books/stats/summary` | Mengambil ringkasan statistik koleksi buku |
| `POST` | `/api/books` | Menyimpan buku baru ke Neon PostgreSQL |
| `PUT` | `/api/books/:id` | Mengubah data buku di Neon PostgreSQL |
| `DELETE` | `/api/books/:id` | Menghapus buku dari Neon PostgreSQL |

---

## 📸 Dokumentasi Screenshot (Pengujian Neon PostgreSQL)

Semua bukti visual tersimpan dalam direktori `screenshots/`:

1. **`1_tampilan_web_get.png`**: Tampilan seluruh data buku yang diambil secara live dari cloud database Neon PostgreSQL dengan badge indikator `Express.js + Prisma` & `Neon PostgreSQL`.
2. **`2_post_form_input.png`**: Formulir penambahan data baru yang diisi pengguna.
3. **`3_post_sukses_tambah_data.png`**: Data baru berhasil masuk ke Neon PostgreSQL via Prisma dan langsung tampil di urutan paling atas tabel dengan toast sukses.
4. **`4_put_fitur_edit_modal.png`**: Modal dialog edit data dengan nilai buku yang otomatis dimuat dari database.
5. **`5_put_sukses_ubah_data.png`**: Perubahan berhasil disimpan ke database Neon PostgreSQL dan tabel langsung terupdate.
6. **`6_delete_konfirmasi_modal.png`**: Dialog konfirmasi penghapusan data buku.
7. **`7_delete_sukses_hapus_data.png`**: Data berhasil dihapus dari Neon PostgreSQL via Prisma dan notifikasi muncul.
