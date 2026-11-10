import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const INITIAL_BOOKS = [
  {
    id: "BK-101",
    judul: "Clean Code: A Handbook of Agile Software Craftsmanship",
    penulis: "Robert C. Martin",
    kategori: "Teknologi",
    tahun: 2021,
    stok: 8,
    status: "Tersedia",
    sinopsis: "Panduan standar industri tentang penulisan kode yang rapi, mudah dibaca, dan mudah dirawat."
  },
  {
    id: "BK-102",
    judul: "Laskar Pelangi",
    penulis: "Andrea Hirata",
    kategori: "Fiksi",
    tahun: 2018,
    stok: 15,
    status: "Tersedia",
    sinopsis: "Kisah inspiratif perjuangan sepuluh anak di Belitung dalam menggapai mimpi dan pendidikan."
  },
  {
    id: "BK-103",
    judul: "Atomic Habits",
    penulis: "James Clear",
    kategori: "Pengembangan Diri",
    tahun: 2022,
    stok: 12,
    status: "Tersedia",
    sinopsis: "Strategi praktis membangun kebiasaan baik dan menghilangkan kebiasaan buruk secara bertahap."
  },
  {
    id: "BK-104",
    judul: "Refactoring: Improving the Design of Existing Code",
    penulis: "Martin Fowler",
    kategori: "Teknologi",
    tahun: 2020,
    stok: 5,
    status: "Tersedia",
    sinopsis: "Teknik perombakan struktur internal program tanpa mengubah perilaku eksternal perangkat lunak."
  },
  {
    id: "BK-105",
    judul: "Bumi Manusia",
    penulis: "Pramoedya Ananta Toer",
    kategori: "Fiksi",
    tahun: 2019,
    stok: 3,
    status: "Dipinjam",
    sinopsis: "Mahakarya sastra Indonesia berlatar era kolonial mengenai kesetaraan, kemanusiaan, dan cinta."
  },
  {
    id: "BK-106",
    judul: "Filosofi Teras",
    penulis: "Henry Manampiring",
    kategori: "Pengembangan Diri",
    tahun: 2023,
    stok: 0,
    status: "Habis",
    sinopsis: "Penerapan filsafat Stoisisme kuno untuk mengatasi kecemasan dan stres di era modern."
  }
];

export async function seedBooks(clean = true) {
  console.log('🌱 Melakukan seeding data awal ke Neon PostgreSQL...');
  if (clean) {
    console.log('🧹 Membersihkan data lama di tabel pustaka.books...');
    await prisma.book.deleteMany({});
  }
  for (const book of INITIAL_BOOKS) {
    await prisma.book.upsert({
      where: { id: book.id },
      update: book,
      create: book
    });
  }
  const total = await prisma.book.count();
  console.log(`✅ Seeding berhasil! Total buku di database Neon: ${total}`);
}

async function main() {
  try {
    await seedBooks();
  } catch (err) {
    console.error('❌ Gagal melakukan seed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (process.argv[1]?.endsWith('seed.js')) {
  main();
}
