import prisma from '../src/config/prisma.js';

// 1. GET: Mengambil semua data buku dari Neon PostgreSQL via Prisma
export const getAllBooks = async (req, res) => {
  try {
    const { search, category, status } = req.query;

    const where = {};

    if (search && search.trim()) {
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

    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Error saat GET data buku dari Neon:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data buku dari Neon PostgreSQL: ' + error.message
    });
  }
};

// 2. GET: Mengambil detail satu buku berdasarkan ID
export const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findUnique({
      where: { id: String(id) }
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: `Buku dengan ID "${id}" tidak ditemukan di database Neon.`
      });
    }

    res.status(200).json({
      success: true,
      data: book
    });
  } catch (error) {
    console.error('Error saat GET detail buku:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail buku: ' + error.message
    });
  }
};

// 3. POST: Menambahkan buku baru ke Neon PostgreSQL via Prisma
export const createBook = async (req, res) => {
  try {
    const { judul, penulis, kategori, tahun, stok, status, sinopsis } = req.body;

    // Validasi input wajib
    if (!judul || !penulis || !kategori) {
      return res.status(400).json({
        success: false,
        message: 'Mohon lengkapi data: Judul, Penulis, dan Kategori wajib diisi!'
      });
    }

    // Ambil seluruh ID buku untuk menghitung ID unik berikutnya (BK-XXX)
    const existingBooks = await prisma.book.findMany({
      select: { id: true }
    });

    let nextNum = 101;
    if (existingBooks.length > 0) {
      const ids = existingBooks
        .map(b => {
          const match = b.id && b.id.match(/^BK-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));
      if (ids.length > 0) {
        nextNum = Math.max(...ids) + 1;
      }
    }
    const newId = `BK-${nextNum}`;

    const numStok = stok !== undefined && stok !== '' ? Math.max(0, parseInt(stok, 10)) : 1;
    let finalStatus = status || (numStok > 0 ? 'Tersedia' : 'Habis');
    if (numStok === 0 && finalStatus === 'Tersedia') {
      finalStatus = 'Habis';
    }

    const createdBook = await prisma.book.create({
      data: {
        id: newId,
        judul: judul.trim(),
        penulis: penulis.trim(),
        kategori: kategori.trim(),
        tahun: tahun ? parseInt(tahun, 10) : new Date().getFullYear(),
        stok: numStok,
        status: finalStatus,
        sinopsis: sinopsis ? sinopsis.trim() : 'Tidak ada sinopsis.'
      }
    });

    res.status(201).json({
      success: true,
      message: `Buku "${createdBook.judul}" berhasil disimpan ke database Neon PostgreSQL!`,
      data: createdBook
    });
  } catch (error) {
    console.error('Error saat POST buku ke Neon:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan buku baru ke Neon PostgreSQL: ' + error.message
    });
  }
};

// 4. PUT: Mengubah data buku di Neon PostgreSQL via Prisma
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { judul, penulis, kategori, tahun, stok, status, sinopsis } = req.body;

    const existingBook = await prisma.book.findUnique({
      where: { id: String(id) }
    });

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        message: `Buku dengan ID "${id}" tidak ditemukan di database Neon.`
      });
    }

    // Validasi
    if (!judul || !penulis || !kategori) {
      return res.status(400).json({
        success: false,
        message: 'Mohon lengkapi data: Judul, Penulis, dan Kategori wajib diisi!'
      });
    }

    const numStok = stok !== undefined && stok !== '' ? Math.max(0, parseInt(stok, 10)) : existingBook.stok;
    let finalStatus = status || existingBook.status;
    if (numStok === 0 && finalStatus === 'Tersedia') {
      finalStatus = 'Habis';
    }

    const updatedBook = await prisma.book.update({
      where: { id: String(id) },
      data: {
        judul: judul.trim(),
        penulis: penulis.trim(),
        kategori: kategori.trim(),
        tahun: tahun ? parseInt(tahun, 10) : existingBook.tahun,
        stok: numStok,
        status: finalStatus,
        sinopsis: sinopsis !== undefined ? sinopsis.trim() : existingBook.sinopsis
      }
    });

    res.status(200).json({
      success: true,
      message: `Buku "${updatedBook.judul}" berhasil diperbarui di Neon PostgreSQL!`,
      data: updatedBook
    });
  } catch (error) {
    console.error('Error saat PUT buku ke Neon:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data buku di Neon PostgreSQL: ' + error.message
    });
  }
};

// 5. DELETE: Menghapus data buku dari Neon PostgreSQL via Prisma
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBook = await prisma.book.findUnique({
      where: { id: String(id) }
    });

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        message: `Buku dengan ID "${id}" tidak ditemukan di database Neon.`
      });
    }

    const deletedBook = await prisma.book.delete({
      where: { id: String(id) }
    });

    res.status(200).json({
      success: true,
      message: `Buku "${deletedBook.judul}" (ID: ${id}) berhasil dihapus dari Neon PostgreSQL!`,
      data: deletedBook
    });
  } catch (error) {
    console.error('Error saat DELETE buku dari Neon:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus data buku dari Neon PostgreSQL: ' + error.message
    });
  }
};

// 6. GET: Ringkasan statistik (Stats summary) dari Neon PostgreSQL
export const getStats = async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      select: {
        stok: true,
        kategori: true,
        status: true
      }
    });

    const totalBuku = books.length;
    const totalStok = books.reduce((acc, curr) => acc + (curr.stok || 0), 0);
    const kategoriSet = new Set(books.map(b => b.kategori.toLowerCase()));
    const bukuTersedia = books.filter(b => b.status.toLowerCase() === 'tersedia').length;
    const bukuDipinjam = books.filter(b => b.status.toLowerCase() === 'dipinjam').length;
    const bukuHabis = books.filter(b => b.status.toLowerCase() === 'habis').length;

    res.status(200).json({
      success: true,
      data: {
        totalBuku,
        totalStok,
        totalKategori: kategoriSet.size,
        bukuTersedia,
        bukuDipinjam,
        bukuHabis
      }
    });
  } catch (error) {
    console.error('Error saat getStats dari Neon:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data statistik: ' + error.message
    });
  }
};
