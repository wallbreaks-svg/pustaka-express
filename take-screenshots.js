import { spawn } from 'child_process';
import path from 'path';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { seedBooks } from './prisma/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function waitForServer(url, timeoutMs = 12000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch (e) {}
      if (Date.now() - startTime > timeoutMs) {
        return reject(new Error('Server tidak siap dalam batas waktu.'));
      }
      setTimeout(check, 300);
    };
    check();
  });
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log('🌱 Menyiapkan ulang data seed di Neon PostgreSQL...');
  await seedBooks();

  console.log('🚀 Menjalankan Server Express dengan Neon PostgreSQL & Prisma...');
  const server = spawn('node', ['node_modules/tsx/dist/cli.mjs', 'server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  try {
    await waitForServer('http://localhost:3000/api/books');
    console.log('✅ Server aktif di http://localhost:3000');

    console.log('🌐 Membuka Google Chrome...');
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--window-size=1520,960', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1480, height: 920, deviceScaleFactor: 1 });

    // -------------------------------------------------------------
    // SKENARIO 1: GET (Tampilan Utama Web & Menampilkan Seluruh Data dari Neon)
    // -------------------------------------------------------------
    console.log('📸 1. GET - Mengambil screenshot tampilan utama web (menampilkan data dari Neon)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '1_tampilan_web_get.png')
    });
    console.log('   -> Tersimpan: 1_tampilan_web_get.png');

    // -------------------------------------------------------------
    // SKENARIO 2: POST (Mengisi Form & Menambahkan Data ke Neon)
    // -------------------------------------------------------------
    console.log('📸 2. POST - Mengisi form tambah buku...');
    await page.type('#addJudul', 'Pemrograman Web Modern dengan Express, Prisma & Neon');
    await page.type('#addPenulis', 'Rifqy Aqila');
    await page.select('#addKategori', 'Teknologi');
    await page.evaluate(() => {
      document.getElementById('addTahun').value = '2026';
      document.getElementById('addStok').value = '10';
      document.getElementById('addSinopsis').value = 'Buku panduan lengkap membangun aplikasi web full-stack modern dengan Express, Prisma ORM, dan cloud database Neon PostgreSQL.';
    });
    await sleep(400);

    // Screenshot form sebelum di-submit
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '2_post_form_input.png')
    });
    console.log('   -> Tersimpan: 2_post_form_input.png');

    // Submit form (POST)
    console.log('📸 3. POST - Submit form & simpan data baru ke Neon...');
    await page.click('#btnSubmitAdd');
    await sleep(1200); // Tunggu respons Express + Neon & toast notifikasi
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '3_post_sukses_tambah_data.png')
    });
    console.log('   -> Tersimpan: 3_post_sukses_tambah_data.png');

    // -------------------------------------------------------------
    // SKENARIO 3: PUT (Mengubah Data melalui Fitur Edit)
    // -------------------------------------------------------------
    console.log('📸 4. PUT - Membuka modal edit buku...');
    // Klik tombol edit pertama di tabel (BK-107 yang baru ditambahkan)
    const editBtn = await page.$('.btn-edit');
    if (editBtn) {
      await editBtn.click();
      await sleep(600);

      // Ubah judul dan jumlah stok
      await page.evaluate(() => {
        const inputJudul = document.getElementById('editJudul');
        inputJudul.value = inputJudul.value + ' (Edisi Lengkap Cloud)';
        document.getElementById('editStok').value = '30';
      });
      await sleep(400);

      // Screenshot modal edit terbuka dengan data terisi
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '4_put_fitur_edit_modal.png')
      });
      console.log('   -> Tersimpan: 4_put_fitur_edit_modal.png');

      // Submit form edit (PUT)
      console.log('📸 5. PUT - Simpan hasil update ke Neon...');
      await page.click('#btnSubmitEdit');
      await sleep(1200);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '5_put_sukses_ubah_data.png')
      });
      console.log('   -> Tersimpan: 5_put_sukses_ubah_data.png');
    }

    // -------------------------------------------------------------
    // SKENARIO 4: DELETE (Menghapus Data melalui Tombol Hapus)
    // -------------------------------------------------------------
    console.log('📸 6. DELETE - Membuka modal konfirmasi hapus...');
    // Ambil tombol hapus baris terakhir (BK-106 Filosofi Teras)
    const deleteButtons = await page.$$('.btn-delete');
    if (deleteButtons.length > 0) {
      const targetDeleteBtn = deleteButtons[deleteButtons.length - 1];
      await targetDeleteBtn.click();
      await sleep(600);

      // Screenshot modal konfirmasi hapus
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '6_delete_konfirmasi_modal.png')
      });
      console.log('   -> Tersimpan: 6_delete_konfirmasi_modal.png');

      // Klik tombol konfirmasi hapus
      console.log('📸 7. DELETE - Konfirmasi hapus buku dari Neon...');
      await page.click('#confirmDeleteBtn');
      await sleep(1200);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '7_delete_sukses_hapus_data.png')
      });
      console.log('   -> Tersimpan: 7_delete_sukses_hapus_data.png');
    }

    await browser.close();
    console.log('🎉 Seluruh skenario GET, POST, PUT, DELETE (Neon & Prisma) berhasil dijalankan & screenshot selesai!');

  } catch (err) {
    console.error('❌ Terjadi error:', err);
  } finally {
    if (server) {
      server.kill();
      try {
        process.kill(server.pid);
      } catch (e) {}
    }
  }
}

run();
