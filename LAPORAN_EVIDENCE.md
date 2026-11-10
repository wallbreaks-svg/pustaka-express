# 📑 LAPORAN EVIDENCE IMPLEMENTASI PRISMA ORM & CLOUD DATABASE NEON POSTGRESQL
## Proyek: PustakaKu - Sistem Manajemen Perpustakaan Digital (Fullstack CRUD)

---

### 👤 Identitas Pengembang
- **Nama Pengembang** : Rifqy Aqila
- **Topik Tugas**      : Integrasi Prisma ORM & Cloud Database Neon PostgreSQL pada Aplikasi Fullstack CRUD (Express.js, HTML, CSS, JavaScript)
- **Repositori Folder**: `pustaka-express`
- **Region Database**  : AWS Asia Pacific (Singapore) `ap-southeast-1`
- **Status Pengujian** : ✅ **Lolos Uji Seluruh Skenario (GET, POST, PUT, DELETE) + Terverifikasi Before-After Database**

---

## 1. 🏗️ Arsitektur Sistem & Spesifikasi Teknologi

Aplikasi **PustakaKu** merupakan sistem manajemen koleksi buku digital berbasis arsitektur **Client-Server RESTful API** yang dirancang dengan pemisahan tanggung jawab yang jelas (*Separation of Concerns*). Seluruh data buku disimpan secara persisten di database cloud **Neon PostgreSQL** dan diakses melalui **Prisma ORM 7**.

```
+--------------------------------------------------------------------------+
|                       FRONT-END (CLIENT BROWSER)                         |
|   HTML5 Semantik  |  CSS3 Modern (Slate/Indigo)  |  Vanilla JS (Fetch API)|
|   - Real-time Stats Dashboard (Total Buku, Stok, Kategori, Status)       |
|   - Form Tambah Buku (POST) dengan Validasi Input                        |
|   - Live Search & Filtering Kategori (GET Dynamic Query)                 |
|   - Modal Pop-up Edit Buku (PUT) & Modal Konfirmasi Hapus (DELETE)       |
+--------------------------------------------------------------------------+
                                    │ ▲
                     HTTP REST API  │ │ JSON Response
                     (Fetch Client) │ │ (Status, Message, Data)
                                    ▼ │
+--------------------------------------------------------------------------+
|                     BACK-END (EXPRESS.JS SERVER)                         |
|   Express.js (v4.21.2)  |  Node.js (v24.16.0)  |  TSX / TypeScript Engine |
|   - CORS & JSON Body Parser Middleware                                   |
|   - Request Logger Middleware                                            |
|   - Controller CRUD (getAllBooks, getBookById, createBook, updateBook,   |
|     deleteBook, getBookSummaryStats)                                     |
|   - Error Handling & Route Not Found Middleware                          |
+--------------------------------------------------------------------------+
                                    │ ▲
                 Prisma Client Calls│ │ Type-safe Entities
               (@prisma/adapter-neon)│ │ (Prisma Model: Book)
                                    ▼ │
+--------------------------------------------------------------------------+
|                     PRISMA ORM & DATABASE ADAPTER                        |
|   Prisma ORM (v7.10.1)  |  @neondatabase/serverless (v0.10.4)            |
|   - Database Schema: "pustaka" (Multi-schema Cloud Isolation)            |
|   - Connection Pooling via WebSocket Secure (WSS / Pooler)               |
+--------------------------------------------------------------------------+
                                    │ ▲
                        PostgreSQL  │ │ SSL Encrypted Connection
                        Native SQL  │ │ (Port 5432 / Neon Pooler)
                                    ▼ │
+--------------------------------------------------------------------------+
|              CLOUD DATABASE: NEON SERVERLESS POSTGRESQL                  |
|   Host: ep-frosty-snow-aos88kvb-pooler.c-2.ap-southeast-1.aws.neon.tech  |
|   Database Name: mlbb_shop  |  Schema: pustaka  |  Table: books          |
+--------------------------------------------------------------------------+
```

---

## 2. 🐘 Konfigurasi Prisma ORM & Cloud Database Neon PostgreSQL

