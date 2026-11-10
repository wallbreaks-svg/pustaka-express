/**
 * PUSTAKAKU - CLIENT SIDE LOGIC
 * Mengimplementasikan seluruh operasi CRUD (GET, POST, PUT, DELETE)
 * menggunakan Fetch API untuk berkomunikasi dengan Express Back-End.
 */

// State Aplikasi
let appState = {
  books: [],
  selectedBookId: null,
  activeCategory: 'Semua',
  searchQuery: ''
};

// URL API Endpoints
const API_BASE = '/api/books';

// DOM Elements
const elements = {
  // Table & Lists
  tableBody: document.getElementById('booksTableBody'),
  emptyState: document.getElementById('emptyState'),
  dataCountBadge: document.getElementById('dataCountBadge'),
  
  // Dashboard Stats
  statTotalBooks: document.getElementById('statTotalBooks'),
  statTotalStock: document.getElementById('statTotalStock'),
  statCategories: document.getElementById('statCategories'),
  statAvailable: document.getElementById('statAvailable'),

  // Filters & Controls
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  categoryFilter: document.getElementById('categoryFilter'),
  refreshBtn: document.getElementById('refreshBtn'),

  // Form Tambah (POST)
  addForm: document.getElementById('addBookForm'),
  btnSubmitAdd: document.getElementById('btnSubmitAdd'),
  addJudul: document.getElementById('addJudul'),
  addPenulis: document.getElementById('addPenulis'),
  addKategori: document.getElementById('addKategori'),
  addTahun: document.getElementById('addTahun'),
  addStok: document.getElementById('addStok'),
  addStatus: document.getElementById('addStatus'),
  addSinopsis: document.getElementById('addSinopsis'),

  // Modal Edit (PUT)
  editModal: document.getElementById('editModal'),
  editForm: document.getElementById('editBookForm'),
  editBookId: document.getElementById('editBookId'),
  editIdDisplay: document.getElementById('editIdDisplay'),
  editJudul: document.getElementById('editJudul'),
  editPenulis: document.getElementById('editPenulis'),
  editKategori: document.getElementById('editKategori'),
  editTahun: document.getElementById('editTahun'),
  editStok: document.getElementById('editStok'),
  editStatus: document.getElementById('editStatus'),
  editSinopsis: document.getElementById('editSinopsis'),
  closeEditModalBtn: document.getElementById('closeEditModalBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  btnSubmitEdit: document.getElementById('btnSubmitEdit'),

  // Modal Hapus (DELETE)
  deleteModal: document.getElementById('deleteModal'),
  deleteBookId: document.getElementById('deleteBookId'),
  deleteBookBadgeId: document.getElementById('deleteBookBadgeId'),
  deleteBookTitle: document.getElementById('deleteBookTitle'),
  deleteBookAuthor: document.getElementById('deleteBookAuthor'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer')
};

// ============================================================================
// 1. GET: MENAMPILKAN SELURUH DATA BUKU DARI BACKEND
// ============================================================================
async function fetchBooks() {
  try {
    // Tampilkan status loading di tabel jika baru pertama kali atau refresh
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-state">
          <div class="spinner"></div>
          <p>Memuat data koleksi buku...</p>
        </td>
      </tr>
    `;
    elements.emptyState.style.display = 'none';

    // Susun query parameters untuk pencarian dan kategori
    const params = new URLSearchParams();
    if (appState.searchQuery.trim()) {
      params.append('search', appState.searchQuery.trim());
    }
    if (appState.activeCategory && appState.activeCategory !== 'Semua') {
      params.append('category', appState.activeCategory);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}${queryString}`);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    appState.books = result.data || [];

    // Render tabel data dan perbarui statistik
    renderTable(appState.books);
    fetchStats();

  } catch (error) {
    console.error('Error saat GET data buku:', error);
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">
          ⚠️ Gagal mengambil data dari server Express.<br>
          <small>${error.message}</small>
        </td>
      </tr>
    `;
    showToast('Gagal memuat data buku dari server!', 'error');
  }
}

// Render isi tabel berdasarkan array data buku
function renderTable(books) {
  elements.dataCountBadge.textContent = `${books.length} Buku Ditemukan`;

  if (books.length === 0) {
    elements.tableBody.innerHTML = '';
    elements.emptyState.style.display = 'block';
    return;
  }

  elements.emptyState.style.display = 'none';

  const rowsHtml = books.map((book) => {
    // Helper badge class kategori
    const catClass = getCategoryBadgeClass(book.kategori);
    const statusClass = getStatusBadgeClass(book.status);

    return `
      <tr data-id="${book.id}">
        <td>
          <span class="badge badge-id">${escapeHtml(book.id)}</span>
        </td>
        <td>
          <div class="book-title-cell">
            <span class="book-title-text">${escapeHtml(book.judul)}</span>
            <span class="book-author-text">oleh ${escapeHtml(book.penulis)}</span>
            ${book.sinopsis ? `<span class="book-desc-preview" title="${escapeHtml(book.sinopsis)}">${escapeHtml(book.sinopsis)}</span>` : ''}
          </div>
        </td>
        <td>
          <span class="badge badge-category ${catClass}">${escapeHtml(book.kategori)}</span>
        </td>
        <td style="text-align: center; font-weight: 500;">
          ${escapeHtml(book.tahun || '-')}
        </td>
        <td style="text-align: center; font-weight: 700; color: #334155;">
          ${escapeHtml(book.stok !== undefined ? book.stok : 0)}
        </td>
        <td style="text-align: center;">
          <span class="status-badge ${statusClass}">
            ${escapeHtml(book.status || 'Tersedia')}
          </span>
        </td>
        <td>
          <div class="actions-cell">
            <button 
              type="button" 
              class="btn btn-edit" 
              onclick="openEditModal('${escapeHtml(book.id)}')"
              title="Edit buku ini (PUT)"
            >
              ✏️ Edit
            </button>
            <button 
              type="button" 
              class="btn btn-delete" 
              onclick="openDeleteModal('${escapeHtml(book.id)}')"
              title="Hapus buku ini (DELETE)"
            >
              🗑️ Hapus
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  elements.tableBody.innerHTML = rowsHtml;
}

// Mengambil dan memperbarui ringkasan statistik
async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/stats/summary`);
    if (res.ok) {
      const { data } = await res.json();
      elements.statTotalBooks.textContent = data.totalBuku;
      elements.statTotalStock.textContent = data.totalStok;
      elements.statCategories.textContent = data.totalKategori;
      elements.statAvailable.textContent = data.bukuTersedia;
    }
  } catch (err) {
    console.warn('Gagal memuat statistik:', err);
  }
}

// ============================================================================
// 2. POST: MENAMBAHKAN DATA MELALUI FORM
// ============================================================================
elements.addForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newBookData = {
    judul: elements.addJudul.value.trim(),
    penulis: elements.addPenulis.value.trim(),
    kategori: elements.addKategori.value,
    tahun: elements.addTahun.value ? parseInt(elements.addTahun.value, 10) : new Date().getFullYear(),
    stok: elements.addStok.value !== '' ? parseInt(elements.addStok.value, 10) : 1,
    status: elements.addStatus.value,
    sinopsis: elements.addSinopsis.value.trim()
  };

  // Validasi sederhana front-end
  if (!newBookData.judul || !newBookData.penulis || !newBookData.kategori) {
    showToast('Judul, Penulis, dan Kategori wajib diisi!', 'error');
    return;
  }

  // Animasi tombol submit
  const originalBtnText = elements.btnSubmitAdd.innerHTML;
  elements.btnSubmitAdd.disabled = true;
  elements.btnSubmitAdd.innerHTML = `<span>⏳ Menyimpan...</span>`;

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newBookData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal menambahkan buku.');
    }

    // Berhasil menambahkan data (POST)
    showToast(`✅ [POST] Berhasil: "${result.data.judul}" ditambahkan ke katalog!`, 'success');

    // Reset Form input
    elements.addForm.reset();
    elements.addTahun.value = new Date().getFullYear();
    elements.addStok.value = 5;
    elements.addStatus.value = 'Tersedia';

    // Muat ulang daftar buku (GET)
    await fetchBooks();

  } catch (error) {
    console.error('Error saat POST buku:', error);
    showToast(`❌ Gagal menambahkan: ${error.message}`, 'error');
  } finally {
    elements.btnSubmitAdd.disabled = false;
    elements.btnSubmitAdd.innerHTML = originalBtnText;
  }
});

// ============================================================================
// 3. PUT: MENGUBAH DATA MELALUI FITUR EDIT (MODAL)
// ============================================================================
window.openEditModal = async function(bookId) {
  try {
    // Ambil data buku dari server atau state lokal
    let book = appState.books.find(b => b.id.toString() === bookId.toString());
    
    if (!book) {
      const response = await fetch(`${API_BASE}/${bookId}`);
      if (response.ok) {
        const resData = await response.json();
        book = resData.data;
      }
    }

    if (!book) {
      showToast('Buku tidak ditemukan!', 'error');
      return;
    }

    // Isi nilai input form edit
    elements.editBookId.value = book.id;
    elements.editIdDisplay.textContent = book.id;
    elements.editJudul.value = book.judul;
    elements.editPenulis.value = book.penulis;
    elements.editKategori.value = book.kategori;
    elements.editTahun.value = book.tahun || 2024;
    elements.editStok.value = book.stok !== undefined ? book.stok : 0;
    elements.editStatus.value = book.status || 'Tersedia';
    elements.editSinopsis.value = book.sinopsis || '';

    // Tampilkan modal edit
    elements.editModal.classList.add('show');
    elements.editModal.setAttribute('aria-hidden', 'false');
    elements.editJudul.focus();

  } catch (error) {
    console.error('Error open edit modal:', error);
    showToast('Gagal membuka data buku untuk diedit.', 'error');
  }
};

function closeEditModal() {
  elements.editModal.classList.remove('show');
  elements.editModal.setAttribute('aria-hidden', 'true');
  elements.editForm.reset();
}

// Event Listeners Tutup Modal Edit
elements.closeEditModalBtn.addEventListener('click', closeEditModal);
elements.cancelEditBtn.addEventListener('click', closeEditModal);
elements.editModal.addEventListener('click', (e) => {
  if (e.target === elements.editModal) closeEditModal();
});

// Handle Submit Edit Form (PUT)
elements.editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = elements.editBookId.value;
  const updatedData = {
    judul: elements.editJudul.value.trim(),
    penulis: elements.editPenulis.value.trim(),
    kategori: elements.editKategori.value,
    tahun: parseInt(elements.editTahun.value, 10),
    stok: parseInt(elements.editStok.value, 10),
    status: elements.editStatus.value,
    sinopsis: elements.editSinopsis.value.trim()
  };

  // Validasi
  if (!updatedData.judul || !updatedData.penulis || !updatedData.kategori) {
    showToast('Judul, Penulis, dan Kategori wajib diisi!', 'error');
    return;
  }

  // Tombol loading
  const originalBtnText = elements.btnSubmitEdit.innerHTML;
  elements.btnSubmitEdit.disabled = true;
  elements.btnSubmitEdit.innerHTML = `<span>⏳ Menyimpan perubahan...</span>`;

  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal memperbarui buku.');
    }

    // Berhasil update data (PUT)
    showToast(`✏️ [PUT] Berhasil: Data buku "${result.data.judul}" diperbarui!`, 'success');
    closeEditModal();

    // Refresh data tabel
    await fetchBooks();

  } catch (error) {
    console.error('Error saat PUT buku:', error);
    showToast(`❌ Gagal memperbarui: ${error.message}`, 'error');
  } finally {
    elements.btnSubmitEdit.disabled = false;
    elements.btnSubmitEdit.innerHTML = originalBtnText;
  }
});

// ============================================================================
// 4. DELETE: MENGHAPUS DATA MELALUI TOMBOL HAPUS
// ============================================================================
window.openDeleteModal = function(bookId) {
  const book = appState.books.find(b => b.id.toString() === bookId.toString());
  if (!book) return;

  elements.deleteBookId.value = book.id;
  elements.deleteBookBadgeId.textContent = book.id;
  elements.deleteBookTitle.textContent = book.judul;
  elements.deleteBookAuthor.textContent = `oleh ${book.penulis}`;

  elements.deleteModal.classList.add('show');
  elements.deleteModal.setAttribute('aria-hidden', 'false');
};

function closeDeleteModal() {
  elements.deleteModal.classList.remove('show');
  elements.deleteModal.setAttribute('aria-hidden', 'true');
  elements.deleteBookId.value = '';
}

// Event Listeners Tutup Modal Hapus
elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
elements.deleteModal.addEventListener('click', (e) => {
  if (e.target === elements.deleteModal) closeDeleteModal();
});

// Konfirmasi Tombol Hapus (DELETE)
elements.confirmDeleteBtn.addEventListener('click', async () => {
  const id = elements.deleteBookId.value;
  if (!id) return;

  const originalBtnText = elements.confirmDeleteBtn.innerHTML;
  elements.confirmDeleteBtn.disabled = true;
  elements.confirmDeleteBtn.innerHTML = `<span>⏳ Menghapus...</span>`;

  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal menghapus buku.');
    }

    // Berhasil hapus data (DELETE)
    showToast(`🗑️ [DELETE] Buku "${result.data.judul}" berhasil dihapus dari sistem!`, 'info');
    closeDeleteModal();

    // Refresh tabel data (GET)
    await fetchBooks();

  } catch (error) {
    console.error('Error saat DELETE buku:', error);
    showToast(`❌ Gagal menghapus: ${error.message}`, 'error');
  } finally {
    elements.confirmDeleteBtn.disabled = false;
    elements.confirmDeleteBtn.innerHTML = originalBtnText;
  }
});

// ============================================================================
// 5. SEARCH & FILTER EVENTS
// ============================================================================
let searchDebounceTimeout = null;
elements.searchInput.addEventListener('input', (e) => {
  const val = e.target.value;
  elements.clearSearchBtn.style.display = val ? 'block' : 'none';

  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    appState.searchQuery = val;
    fetchBooks();
  }, 250);
});

elements.clearSearchBtn.addEventListener('click', () => {
  elements.searchInput.value = '';
  elements.clearSearchBtn.style.display = 'none';
  appState.searchQuery = '';
  fetchBooks();
});

elements.categoryFilter.addEventListener('change', (e) => {
  appState.activeCategory = e.target.value;
  fetchBooks();
});

elements.refreshBtn.addEventListener('click', () => {
  fetchBooks();
  showToast('Memperbarui data katalog buku...', 'info');
});

// ============================================================================
// 6. TOAST NOTIFICATIONS HELPER
// ============================================================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '🎉',
    error: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '🔔'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 250);
  }, 3500);
}

// ============================================================================
// 7. UTILITY & HELPER FUNCTIONS
// ============================================================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCategoryBadgeClass(kategori) {
  const map = {
    'teknologi': 'cat-teknologi',
    'fiksi': 'cat-fiksi',
    'sains': 'cat-sains',
    'pengembangan diri': 'cat-pengembangan',
    'bisnis': 'cat-bisnis',
    'sejarah': 'cat-sejarah',
    'desain': 'cat-desain'
  };
  return map[(kategori || '').toLowerCase()] || 'cat-teknologi';
}

function getStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'tersedia') return 'status-tersedia';
  if (s === 'dipinjam') return 'status-dipinjam';
  if (s === 'habis') return 'status-habis';
  return 'status-tersedia';
}

// Inisialisasi awal saat halaman pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
  fetchBooks();
});
