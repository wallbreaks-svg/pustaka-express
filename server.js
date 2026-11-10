import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import bookRoutes from './routes/bookRoutes.js';
import prisma from './src/config/prisma.js';
import { seedBooks } from './prisma/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan file statis front-end (HTML, CSS, JS) dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Logging sederhana untuk setiap request
app.use((req, res, next) => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// Routing API CRUD Buku
app.use('/api/books', bookRoutes);

// Fallback untuk route API yang tidak ditemukan
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint API tidak ditemukan'
  });
});

// Fallback untuk halaman web (Single Page App ke index.html)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server!',
    error: err.message
  });
});

// Inisialisasi Database Neon & Jalankan Server
async function startServer() {
  try {
    // Verifikasi koneksi ke Neon PostgreSQL
    const count = await prisma.book.count();
    console.log(`📡 Terhubung ke Neon PostgreSQL (Database schema: pustaka)`);
    console.log(`📚 Data buku saat ini di database: ${count} entitas`);

    // Otomatis seed data awal jika tabel masih kosong
    if (count === 0) {
      await seedBooks();
    }
  } catch (err) {
    console.warn(`⚠️ Catatan koneksi Neon PostgreSQL: ${err.message}`);
  }

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🚀 Server PustakaKu berjalan di http://localhost:${PORT}`);
    console.log(`  🐘 Database: Neon PostgreSQL via Prisma ORM`);
    console.log(`  📚 API Endpoint: http://localhost:${PORT}/api/books`);
    console.log(`  💻 Front-End UI: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

startServer();