### 2.1 File Konfigurasi Environment (`.env`)
Koneksi ke Neon PostgreSQL dikonfigurasi melalui *Connection Pooling* untuk mendukung efisiensi koneksi serverless:
```env
PORT=3000
DATABASE_URL="postgresql://neondb_owner:npg_9RLdwOtCn8xq@ep-frosty-snow-aos88kvb-pooler.c-2.ap-southeast-1.aws.neon.tech/mlbb_shop?sslmode=require&channel_binding=require&schema=pustaka"
DIRECT_URL="postgresql://neondb_owner:npg_9RLdwOtCn8xq@ep-frosty-snow-aos88kvb.c-2.ap-southeast-1.aws.neon.tech/mlbb_shop?sslmode=require&channel_binding=require&schema=pustaka"
```

### 2.2 Skema Prisma (`prisma/schema.prisma`)
Skema mendefinisikan model `Book` yang terisolasi di dalam skema PostgreSQL `pustaka`:
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  schemas  = ["pustaka"]
}

model Book {
  id        String   @id
  judul     String
  penulis   String
  kategori  String
  tahun     Int      @default(2024)
  stok      Int      @default(1)
  status    String   @default("Tersedia")
  sinopsis  String?  @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("books")
  @@schema("pustaka")
}
```

### 2.3 Inisialisasi Prisma Adapter Neon (`src/config/prisma.js`)
Menggunakan `@prisma/adapter-neon` untuk mengoptimalkan komunikasi query melalui koneksi serverless berbasis WebSocket:
```javascript
import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
});

