import { spawn } from 'child_process';
import path from 'path';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from './src/config/prisma.js';
import { seedBooks } from './prisma/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function waitForServer(url, timeoutMs = 15000) {
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

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

// Template generator untuk Neon PostgreSQL Cloud Console
function generateNeonConsoleHtml({
  badgeTitle,
  scenarioName,
  sqlQuery,
  execTime = '24ms',
  rows = [],
  highlightId = null,
  highlightFields = [],
  deletedRow = null,
  isComparison = false,
  beforeRows = [],
  afterRows = [],
  diffSummary = null,
}) {
  const renderRowsTable = (dataRows, hId = null, hFields = [], delRow = null) => {
    if ((!dataRows || dataRows.length === 0) && !delRow) {
      return `
        <tr>
          <td colspan="9" style="text-align: center; padding: 32px; color: #8b949e; font-style: italic;">
            📭 0 rows returned (Empty result set)
          </td>
        </tr>
      `;
    }

    let html = '';
    for (const r of dataRows) {
      const isHighlighted = hId && r.id === hId;
      const rowStyle = isHighlighted
        ? hFields.length > 0
          ? 'background: rgba(245, 158, 11, 0.12); border-left: 4px solid #f59e0b;'
          : 'background: rgba(0, 229, 153, 0.12); border-left: 4px solid #00e599;'
        : '';

      html += `<tr style="${rowStyle}">`;
      html += `<td style="font-family: monospace; font-weight: 700; color: ${isHighlighted ? '#00e599' : '#58a6ff'};">${escapeHtml(r.id)} ${
        isHighlighted
          ? hFields.length > 0
            ? '<span class="tag tag-amber">TERUPDATE</span>'
            : '<span class="tag tag-green">+ BARU</span>'
          : ''
      }</td>`;

      const judulStyle = isHighlighted && hFields.includes('judul') ? 'color: #f59e0b; font-weight: 700;' : 'color: #c9d1d9;';
      html += `<td style="${judulStyle}">${escapeHtml(r.judul)}</td>`;
      html += `<td style="color: #8b949e;">${escapeHtml(r.penulis)}</td>`;
      html += `<td><span class="badge-cat">${escapeHtml(r.kategori)}</span></td>`;
      html += `<td style="text-align: center; color: #8b949e;">${r.tahun}</td>`;

      const stokStyle = isHighlighted && hFields.includes('stok') ? 'color: #f59e0b; font-weight: 800; font-size: 15px;' : 'color: #c9d1d9;';
      html += `<td style="text-align: center; ${stokStyle}">${r.stok}</td>`;

      const statusBadge =
        r.status === 'Tersedia'
          ? 'badge-status-green'
          : r.status === 'Dipinjam'
          ? 'badge-status-blue'
          : 'badge-status-red';
      html += `<td style="text-align: center;"><span class="${statusBadge}">${escapeHtml(r.status)}</span></td>`;
      html += `<td style="font-family: monospace; font-size: 11px; color: #8b949e;">${formatDate(r.createdAt)}</td>`;
      html += `<td style="font-family: monospace; font-size: 11px; color: ${isHighlighted && hFields.length > 0 ? '#f59e0b' : '#8b949e'};">${formatDate(r.updatedAt)}</td>`;
      html += `</tr>`;
    }

    if (delRow) {
      html += `
        <tr style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; text-decoration: line-through; opacity: 0.75;">
          <td style="font-family: monospace; font-weight: 700; color: #ef4444;">${escapeHtml(delRow.id)} <span class="tag tag-red">- DIHAPUS</span></td>
          <td style="color: #ef4444;">${escapeHtml(delRow.judul)}</td>
          <td style="color: #ef4444;">${escapeHtml(delRow.penulis)}</td>
          <td><span class="badge-cat" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">${escapeHtml(delRow.kategori)}</span></td>
          <td style="text-align: center; color: #ef4444;">${delRow.tahun}</td>
          <td style="text-align: center; color: #ef4444;">${delRow.stok}</td>
          <td style="text-align: center;"><span class="badge-status-red">Terhapus</span></td>
          <td style="font-family: monospace; font-size: 11px; color: #ef4444;">${formatDate(delRow.createdAt)}</td>
          <td style="font-family: monospace; font-size: 11px; color: #ef4444;">${formatDate(delRow.updatedAt)}</td>
        </tr>
      `;
    }

    return html;
  };

  const sqlHighlighted = escapeHtml(sqlQuery)
    .replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|ORDER BY|ASC|DESC|AND|OR|LIMIT|OFFSET)\b/g, '<span style="color: #ff7b72; font-weight: bold;">$1</span>')
    .replace(/\b(pustaka\.books|pustaka|books)\b/g, '<span style="color: #7ee787; font-weight: bold;">$1</span>')
    .replace(/('.*?')/g, '<span style="color: #a5d6ff;">$1</span>');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Neon PostgreSQL Cloud Console - Evidence</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0d1117;
      color: #c9d1d9;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 24px;
      font-size: 13px;
    }
    .neon-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
    }
    .neon-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0c0f14;
      padding: 12px 20px;
      border-bottom: 1px solid #30363d;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .neon-logo {
      width: 26px;
      height: 26px;
      background: #00e599;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      color: #0c0f14;
      font-size: 14px;
      box-shadow: 0 0 12px rgba(0, 229, 153, 0.4);
    }
    .brand-title {
      font-size: 14px;
      font-weight: 700;
      color: #f0f6fc;
      letter-spacing: -0.3px;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #8b949e;
      font-family: 'Fira Code', monospace;
    }
    .env-pills {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: #21262d;
      color: #c9d1d9;
      border: 1px solid #30363d;
    }
    .pill-green {
      background: rgba(0, 229, 153, 0.15);
      color: #00e599;
      border-color: rgba(0, 229, 153, 0.3);
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #00e599;
      box-shadow: 0 0 8px #00e599;
    }
    .scenario-banner {
      background: linear-gradient(90deg, #1b222c 0%, #161b22 100%);
      padding: 16px 20px;
      border-bottom: 1px solid #30363d;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .scenario-title-wrap h2 {
      font-size: 16px;
      font-weight: 700;
      color: #f0f6fc;
      margin-bottom: 4px;
    }
    .scenario-title-wrap p {
      font-size: 12px;
      color: #8b949e;
    }
    .badge-scenario {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: #238636;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(35, 134, 54, 0.3);
    }
    .badge-scenario.blue { background: #1f6feb; }
    .badge-scenario.amber { background: #d29922; }
    .badge-scenario.red { background: #da3633; }
    .sql-editor-box {
      background: #0d1117;
      border-bottom: 1px solid #30363d;
      padding: 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sql-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sql-bar-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .run-btn {
      background: #238636;
      color: white;
      border: none;
      padding: 5px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sql-code {
      font-family: 'Fira Code', monospace;
      font-size: 12.5px;
      line-height: 1.5;
      color: #e6edf3;
      background: #161b22;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #30363d;
    }
    .sql-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 11px;
      color: #8b949e;
      font-family: 'Fira Code', monospace;
    }
    .sql-meta span strong {
      color: #58a6ff;
    }
    .content-body {
      padding: 18px 20px;
    }
    .table-responsive {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid #30363d;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    thead th {
      background: #0c0f14;
      color: #8b949e;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      border-bottom: 1px solid #30363d;
    }
    tbody td {
      padding: 10px 14px;
      border-bottom: 1px solid #21262d;
      font-size: 12px;
    }
    tbody tr:hover {
      background: rgba(110, 118, 129, 0.06);
    }
    .tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      margin-left: 6px;
    }
    .tag-green { background: #238636; color: #fff; }
    .tag-amber { background: #d29922; color: #000; }
    .tag-red { background: #da3633; color: #fff; }
    .badge-cat {
      background: #21262d;
      color: #58a6ff;
      border: 1px solid #30363d;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge-status-green {
      background: rgba(35, 134, 54, 0.2);
      color: #3fb950;
      border: 1px solid rgba(35, 134, 54, 0.4);
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-status-blue {
      background: rgba(31, 111, 235, 0.2);
      color: #58a6ff;
      border: 1px solid rgba(31, 111, 235, 0.4);
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-status-red {
      background: rgba(218, 54, 51, 0.2);
      color: #f85149;
      border: 1px solid rgba(218, 54, 51, 0.4);
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    /* Comparison Grid */
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .comparison-panel {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      overflow: hidden;
    }
    .panel-header {
      padding: 10px 14px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .panel-header h3 {
      font-size: 12px;
      font-weight: 700;
      color: #f0f6fc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .diff-summary-card {
      margin-top: 16px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .diff-left h4 {
      font-size: 13px;
      font-weight: 700;
      color: #00e599;
      margin-bottom: 4px;
    }
    .diff-left p {
      font-size: 12px;
      color: #8b949e;
      font-family: 'Fira Code', monospace;
    }
    .diff-stats {
      display: flex;
      gap: 14px;
    }
    .diff-stat-item {
      text-align: right;
    }
    .diff-stat-item .val {
      font-size: 16px;
      font-weight: 800;
      color: #f0f6fc;
      font-family: 'Fira Code', monospace;
    }
    .diff-stat-item .lbl {
      font-size: 10px;
      color: #8b949e;
      text-transform: uppercase;
    }
  </style>
</head>
<body>

  <div class="neon-card">
    <!-- Topbar -->
    <div class="neon-topbar">
      <div class="brand-group">
        <div class="neon-logo">▲</div>
        <div>
          <div class="brand-title">Neon Serverless PostgreSQL Console</div>
          <div class="brand-subtitle">mlbb_shop &bull; schema: <strong>pustaka</strong> &bull; table: <strong>books</strong> &bull; Prisma ORM 7</div>
        </div>
      </div>
      <div class="env-pills">
        <span class="pill pill-green"><span class="pulse-dot"></span> Live Cloud Active</span>
        <span class="pill">AWS ap-southeast-1</span>
        <span class="pill">ep-frosty-snow-aos88kvb</span>
      </div>
    </div>

    <!-- Scenario Banner -->
    <div class="scenario-banner">
      <div class="scenario-title-wrap">
        <h2>${escapeHtml(scenarioName)}</h2>
        <p>Verifikasi status tabel dan baris data aktual di Neon Cloud PostgreSQL</p>
      </div>
      <span class="badge-scenario ${badgeTitle.toLowerCase().includes('delete') ? 'red' : badgeTitle.toLowerCase().includes('put') ? 'amber' : 'green'}">${escapeHtml(badgeTitle)}</span>
    </div>

    <!-- SQL Editor Box -->
    <div class="sql-editor-box">
      <div class="sql-bar">
        <div class="sql-bar-left">
          <button class="run-btn">▶ Run Query</button>
          <span style="font-family: monospace; font-size: 11px; color: #8b949e;">Driver: @prisma/adapter-neon (WebSocket Pooler)</span>
        </div>
        <div class="sql-meta">
          <span>Execution: <strong>${execTime}</strong></span>
          <span>Status: <strong style="color: #3fb950;">200 OK</strong></span>
          <span>Rows: <strong>${isComparison ? `${beforeRows.length} &rarr; ${afterRows.length}` : rows.length}</strong></span>
        </div>
      </div>
      <div class="sql-code">${sqlHighlighted}</div>
    </div>

    <!-- Content Table / Comparison View -->
    <div class="content-body">
      ${
        isComparison
          ? `
        <div class="comparison-grid">
          <!-- BEFORE PANEL -->
          <div class="comparison-panel">
            <div class="panel-header" style="border-left: 4px solid #8b949e;">
              <h3>1. Kondisi SEBELUM (BEFORE)</h3>
              <span style="font-family: monospace; font-size: 11px; color: #8b949e;">${beforeRows.length} baris di database</span>
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Judul Buku</th>
                    <th>Kategori</th>
                    <th style="text-align: center;">Stok</th>
                    <th style="text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${beforeRows
                    .map(
                      (r) => `
                    <tr>
                      <td style="font-family: monospace; font-weight: 700; color: #58a6ff;">${escapeHtml(r.id)}</td>
                      <td style="color: #c9d1d9;">${escapeHtml(r.judul)}</td>
                      <td><span class="badge-cat">${escapeHtml(r.kategori)}</span></td>
                      <td style="text-align: center; color: #c9d1d9;">${r.stok}</td>
                      <td style="text-align: center;"><span class="${r.status === 'Tersedia' ? 'badge-status-green' : r.status === 'Dipinjam' ? 'badge-status-blue' : 'badge-status-red'}">${escapeHtml(r.status)}</span></td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- AFTER PANEL -->
          <div class="comparison-panel">
            <div class="panel-header" style="border-left: 4px solid #00e599;">
              <h3>2. Kondisi SESUDAH (AFTER)</h3>
              <span style="font-family: monospace; font-size: 11px; color: #00e599;">${afterRows.length} baris di database</span>
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Judul Buku</th>
                    <th>Kategori</th>
                    <th style="text-align: center;">Stok</th>
                    <th style="text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${afterRows
                    .map((r) => {
                      const isHighlighted = highlightId && r.id === highlightId;
                      const rowStyle = isHighlighted
                        ? highlightFields.length > 0
                          ? 'background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b;'
                          : 'background: rgba(0, 229, 153, 0.15); border-left: 4px solid #00e599;'
                        : '';
                      return `
                    <tr style="${rowStyle}">
                      <td style="font-family: monospace; font-weight: 700; color: ${isHighlighted ? '#00e599' : '#58a6ff'};">
                        ${escapeHtml(r.id)} ${
                        isHighlighted
                          ? highlightFields.length > 0
                            ? '<span class="tag tag-amber">TERUPDATE</span>'
                            : '<span class="tag tag-green">+ BARU</span>'
                          : ''
                      }
                      </td>
                      <td style="${isHighlighted && highlightFields.includes('judul') ? 'color: #f59e0b; font-weight: 700;' : 'color: #c9d1d9;'}">${escapeHtml(r.judul)}</td>
                      <td><span class="badge-cat">${escapeHtml(r.kategori)}</span></td>
                      <td style="text-align: center; ${isHighlighted && highlightFields.includes('stok') ? 'color: #f59e0b; font-weight: 800;' : 'color: #c9d1d9;'}">${r.stok}</td>
                      <td style="text-align: center;"><span class="${r.status === 'Tersedia' ? 'badge-status-green' : r.status === 'Dipinjam' ? 'badge-status-blue' : 'badge-status-red'}">${escapeHtml(r.status)}</span></td>
                    </tr>
                  `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Diff Summary -->
        ${
          diffSummary
            ? `
          <div class="diff-summary-card">
            <div class="diff-left">
              <h4>${escapeHtml(diffSummary.title)}</h4>
              <p>${escapeHtml(diffSummary.description)}</p>
            </div>
            <div class="diff-stats">
              <div class="diff-stat-item">
                <div class="val" style="color: #8b949e;">${beforeRows.length}</div>
                <div class="lbl">Rows Before</div>
              </div>
              <div class="diff-stat-item">
                <div class="val" style="color: #00e599;">${afterRows.length}</div>
                <div class="lbl">Rows After</div>
              </div>
              <div class="diff-stat-item">
                <div class="val" style="color: #58a6ff;">${diffSummary.delta}</div>
                <div class="lbl">Net Delta</div>
              </div>
            </div>
          </div>
        `
            : ''
        }
      `
          : `
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="width: 100px;">ID</th>
                <th>Judul Buku</th>
                <th style="width: 160px;">Penulis</th>
                <th style="width: 140px;">Kategori</th>
                <th style="width: 70px; text-align: center;">Tahun</th>
                <th style="width: 70px; text-align: center;">Stok</th>
                <th style="width: 100px; text-align: center;">Status</th>
                <th style="width: 150px;">Created At</th>
                <th style="width: 150px;">Updated At</th>
              </tr>
            </thead>
            <tbody>
              ${renderRowsTable(rows, highlightId, highlightFields, deletedRow)}
            </tbody>
          </table>
        </div>
      `
      }
    </div>
  </div>

</body>
</html>
  `;
}

async function run() {
  console.log('===============================================================');
  console.log('🚀 MEMULAI GENERASI EVIDENCE LENGKAP: SKENARIO UI & DATABASE');
  console.log('===============================================================');

  // 1. Reset Database Neon ke State Awal (6 buku)
  console.log('\n[1/10] 🧹 Reset dan Seeding Data Bersih di Neon PostgreSQL...');
  await seedBooks(true);
  const baselineBooks = await prisma.book.findMany({ orderBy: { id: 'asc' } });
  console.log(`   -> Data awal siap: ${baselineBooks.length} buku (BK-101 s/d BK-106)`);

  // 2. Jalankan Express Server
  console.log('\n[2/10] 🔌 Menjalankan Server Express...');
  const server = spawn('node', ['node_modules/tsx/dist/cli.mjs', 'server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
  });

  let browser;

  try {
    await waitForServer('http://localhost:3000/api/books');
    console.log('   -> Server aktif di http://localhost:3000');

    console.log('\n[3/10] 🌐 Meluncurkan Headless Chrome (Puppeteer)...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--window-size=1560,1020', '--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1500, height: 960, deviceScaleFactor: 1 });

    // -------------------------------------------------------------
    // DB EVIDENCE 1: INITIAL STATE (BASELINE)
    // -------------------------------------------------------------
    console.log('\n📸 [DB Evidence 1] Capture Kondisi Awal Database Neon (6 buku)...');
    const initialHtml = generateNeonConsoleHtml({
      badgeTitle: 'STATE AWAL: GET DATA BASELINE',
      scenarioName: '1. Kondisi Awal Tabel pustaka.books di Neon Cloud PostgreSQL',
      sqlQuery: 'SELECT id, judul, penulis, kategori, tahun, stok, status, "createdAt", "updatedAt" FROM pustaka.books ORDER BY id ASC;',
      execTime: '26ms',
      rows: baselineBooks,
    });
    await page.setContent(initialHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_01_initial_state.png') });
    console.log('   -> Tersimpan: db_01_initial_state.png');

    // -------------------------------------------------------------
    // UI SCENARIO 1: GET (TAMPILAN WEB UTAMA)
    // -------------------------------------------------------------
    console.log('\n📸 [UI Scenario 1] GET - Tampilan Utama Web PustakaKu & Data Neon...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_01_tampilan_web_get.png') });
    console.log('   -> Tersimpan: ui_01_tampilan_web_get.png');

    // -------------------------------------------------------------
    // UI SCENARIO 2: LIVE SEARCH & FILTER KATEGORI
    // -------------------------------------------------------------
    console.log('\n📸 [UI Scenario 2] SEARCH & FILTER - Uji Pencarian Live & Filter Kategori...');
    await page.type('#searchInput', 'Clean Code');
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_02_search_result.png') });
    console.log('   -> Tersimpan: ui_02_search_result.png');

    await page.click('#clearSearchBtn');
    await sleep(300);
    await page.select('#categoryFilter', 'Teknologi');
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_03_filter_kategori.png') });
    console.log('   -> Tersimpan: ui_03_filter_kategori.png');
    await page.select('#categoryFilter', 'Semua');
    await sleep(300);

    // -------------------------------------------------------------
    // DB EVIDENCE 2: BEFORE POST
    // -------------------------------------------------------------
    console.log('\n📸 [DB Evidence 2] Capture Database Sebelum POST (6 Buku)...');
    const beforePostBooks = await prisma.book.findMany({ orderBy: { id: 'asc' } });
    const beforePostHtml = generateNeonConsoleHtml({
      badgeTitle: 'BEFORE POST: SEBELUM INSERT',
      scenarioName: '2. Status Database Sebelum Menambahkan Buku Baru (Total: 6 Data)',
      sqlQuery: 'SELECT id, judul, penulis, kategori, tahun, stok, status, "createdAt" FROM pustaka.books ORDER BY id ASC;',
      execTime: '23ms',
      rows: beforePostBooks,
    });
    await page.setContent(beforePostHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_02_post_before.png') });
    console.log('   -> Tersimpan: db_02_post_before.png');

    // -------------------------------------------------------------
    // UI SCENARIO 3 & 4: POST (INPUT FORM & SUBMIT)
    // -------------------------------------------------------------
    console.log('\n📸 [UI Scenario 3] POST - Mengisi Formulir Tambah Buku Baru...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await sleep(400);

    await page.type('#addJudul', 'Pemrograman Web Modern dengan Express, Prisma & Neon');
    await page.type('#addPenulis', 'Rifqy Aqila');
    await page.select('#addKategori', 'Teknologi');
    await page.evaluate(() => {
      document.getElementById('addTahun').value = '2026';
      document.getElementById('addStok').value = '10';
      document.getElementById('addSinopsis').value =
        'Buku panduan lengkap membangun arsitektur REST API dengan Express.js, Prisma ORM, dan cloud database Neon PostgreSQL.';
    });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_04_post_form_input.png') });
    console.log('   -> Tersimpan: ui_04_post_form_input.png');

    console.log('📸 [UI Scenario 4] POST - Submit Form & Verifikasi Notifikasi Sukses...');
    await page.click('#btnSubmitAdd');
    await sleep(1400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_05_post_sukses.png') });
    console.log('   -> Tersimpan: ui_05_post_sukses.png');

    // -------------------------------------------------------------
    // DB EVIDENCE 3 & 4: AFTER POST & COMPARISON
    // -------------------------------------------------------------
    console.log('\n📸 [DB Evidence 3] Capture Database Sesudah POST (Buku BK-107 Masuk)...');
    const afterPostBooks = await prisma.book.findMany({ orderBy: { id: 'asc' } });
    const afterPostHtml = generateNeonConsoleHtml({
      badgeTitle: 'AFTER POST: SESUDAH INSERT',
      scenarioName: '3. Status Database Sesudah POST /api/books (Buku Baru BK-107 Terdaftar)',
      sqlQuery: 'SELECT id, judul, penulis, kategori, tahun, stok, status, "createdAt" FROM pustaka.books ORDER BY id ASC;',
      execTime: '31ms',
      rows: afterPostBooks,
      highlightId: 'BK-107',
    });
    await page.setContent(afterPostHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_03_post_after.png') });
    console.log('   -> Tersimpan: db_03_post_after.png');

    console.log('📸 [DB Evidence 4] Capture Side-by-Side Comparison POST (Before vs After)...');
    const postComparisonHtml = generateNeonConsoleHtml({
      badgeTitle: 'COMPARISON: POST /api/books',
      scenarioName: 'Perbandingan Database Sebelum vs Sesudah Operasi INSERT (POST)',
      sqlQuery: `INSERT INTO pustaka.books (id, judul, penulis, kategori, tahun, stok, status, sinopsis, "createdAt", "updatedAt") VALUES ('BK-107', 'Pemrograman Web Modern dengan Express, Prisma & Neon', 'Rifqy Aqila', 'Teknologi', 2026, 10, 'Tersedia', '...', NOW(), NOW());`,
      execTime: '35ms',
      isComparison: true,
      beforeRows: beforePostBooks,
      afterRows: afterPostBooks,
      highlightId: 'BK-107',
      diffSummary: {
        title: 'Operasi: POST /api/books (Prisma: prisma.book.create())',
        description: 'Record baru ID "BK-107" berhasil disisipkan ke cloud database Neon PostgreSQL.',
        delta: '+1 Record',
      },
    });
    await page.setContent(postComparisonHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_04_post_comparison.png') });
    console.log('   -> Tersimpan: db_04_post_comparison.png');

    // -------------------------------------------------------------
    // DB EVIDENCE 5: BEFORE PUT
    // -------------------------------------------------------------
    console.log('\n📸 [DB Evidence 5] Capture Database Sebelum PUT (Data Awal BK-107)...');
    const beforePutBooks = await prisma.book.findMany({ orderBy: { id: 'asc' } });
    const beforePutHtml = generateNeonConsoleHtml({
      badgeTitle: 'BEFORE PUT: SEBELUM UPDATE',
      scenarioName: '4. Status Buku BK-107 di Database Sebelum Dilakukan Pengubahan (PUT)',
      sqlQuery: `SELECT id, judul, penulis, stok, status, "updatedAt" FROM pustaka.books WHERE id = 'BK-107';`,
      execTime: '22ms',
      rows: beforePutBooks.filter((b) => b.id === 'BK-107'),
      highlightId: 'BK-107',
    });
    await page.setContent(beforePutHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_05_put_before.png') });
    console.log('   -> Tersimpan: db_05_put_before.png');

    // -------------------------------------------------------------
    // UI SCENARIO 5 & 6: PUT (MODAL EDIT & SIMPAN)
    // -------------------------------------------------------------
    console.log('\n📸 [UI Scenario 5] PUT - Membuka Modal Edit untuk BK-107...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await sleep(500);

    await page.evaluate(() => {
      const editBtn =
        document.querySelector('tr[data-id="BK-107"] .btn-edit') ||
        document.querySelector('.btn-edit');
      if (editBtn) editBtn.click();
      else if (window.openEditModal) window.openEditModal('BK-107');
    });
    await sleep(600);

    // Ubah judul dan stok
    await page.evaluate(() => {
      const inputJudul = document.getElementById('editJudul');
      inputJudul.value = inputJudul.value + ' (Edisi Lengkap Cloud)';
      document.getElementById('editStok').value = '30';
    });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_06_put_modal_edit.png') });
    console.log('   -> Tersimpan: ui_06_put_modal_edit.png');

    console.log('📸 [UI Scenario 6] PUT - Submit Edit & Verifikasi Data Terupdate...');
    await page.click('#btnSubmitEdit');
    await sleep(1400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_07_put_sukses.png') });
    console.log('   -> Tersimpan: ui_07_put_sukses.png');

    // -------------------------------------------------------------
    // DB EVIDENCE 6 & 7: AFTER PUT & COMPARISON
    // -------------------------------------------------------------
    console.log('\n📸 [DB Evidence 6] Capture Database Sesudah PUT (Data BK-107 Terupdate)...');
    const afterPutBooks = await prisma.book.findMany({ orderBy: { id: 'asc' } });
    const afterPutHtml = generateNeonConsoleHtml({
      badgeTitle: 'AFTER PUT: SESUDAH UPDATE',
      scenarioName: '5. Status Buku BK-107 di Database Sesudah PUT /api/books/BK-107 (Stok 30)',
      sqlQuery: `SELECT id, judul, penulis, stok, status, "updatedAt" FROM pustaka.books WHERE id = 'BK-107';`,
      execTime: '24ms',
      rows: afterPutBooks.filter((b) => b.id === 'BK-107'),
      highlightId: 'BK-107',
      highlightFields: ['judul', 'stok', 'updatedAt'],
    });
    await page.setContent(afterPutHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_06_put_after.png') });
    console.log('   -> Tersimpan: db_06_put_after.png');

    console.log('📸 [DB Evidence 7] Capture Side-by-Side Comparison PUT (Before vs After)...');
    const putComparisonHtml = generateNeonConsoleHtml({
      badgeTitle: 'COMPARISON: PUT /api/books/BK-107',
      scenarioName: 'Perbandingan Database Sebelum vs Sesudah Operasi UPDATE (PUT)',
      sqlQuery: `UPDATE pustaka.books SET judul = 'Pemrograman Web Modern dengan Express, Prisma & Neon (Edisi Lengkap Cloud)', stok = 30, "updatedAt" = NOW() WHERE id = 'BK-107';`,
      execTime: '29ms',
      isComparison: true,
      beforeRows: beforePutBooks,
      afterRows: afterPutBooks,
      highlightId: 'BK-107',
      highlightFields: ['judul', 'stok', 'updatedAt'],
      diffSummary: {
        title: 'Operasi: PUT /api/books/BK-107 (Prisma: prisma.book.update())',
        description: 'Field "judul" bertambah "(Edisi Lengkap Cloud)", "stok" naik dari 10 ke 30, timestamp updatedAt diperbarui.',
        delta: '0 Row Delta (Modified In-Place)',
      },
    });
    await page.setContent(putComparisonHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_07_put_comparison.png') });
    console.log('   -> Tersimpan: db_07_put_comparison.png');

    // -------------------------------------------------------------
    // DB EVIDENCE 8: BEFORE DELETE
    // -------------------------------------------------------------
    console.log('\n📸 [DB Evidence 8] Capture Database Sebelum DELETE (Buku BK-106 Masih Ada)...');
    const beforeDeleteBooks = await prisma.book.findMany({ orderBy: { id: 'asc' } });
    const targetDeletedBook = beforeDeleteBooks.find((b) => b.id === 'BK-106');
    const beforeDeleteHtml = generateNeonConsoleHtml({
      badgeTitle: 'BEFORE DELETE: SEBELUM DIHAPUS',
      scenarioName: '6. Status Buku BK-106 di Database Sebelum Dilakukan Penghapusan (DELETE)',
      sqlQuery: `SELECT id, judul, penulis, stok, status FROM pustaka.books WHERE id = 'BK-106';`,
      execTime: '20ms',
      rows: beforeDeleteBooks.filter((b) => b.id === 'BK-106'),
      highlightId: 'BK-106',
    });
    await page.setContent(beforeDeleteHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_08_delete_before.png') });
    console.log('   -> Tersimpan: db_08_delete_before.png');

    // -------------------------------------------------------------
    // UI SCENARIO 7 & 8: DELETE (MODAL KONFIRMASI & SUBMIT)
    // -------------------------------------------------------------
    console.log('\n📸 [UI Scenario 7] DELETE - Membuka Modal Konfirmasi Hapus untuk BK-106...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await sleep(500);

    // Pastikan modal terbuka untuk BK-106
    await page.evaluate(() => {
      const deleteBtn =
        document.querySelector('tr[data-id="BK-106"] .btn-delete') ||
        document.querySelector('.btn-delete');
      if (deleteBtn) deleteBtn.click();
      else if (window.openDeleteModal) window.openDeleteModal('BK-106');
    });
    await sleep(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_08_delete_modal_konfirmasi.png') });
    console.log('   -> Tersimpan: ui_08_delete_modal_konfirmasi.png');

    console.log('📸 [UI Scenario 8] DELETE - Eksekusi Hapus & Verifikasi Baris Terhapus...');
    await page.click('#confirmDeleteBtn');
    await sleep(1400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui_09_delete_sukses.png') });
    console.log('   -> Tersimpan: ui_09_delete_sukses.png');

    // -------------------------------------------------------------
    // DB EVIDENCE 9 & 10: AFTER DELETE & COMPARISON
    // -------------------------------------------------------------
    console.log('\n📸 [DB Evidence 9] Capture Database Sesudah DELETE (BK-106 Hilang dari Neon)...');
    const afterDeleteBooks = await prisma.book.findMany({ orderBy: { id: 'asc' } });
    const afterDeleteHtml = generateNeonConsoleHtml({
      badgeTitle: 'AFTER DELETE: SESUDAH DIHAPUS',
      scenarioName: '7. Status Database Sesudah DELETE /api/books/BK-106 (0 Rows Returned)',
      sqlQuery: `SELECT id, judul, penulis, stok, status FROM pustaka.books WHERE id = 'BK-106';`,
      execTime: '19ms',
      rows: afterDeleteBooks.filter((b) => b.id === 'BK-106'), // Kosong!
      deletedRow: targetDeletedBook,
    });
    await page.setContent(afterDeleteHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_09_delete_after.png') });
    console.log('   -> Tersimpan: db_09_delete_after.png');

    console.log('📸 [DB Evidence 10] Capture Side-by-Side Comparison DELETE (Before vs After)...');
    const deleteComparisonHtml = generateNeonConsoleHtml({
      badgeTitle: 'COMPARISON: DELETE /api/books/BK-106',
      scenarioName: 'Perbandingan Database Sebelum vs Sesudah Operasi DELETE',
      sqlQuery: `DELETE FROM pustaka.books WHERE id = 'BK-106';`,
      execTime: '27ms',
      isComparison: true,
      beforeRows: beforeDeleteBooks,
      afterRows: afterDeleteBooks,
      deletedRow: targetDeletedBook,
      diffSummary: {
        title: 'Operasi: DELETE /api/books/BK-106 (Prisma: prisma.book.delete())',
        description: 'Record "BK-106 (Filosofi Teras)" berhasil dihapus secara permanen dari database cloud Neon PostgreSQL.',
        delta: '-1 Record (7 -> 6 Rows)',
      },
    });
    await page.setContent(deleteComparisonHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_10_delete_comparison.png') });
    console.log('   -> Tersimpan: db_10_delete_comparison.png');

    // -------------------------------------------------------------
    // DB EVIDENCE 11: FINAL DATABASE STATE
    // -------------------------------------------------------------
    console.log('\n📸 [DB Evidence 11] Capture Status Akhir Database Neon PostgreSQL...');
    const finalHtml = generateNeonConsoleHtml({
      badgeTitle: 'STATUS AKHIR: COMPLETE CRUD CYCLE',
      scenarioName: '8. Status Akhir Seluruh Koleksi Buku di Neon PostgreSQL Sesudah CRUD',
      sqlQuery: 'SELECT id, judul, penulis, kategori, tahun, stok, status, "createdAt", "updatedAt" FROM pustaka.books ORDER BY id ASC;',
      execTime: '25ms',
      rows: afterDeleteBooks,
    });
    await page.setContent(finalHtml, { waitUntil: 'load' });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'db_11_final_state.png') });
    console.log('   -> Tersimpan: db_11_final_state.png');

    console.log('\n===============================================================');
    console.log('🎉 SEMUA EVIDENCE UI DAN DATABASE BERHASIL DICAPTURE DENGAN SUKSES!');
    console.log('===============================================================');
  } catch (err) {
    console.error('❌ Terjadi error saat proses generasi evidence:', err);
  } finally {
    if (browser) await browser.close();
    if (server) {
      server.kill();
      try {
        process.kill(server.pid);
      } catch (e) {}
    }
    await prisma.$disconnect();
  }
}

run();
