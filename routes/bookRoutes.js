import express from 'express';
import * as bookController from '../controllers/bookController.js';

const router = express.Router();

// Rute untuk Statistik
router.get('/stats/summary', bookController.getStats);

// Rute CRUD Utama
// GET: Menampilkan seluruh data buku dari Neon PostgreSQL
router.get('/', bookController.getAllBooks);

// GET: Mengambil satu buku berdasarkan ID
router.get('/:id', bookController.getBookById);

// POST: Menambahkan buku baru melalui form
router.post('/', bookController.createBook);

// PUT: Mengubah data buku melalui fitur edit
router.put('/:id', bookController.updateBook);

// DELETE: Menghapus data buku melalui tombol hapus
router.delete('/:id', bookController.deleteBook);

export default router;