export default prisma;
```

---

## 3. 📸 BUKTI PERUBAHAN DATABASE (BEFORE - AFTER)

Bagian ini membuktikan bahwa setiap operasi CRUD benar-benar mengeksekusi perubahan langsung ke tabel `pustaka.books` di database cloud **Neon PostgreSQL**.

---

### 3.1 🟢 BUKTI PERUBAHAN PADA OPERASI POST (INSERT DATA)

- **Deskripsi Operasi**: Pengguna menambahkan buku baru bertajuk *"Pemrograman Web Modern dengan Express, Prisma & Neon"* melalui formulir web.
- **Eksekusi Prisma**: `prisma.book.create({ data: { id: 'BK-107', ... } })`
- **Query SQL Ekuivalen**:
  ```sql
  INSERT INTO pustaka.books (id, judul, penulis, kategori, tahun, stok, status, sinopsis, "createdAt", "updatedAt")
  VALUES ('BK-107', 'Pemrograman Web Modern dengan Express, Prisma & Neon', 'Rifqy Aqila', 'Teknologi', 2026, 10, 'Tersedia', '...', NOW(), NOW());
  ```

#### 📊 Perbandingan Data Database (Tabel Before vs After):
| Kolom | SEBELUM OPERASI POST (BEFORE) | SESUDAH OPERASI POST (AFTER) | Analisis Perubahan |
|---|---|---|---|
| **Jumlah Baris** | **6 baris** (`BK-101` s/d `BK-106`) | **7 baris** (`BK-101` s/d `BK-107`) | Bertambah **+1 record baru** |
| **ID Buku Baru** | *(Belum ada di database)* | **`BK-107`** | ID otomatis dibuat dengan urutan `BK-XXX` |
| **Judul Buku** | *(Belum ada)* | `Pemrograman Web Modern dengan Express, Prisma & Neon` | Berhasil disimpan |
| **Stok Awal** | *(Belum ada)* | `10` eksemplar | Tersedia untuk dipinjam |

#### 🖼️ Screenshot Evidence Database Neon (POST):
1. **Side-by-Side Comparison (Before vs After POST)**:
   ![Comparison POST](screenshots/db_04_post_comparison.png)

2. **Database Sebelum POST (6 Buku)**:
   ![Database Before POST](screenshots/db_02_post_before.png)

3. **Database Sesudah POST (Buku BK-107 Masuk)**:
   ![Database After POST](screenshots/db_03_post_after.png)

---

### 3.2 🟡 BUKTI PERUBAHAN PADA OPERASI PUT (UPDATE DATA)

- **Deskripsi Operasi**: Pengguna mengedit buku `BK-107` melalui modal edit, mengubah judul menjadi *"Pemrograman Web Modern dengan Express, Prisma & Neon (Edisi Lengkap Cloud)"* dan menambah stok dari `10` menjadi `30`.
- **Eksekusi Prisma**: `prisma.book.update({ where: { id: 'BK-107' }, data: { judul: '...', stok: 30 } })`
- **Query SQL Ekuivalen**:
  ```sql
  UPDATE pustaka.books
  SET judul = 'Pemrograman Web Modern dengan Express, Prisma & Neon (Edisi Lengkap Cloud)',
      stok = 30,
      "updatedAt" = NOW()
  WHERE id = 'BK-107';
  ```

#### 📊 Perbandingan Data Database (Tabel Before vs After):
| Kolom Record `BK-107` | SEBELUM OPERASI PUT (BEFORE) | SESUDAH OPERASI PUT (AFTER) | Analisis Perubahan |
|---|---|---|---|
| **ID Buku** | `BK-107` | `BK-107` | Tetap konsisten |
| **Judul** | `Pemrograman Web Modern dengan Express, Prisma & Neon` | `Pemrograman Web Modern dengan Express, Prisma & Neon (Edisi Lengkap Cloud)` | Judul diperbarui |
| **Stok** | **`10` eksemplar** | **`30` eksemplar** | Stok bertambah **+20 eksemplar** |
| **updatedAt** | `2026-11-10 14:41:39` | `2026-11-10 14:41:44` | Timestamp terupdate otomatis oleh Prisma |

#### 🖼️ Screenshot Evidence Database Neon (PUT):
1. **Side-by-Side Comparison (Before vs After PUT)**:
   ![Comparison PUT](screenshots/db_07_put_comparison.png)

2. **Database Sebelum PUT (`BK-107` Stok 10)**:
   ![Database Before PUT](screenshots/db_05_put_before.png)

3. **Database Sesudah PUT (`BK-107` Stok 30 & Judul Baru)**:
   ![Database After PUT](screenshots/db_06_put_after.png)

---

### 3.3 🔴 BUKTI PERUBAHAN PADA OPERASI DELETE (HAPUS DATA)

- **Deskripsi Operasi**: Pengguna menghapus buku `BK-106` (*"Filosofi Teras"* yang stoknya 0) melalui modal konfirmasi dialog.
- **Eksekusi Prisma**: `prisma.book.delete({ where: { id: 'BK-106' } })`
- **Query SQL Ekuivalen**:
  ```sql
  DELETE FROM pustaka.books WHERE id = 'BK-106';
  ```

#### 📊 Perbandingan Data Database (Tabel Before vs After):
| Aspek Pemeriksaan | SEBELUM OPERASI DELETE (BEFORE) | SESUDAH OPERASI DELETE (AFTER) | Analisis Perubahan |
|---|---|---|---|
| **Jumlah Total Baris** | **7 baris** di database | **6 baris** di database | Berkurang **-1 record** |
| **Status Record `BK-106`** | Ada di database (`Filosofi Teras`) | **`NULL / 0 rows returned`** | Terhapus permanen dari Neon |
| **Dampak ke Record Lain** | Record `BK-101` s/d `BK-105` & `BK-107` utuh | Record lain tetap aman dan terjaga integritasnya | Integritas referensial terjaga |

#### 🖼️ Screenshot Evidence Database Neon (DELETE):
1. **Side-by-Side Comparison (Before vs After DELETE)**:
   ![Comparison DELETE](screenshots/db_10_delete_comparison.png)

2. **Database Sebelum DELETE (`BK-106` Masih Ada)**:
   ![Database Before DELETE](screenshots/db_08_delete_before.png)

3. **Database Sesudah DELETE (`BK-106` Terhapus / Kosong)**:
   ![Database After DELETE](screenshots/db_09_delete_after.png)

4. **Kondisi Akhir Seluruh Tabel Database Neon (Complete CRUD)**:
   ![Final Database State](screenshots/db_11_final_state.png)

---

## 4. 🖥️ BUKTI SCREENSHOT SKENARIO PADA ANTARMUKA WEB (FRONT-END UI)

Semua skenario interaksi pengguna diambil secara otomatis (*end-to-end*) menggunakan Google Chrome Headless via Puppeteer:

### Skenario 1: Tampilan Utama Web & Sinkronisasi Data Neon (GET /api/books)
Menampilkan antarmuka web modern dengan indikator serverless Neon PostgreSQL, 4 card metrik statistik real-time, dan tabel data buku awal:
![UI Skenario 1 - GET](screenshots/ui_01_tampilan_web_get.png)

---

### Skenario 2: Live Search & Filter Kategori (GET dengan Query Parameter)
- **Live Search**: Pencarian cepat buku berdasarkan kata kunci `"Clean Code"`.
![UI Skenario 2 - Search](screenshots/ui_02_search_result.png)

- **Filter Kategori**: Menyaring buku secara spesifik untuk kategori `"Teknologi"`.
![UI Skenario 2 - Filter](screenshots/ui_03_filter_kategori.png)

---

### Skenario 3 & 4: Tambah Buku Baru ke Neon PostgreSQL (POST /api/books)
- **Form Input Tambah Data**: Mengisi form buku baru lengkap dengan judul, penulis, kategori, tahun, stok, dan sinopsis.
![UI Skenario 3 - Form POST](screenshots/ui_04_post_form_input.png)

- **Penambahan Berhasil (POST Sukses)**: Muncul toast notifikasi sukses, data baru `BK-107` langsung muncul di urutan teratas tabel, dan metrik total buku bertambah.
![UI Skenario 4 - POST Sukses](screenshots/ui_05_post_sukses.png)

---

### Skenario 5 & 6: Edit Data Buku di Neon PostgreSQL (PUT /api/books/:id)
- **Modal Edit Terbuka**: Modal dialog muncul dengan input terisi otomatis (*autofill*) mengambil data dari database, lalu pengguna mengubah stok dan judul buku.
![UI Skenario 5 - Modal Edit](screenshots/ui_06_put_modal_edit.png)

- **Pembaruan Berhasil (PUT Sukses)**: Muncul toast notifikasi sukses dan tabel langsung memperbarui informasi judul serta stok `30` tanpa reload halaman.
![UI Skenario 6 - PUT Sukses](screenshots/ui_07_put_sukses.png)

---

### Skenario 7 & 8: Hapus Data Buku dari Neon PostgreSQL (DELETE /api/books/:id)
- **Modal Konfirmasi Hapus**: Dialog konfirmasi mencegah penghapusan yang tidak disengaja dengan menampilkan ID dan judul buku target (`BK-106`).
![UI Skenario 7 - Modal Konfirmasi](screenshots/ui_08_delete_modal_konfirmasi.png)

- **Penghapusan Berhasil (DELETE Sukses)**: Muncul notifikasi sukses, baris buku hilang dari tabel, dan total koleksi buku berkurang.
![UI Skenario 8 - DELETE Sukses](screenshots/ui_09_delete_sukses.png)

---

## 5. 🛠️ Ringkasan Kode Endpoint Controller (Express + Prisma)

Berikut adalah implementasi controller di `controllers/bookController.js`:

```javascript
import prisma from '../src/config/prisma.js';

// 1. GET: Ambil semua buku dengan dukungan search & filter kategori
export const getAllBooks = async (req, res) => {
  const { search, category, status } = req.query;
  const where = {};

  if (search?.trim()) {
    const keyword = search.trim();
    where.OR = [
      { judul: { contains: keyword, mode: 'insensitive' } },
      { penulis: { contains: keyword, mode: 'insensitive' } },
      { id: { contains: keyword, mode: 'insensitive' } }
    ];
  }
  if (category && category !== 'Semua') {
    where.kategori = { equals: category, mode: 'insensitive' };
  }
  if (status && status !== 'Semua') {
    where.status = { equals: status, mode: 'insensitive' };
  }

  const books = await prisma.book.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, count: books.length, data: books });
};

// 2. POST: Tambah buku baru ke Neon PostgreSQL
export const createBook = async (req, res) => {
  const { judul, penulis, kategori, tahun, stok, status, sinopsis } = req.body;
  if (!judul || !penulis || !kategori) {
    return res.status(400).json({ success: false, message: 'Judul, Penulis, dan Kategori wajib diisi!' });
  }

  // Generate ID unik berformat BK-XXX
  const existingBooks = await prisma.book.findMany({ select: { id: true } });
  let nextNum = 101;
  if (existingBooks.length > 0) {
    const ids = existingBooks
      .map(b => b.id?.match(/^BK-(\d+)$/)?.[1])
      .filter(Boolean)
      .map(Number);
    if (ids.length > 0) nextNum = Math.max(...ids) + 1;
  }
  const newId = `BK-${nextNum}`;

  const newBook = await prisma.book.create({
    data: {
      id: newId,
      judul: judul.trim(),
      penulis: penulis.trim(),
      kategori,
      tahun: parseInt(tahun, 10) || 2024,
      stok: Math.max(0, parseInt(stok, 10) || 0),
      status: status || (parseInt(stok, 10) > 0 ? 'Tersedia' : 'Habis'),
      sinopsis: sinopsis?.trim() || ''
    }
  });

  res.status(201).json({ success: true, message: 'Buku berhasil ditambahkan ke database Neon PostgreSQL!', data: newBook });
};

// 3. PUT: Perbarui data buku di Neon PostgreSQL
export const updateBook = async (req, res) => {
  const { id } = req.params;
  const { judul, penulis, kategori, tahun, stok, status, sinopsis } = req.body;

  const updatedBook = await prisma.book.update({
    where: { id: String(id) },
    data: {
      judul: judul?.trim(),
      penulis: penulis?.trim(),
      kategori,
      tahun: parseInt(tahun, 10),
      stok: parseInt(stok, 10),
      status,
      sinopsis: sinopsis?.trim()
    }
  });

  res.status(200).json({ success: true, message: 'Data buku berhasil diperbarui di database Neon!', data: updatedBook });
};

// 4. DELETE: Hapus buku dari Neon PostgreSQL
export const deleteBook = async (req, res) => {
  const { id } = req.params;
  const deletedBook = await prisma.book.delete({
    where: { id: String(id) }
  });

  res.status(200).json({ success: true, message: `Buku "${deletedBook.judul}" berhasil dihapus dari database Neon!`, data: deletedBook });
};
```

---

## 6. 🚀 Panduan Menjalankan & Verifikasi Pengujian

Untuk memverifikasi atau menjalankan ulang pengujian secara mandiri:

### 1. Install Dependensi
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npm run prisma:generate
```

### 3. Seeding Database Neon (Bersih)
```bash
npm run prisma:seed
```

### 4. Jalankan Aplikasi Web
```bash
npm start
```
Buka browser pada: `http://localhost:3000`

### 5. Jalankan Otomatisasi Pengambilan Seluruh Evidence (Screenshot & Database)
```bash
npm run evidence
```
*Perintah ini akan secara otomatis mereset database ke kondisi awal, menjalankan skenario GET, POST, PUT, DELETE pada browser Chrome headless, merekam bukti query database Before & After ke folder `screenshots/`.*

---

## 7. 📦 Status Kelengkapan Berkas & Pengumpulan

| Komponen | Status | Keterangan |
|---|---|---|
| **Integrasi Prisma ORM 7** | ✅ Selesai | Model `Book`, adapter `@prisma/adapter-neon` |
| **Koneksi Cloud Neon PostgreSQL** | ✅ Selesai | Schema `pustaka`, SSL WebSocket Pooler aktif |
| **Operasi CRUD (GET, POST, PUT, DELETE)** | ✅ Selesai & Teruji | Front-end HTML/CSS/JS dan Back-end Express REST API |
| **Screenshot Beberapa Skenario UI** | ✅ 9 Berkas PNG | Tampilan GET, Search, Filter, Form POST, Sukses POST, Edit PUT, Sukses PUT, Konfirmasi DELETE, Sukses DELETE |
| **Screenshot Perubahan Database (Before - After)** | ✅ 11 Berkas PNG | Visual query Neon Console untuk State Awal, Before/After POST, Before/After PUT, Before/After DELETE, dan State Akhir |
| **Dokumen Laporan Evidence** | ✅ Selesai | Tersimpan di `LAPORAN_EVIDENCE.md` |
| **Arsip ZIP Bebas node_modules / dist** | ✅ Siap Kumpul | Berkas `pustaka-express.zip` siap di-upload ke GitHub |

---
*Laporan ini disusun sebagai bukti resmi penyelesaian tugas fullstack CRUD dengan Express.js, Prisma ORM, dan Neon PostgreSQL.*
