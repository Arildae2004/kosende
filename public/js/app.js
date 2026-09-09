/**
 * KosEnde - Frontend Application
 * Professional UI for Kos Management Platform
 */

// API Configuration
const API_BASE = '/api';

// State Management
const state = {
    user: null,
    token: localStorage.getItem('token'),
    listings: [],
    currentPage: 'home',
};

// =====================================================
// SECURITY - XSS PROTECTION
// =====================================================

/**
 * Escape HTML entities to prevent XSS attacks
 * Selalu gunakan fungsi ini saat memasukkan data user ke innerHTML
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Escape HTML untuk object/array recursively
 */
function escapeHtmlObject(obj) {
    if (typeof obj === 'string') {
        return escapeHtml(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => escapeHtmlObject(item));
    }
    if (obj && typeof obj === 'object') {
        const escaped = {};
        for (const [key, value] of Object.entries(obj)) {
            escaped[key] = escapeHtmlObject(value);
        }
        return escaped;
    }
    return obj;
}

/**
 * Safe innerHTML setter - escape data sebelum masuk ke DOM
 */
function safeInnerHTML(element, html) {
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }
    if (element) {
        element.innerHTML = html;
    }
}

// =====================================================
// API HELPER
// =====================================================
async function api(endpoint, options = {}) {
    // Add cache-busting timestamp
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${API_BASE}${endpoint}${separator}_t=${Date.now()}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...options.headers,
        },
        ...options,
        cache: 'no-store',
    };

    if (state.token) {
        config.headers['Authorization'] = `Bearer ${state.token}`;
    }

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error' };
    }
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================
function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
    };

    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// =====================================================
// MODAL FUNCTIONS
// =====================================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function switchModal(fromId, toId) {
    closeModal(fromId);
    setTimeout(() => showModal(toId), 200);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// =====================================================
// NAVIGATION & MOBILE MENU
// =====================================================
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const mobileToggle = document.getElementById('mobileToggle');

    // Scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Create mobile menu if it doesn't exist
    createMobileMenu();

    // Mobile toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            openMobileMenu();
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        const mobileMenu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('mobileMenuOverlay');
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
                closeMobileMenu();
            }
        }
    });

    // Close mobile menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });

    // Nav link clicks - menggunakan onclick handler dari HTML
    // Jangan add event listener lagi karena sudah ada onclick di HTML
}

function createMobileMenu() {
    if (document.getElementById('mobileMenu')) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    overlay.id = 'mobileMenuOverlay';
    overlay.onclick = closeMobileMenu;

    // Create mobile menu
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    mobileMenu.id = 'mobileMenu';

    // Get auth state
    const isLoggedIn = !!state.token;
    const user = state.user;

    mobileMenu.innerHTML = `
        <div class="mobile-menu-header">
            <a href="/" class="logo">
                <i class="fas fa-home"></i>
                <span>KosEnde</span>
            </a>
            <button class="mobile-menu-close" onclick="closeMobileMenu()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="mobile-menu-links">
            <a href="#" class="mobile-menu-link ${state.currentPage === 'home' ? 'active' : ''}" onclick="goToHome(); closeMobileMenu(); return false;">
                <i class="fas fa-home"></i> Beranda
            </a>
            <a href="#" class="mobile-menu-link ${state.currentPage === 'listings' ? 'active' : ''}" onclick="goToListings(); closeMobileMenu(); return false;">
                <i class="fas fa-search"></i> Cari Kos
            </a>
            <a href="#" class="mobile-menu-link ${state.currentPage === 'about' ? 'active' : ''}" onclick="goToAbout(); closeMobileMenu(); return false;">
                <i class="fas fa-info-circle"></i> Tentang
            </a>
            ${isLoggedIn ? `
                <a href="#" class="mobile-menu-link" onclick="goToDashboard(); closeMobileMenu(); return false;">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
            ` : ''}
        </div>
        <div class="mobile-menu-actions">
            ${isLoggedIn ? `
                <button class="btn btn-danger" onclick="handleLogout(); closeMobileMenu();">
                    <i class="fas fa-sign-out-alt"></i> Keluar
                </button>
            ` : `
                <button class="btn btn-primary" onclick="showModal('loginModal'); closeMobileMenu();">
                    <i class="fas fa-sign-in-alt"></i> Masuk
                </button>
                <button class="btn btn-ghost" onclick="showModal('registerModal'); closeMobileMenu();">
                    <i class="fas fa-user-plus"></i> Daftar
                </button>
            `}
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(mobileMenu);
}

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (mobileMenu && overlay) {
        mobileMenu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (mobileMenu && overlay) {
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateMobileMenu() {
    // Recreate mobile menu when auth state changes
    const existingMenu = document.getElementById('mobileMenu');
    const existingOverlay = document.getElementById('mobileMenuOverlay');
    if (existingMenu) existingMenu.remove();
    if (existingOverlay) existingOverlay.remove();
    createMobileMenu();
}

// =====================================================
// AUTH FUNCTIONS
// =====================================================
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const result = await api('/auth/login', {
        method: 'POST',
        body: { email, password },
    });

    if (result.success) {
        state.user = result.data.user;
        state.token = result.data.token;
        localStorage.setItem('token', result.data.token);
        closeModal('loginModal');
        showToast('success', 'Berhasil!', 'Selamat datang di KosEnde');
        updateUIForLoggedInUser();
    } else {
        showToast('error', 'Gagal Masuk', result.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    const result = await api('/auth/register', {
        method: 'POST',
        body: { name, email, phone, password, role },
    });

    if (result.success) {
        state.user = result.data.user;
        state.token = result.data.token;
        localStorage.setItem('token', result.data.token);
        closeModal('registerModal');
        showToast('success', 'Pendaftaran Berhasil!', 'Trial 14 hari Anda telah aktif');
        updateUIForLoggedInUser();
    } else {
        showToast('error', 'Pendaftaran Gagal', result.message);
    }
}

function logout() {
    state.user = null;
    state.token = null;
    localStorage.removeItem('token');
    showToast('info', 'Keluar', 'Anda telah keluar dari akun');
    updateUIForLoggedOutUser();
    updateMobileMenu();
    window.location.reload();
}

function updateUIForLoggedInUser() {
    const navActions = document.getElementById('navActions');
    const navLinks = document.getElementById('navLinks');

    if (state.user) {
        navActions.innerHTML = `
            <div class="user-menu">
                <button class="btn btn-ghost" onclick="goToDashboard()">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </button>
                <button class="btn btn-primary" onclick="logout()">Keluar</button>
            </div>
        `;

        // Update nav links for logged-in users
        navLinks.innerHTML = `
            <li><a href="#" class="nav-link active" data-page="home" onclick="goToHome(); return false;">Beranda</a></li>
            <li><a href="#" class="nav-link" data-page="listings" onclick="goToListings(); return false;">Cari Kos</a></li>
            <li><a href="#" class="nav-link" data-page="about" onclick="goToAbout(); return false;">Tentang</a></li>
        `;

        // Update mobile menu
        updateMobileMenu();
    }
}

function showPublicContent() {
    // Show public content, hide dashboard
    document.getElementById('publicContent').style.display = '';
    document.getElementById('dashboardContainer').style.display = 'none';
}

function showDashboard(content) {
    // Hide public content, show dashboard
    document.getElementById('publicContent').style.display = 'none';
    const dashboard = document.getElementById('dashboardContainer');
    dashboard.style.display = '';
    dashboard.innerHTML = content;
}

function showPage(pageId) {
    // Hide all pages
    var pages = document.querySelectorAll('.page-content');
    for (var i = 0; i < pages.length; i++) {
        pages[i].style.display = 'none';
    }

    // Show selected page
    var targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
    }

    // Update nav links active state
    var links = document.querySelectorAll('.nav-link');
    for (var j = 0; j < links.length; j++) {
        links[j].classList.remove('active');
        if (links[j].getAttribute('data-page') === pageId.replace('Page', '')) {
            links[j].classList.add('active');
        }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToHome() {
    // Show public content, hide dashboard
    showPublicContent();

    // Show home page
    showPage('homePage');

    // Reload listings count
    loadListings();
}

function goToListings() {
    // Show public content, hide dashboard
    showPublicContent();

    // Show listings page
    showPage('listingsPage');

    // Load listings data
    loadListings();
}

function goToAbout() {
    // Show public content, hide dashboard
    showPublicContent();

    // Show about page
    showPage('aboutPage');
}

function updateUIForLoggedOutUser() {
    const navActions = document.getElementById('navActions');
    navActions.innerHTML = `
        <button class="btn btn-ghost" onclick="showModal('loginModal')">Masuk</button>
        <button class="btn btn-primary" onclick="showModal('registerModal')">Daftar</button>
    `;
}

// =====================================================
// LISTINGS FUNCTIONS
// =====================================================
async function loadListings() {
    const grid = document.getElementById('listingsGrid');
    const empty = document.getElementById('listingsEmpty');

    grid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    const result = await api('/listings');

    if (result.success) {
        state.listings = result.data;
        document.getElementById('totalListings').textContent = result.data.length;

        if (result.data.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'block';
        } else {
            grid.style.display = 'grid';
            empty.style.display = 'none';
            renderListings(result.data);
        }
    }
}

function renderListings(listings) {
    const grid = document.getElementById('listingsGrid');
    grid.innerHTML = listings.map(listing => {
        // Escape all user data to prevent XSS
        const safeTitle = escapeHtml(listing.title);
        const safeVillage = escapeHtml(listing.village || '');
        const safeDistrict = escapeHtml(listing.district || 'Ende');
        const safeAddress = escapeHtml(listing.address || '');
        const safeOwnerName = escapeHtml(listing.owner_name || '');

        const hasImage = listing.images && listing.images.length > 0;
        const imageHtml = hasImage
            ? `<img src="${escapeHtml(listing.images[0])}" alt="${safeTitle}" onerror="this.parentElement.innerHTML='<div class=\'no-image\'><i class=\'fas fa-home\'></i></div>'">`
            : `<div class="no-image"><i class="fas fa-home"></i></div>`;

        return `
        <div class="listing-card" onclick="showListingDetail('${escapeHtml(listing.id)}')" style="cursor: pointer;">
            <div class="listing-image">
                ${imageHtml}
                <span class="listing-badge">Tersedia</span>
            </div>
            <div class="listing-content">
                <div class="listing-price">
                    Rp ${formatNumber(listing.price_monthly)} <span>/ bulan</span>
                </div>
                <h3 class="listing-title">${safeTitle}</h3>
                <div class="listing-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${safeVillage}, ${safeDistrict}
                </div>
                <div class="listing-features">
                    ${(listing.facilities || []).slice(0, 3).map(f =>
                        `<span class="feature-tag">${escapeHtml(f)}</span>`
                    ).join('')}
                </div>
                <div class="listing-footer">
                    <div class="listing-owner">
                        <div class="owner-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <span class="owner-name">${safeOwnerName}</span>
                    </div>
                    <div class="listing-contact">
                        <a href="https://wa.me/${listing.owner_phone?.replace(/^0/, '62')}" target="_blank" class="btn btn-primary" onclick="event.stopPropagation();">
                            <i class="fab fa-whatsapp"></i> Hubungi
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

/**
 * Show listing detail modal - anyone can view
 */
async function showListingDetail(listingId) {
    // Show loading
    const modalHtml = `
        <div class="modal active" id="listingDetailModal">
            <div class="modal-overlay" onclick="closeListingDetailModal()"></div>
            <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                <button class="modal-close" onclick="closeListingDetailModal()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Memuat detail kos...</p>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.id = 'listingDetailContainer';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    document.body.style.overflow = 'hidden';

    // Fetch listing detail
    const result = await api(`/listings/${listingId}`);

    if (!result.success) {
        document.getElementById('listingDetailContainer').remove();
        showToast('error', 'Gagal', 'Tidak dapat memuat detail listing');
        return;
    }

    const listing = result.data;

    // Escape all data
    const safeTitle = escapeHtml(listing.title || '');
    const safeDescription = escapeHtml(listing.description || '-');
    const safeAddress = escapeHtml(listing.address || '');
    const safeVillage = escapeHtml(listing.village || '-');
    const safeDistrict = escapeHtml(listing.district || '-');
    const safeCity = escapeHtml(listing.city || 'Ende');
    const safeProvince = escapeHtml(listing.province || 'Nusa Tenggara Timur');
    const safeRoomSize = escapeHtml(listing.room_size || '-');
    const safeOwnerName = escapeHtml(listing.owner_name || '-');
    const safeOwnerPhone = escapeHtml(listing.owner_phone || '');
    const safeFacilities = listing.facilities || [];
    const safeImages = listing.images || [];

    // Build image gallery
    let imagesHtml = '';
    if (safeImages.length > 0) {
        imagesHtml = `
            <div class="detail-gallery">
                <div class="detail-main-image">
                    <img src="${escapeHtml(safeImages[0])}" alt="${safeTitle}" id="detailMainImage" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23e2e8f0%22 width=%22400%22 height=%22300%22/><text x=%22200%22 y=%22150%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2240%22>🏠</text></svg>'">
                </div>
                ${safeImages.length > 1 ? `
                    <div class="detail-thumbnails">
                        ${safeImages.map((img, i) => `
                            <img src="${escapeHtml(img)}" alt="Foto ${i + 1}" class="detail-thumb ${i === 0 ? 'active' : ''}" onclick="document.getElementById('detailMainImage').src='${escapeHtml(img)}'; document.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active')); this.classList.add('active');" onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        imagesHtml = `
            <div class="detail-gallery">
                <div class="detail-main-image no-image-large">
                    <i class="fas fa-home"></i>
                    <p>Belum ada foto</p>
                </div>
            </div>
        `;
    }

    // Build facilities tags
    const facilitiesHtml = safeFacilities.length > 0
        ? safeFacilities.map(f => `<span class="feature-tag">${escapeHtml(f)}</span>`).join('')
        : '<span class="text-muted">Tidak ada fasilitas terdaftar</span>';

    // WhatsApp link
    const waLink = safeOwnerPhone
        ? `https://wa.me/${safeOwnerPhone.replace(/^0/, '62')}`
        : '#';

    const detailHtml = `
        <div class="modal active" id="listingDetailModal">
            <div class="modal-overlay" onclick="closeListingDetailModal()"></div>
            <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                <button class="modal-close" onclick="closeListingDetailModal()">
                    <i class="fas fa-times"></i>
                </button>

                <!-- Image Gallery -->
                ${imagesHtml}

                <!-- Content -->
                <div class="detail-content">
                    <div class="detail-header">
                        <h2 class="detail-title">${safeTitle}</h2>
                        <div class="detail-price">Rp ${formatNumber(listing.price_monthly)} <span>/ bulan</span></div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-map-marker-alt"></i> Lokasi</h4>
                        <div class="detail-info-grid">
                            <div class="detail-info-item">
                                <span class="detail-label">Alamat</span>
                                <span class="detail-value">${safeAddress}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">Kelurahan/Desa</span>
                                <span class="detail-value">${safeVillage}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">Kecamatan</span>
                                <span class="detail-value">${safeDistrict}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">Kota</span>
                                <span class="detail-value">${safeCity}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">Provinsi</span>
                                <span class="detail-value">${safeProvince}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">Ukuran Kamar</span>
                                <span class="detail-value">${safeRoomSize}</span>
                            </div>
                        </div>
                    </div>

                    ${listing.description ? `
                        <div class="detail-section">
                            <h4><i class="fas fa-align-left"></i> Deskripsi</h4>
                            <p class="detail-description">${safeDescription}</p>
                        </div>
                    ` : ''}

                    <div class="detail-section">
                        <h4><i class="fas fa-list"></i> Fasilitas</h4>
                        <div class="detail-facilities">
                            ${facilitiesHtml}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-user"></i> Pemilik</h4>
                        <div class="detail-owner">
                            <div class="owner-avatar-large">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="owner-info">
                                <span class="owner-name-large">${safeOwnerName}</span>
                                ${safeOwnerPhone ? `<span class="owner-phone"><i class="fas fa-phone"></i> ${safeOwnerPhone}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    ${safeOwnerPhone ? `
                        <a href="${waLink}" target="_blank" class="btn btn-success btn-block" style="margin-top: 20px;">
                            <i class="fab fa-whatsapp"></i> Hubungi Pemilik via WhatsApp
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.getElementById('listingDetailContainer').innerHTML = detailHtml;
}

function closeListingDetailModal() {
    const modal = document.getElementById('listingDetailContainer');
    if (modal) modal.remove();
    document.body.style.overflow = '';
}

function filterListings() {
    const district = document.getElementById('filterDistrict').value;
    const maxPrice = document.getElementById('filterPrice').value;

    let filtered = state.listings;

    if (district) {
        filtered = filtered.filter(l => l.district === district);
    }

    if (maxPrice) {
        filtered = filtered.filter(l => parseFloat(l.price_monthly) <= parseFloat(maxPrice));
    }

    const grid = document.getElementById('listingsGrid');
    const empty = document.getElementById('listingsEmpty');

    if (filtered.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'block';
    } else {
        grid.style.display = 'grid';
        empty.style.display = 'none';
        renderListings(filtered);
    }
}

function searchListings() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    if (!query) {
        renderListings(state.listings);
        return;
    }

    const filtered = state.listings.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.address.toLowerCase().includes(query) ||
        (l.village && l.village.toLowerCase().includes(query)) ||
        (l.district && l.district.toLowerCase().includes(query))
    );

    const grid = document.getElementById('listingsGrid');
    const empty = document.getElementById('listingsEmpty');

    if (filtered.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'block';
    } else {
        grid.style.display = 'grid';
        empty.style.display = 'none';
        renderListings(filtered);
    }
}

// =====================================================
// DASHBOARD FUNCTIONS
// =====================================================
function goToDashboard() {
    if (!state.user) {
        showModal('loginModal');
        return;
    }

    if (state.user.role === 'admin') {
        loadAdminDashboard();
    } else {
        loadOwnerDashboard();
    }
}

async function loadOwnerDashboard() {
    // Show loading
    showDashboard('<div class="loading-container"><div class="loading-spinner"></div><p>Memuat data...</p></div>');

    // Fetch data
    const [subscriptionRes, listingsRes] = await Promise.all([
        api('/subscriptions/my-subscription'),
        api('/listings/my-listings'),
    ]);

    const subscription = subscriptionRes.data || {};
    const listings = listingsRes.data || [];

    showDashboard(`
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="container">
                    <h1><i class="fas fa-tachometer-alt"></i> Dashboard Owner</h1>
                </div>
            </div>
            <div class="dashboard-content">
                <div class="container">
                    <div class="dashboard-grid">
                        <aside class="sidebar">
                            <nav class="sidebar-menu">
                                <a href="#" class="sidebar-link active" onclick="loadOwnerDashboard(); return false;">
                                    <i class="fas fa-home"></i> Dashboard
                                </a>
                                <a href="#" class="sidebar-link" onclick="showAddListingModal(); return false;">
                                    <i class="fas fa-plus"></i> Tambah Kos
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadMyListings(); return false;">
                                    <i class="fas fa-list"></i> Kos Saya
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadSubscription(); return false;">
                                    <i class="fas fa-credit-card"></i> Langganan
                                </a>
                                <a href="#" class="sidebar-link" onclick="logout(); return false;">
                                    <i class="fas fa-sign-out-alt"></i> Keluar
                                </a>
                            </nav>
                        </aside>
                        <div class="main-panel">
                            <div class="subscription-card">
                                <div class="subscription-status">
                                    <i class="fas fa-circle"></i>
                                    ${subscription.status === 'active' ? 'Aktif' : subscription.status === 'trial' ? 'Trial' : 'Expired'}
                                </div>
                                <div class="subscription-info">
                                    <div>
                                        <div class="subscription-days">${subscription.days_remaining || 0}</div>
                                        <div class="subscription-label">Hari Tersisa</div>
                                    </div>
                                    <button class="btn btn-white" onclick="loadSubscription()">
                                        <i class="fas fa-credit-card"></i> Perpanjang
                                    </button>
                                </div>
                            </div>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-card-icon blue">
                                        <i class="fas fa-home"></i>
                                    </div>
                                    <div class="stat-card-value">${listings.length}</div>
                                    <div class="stat-card-label">Total Listing</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-card-icon green">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <div class="stat-card-value">${listings.filter(l => l.is_active).length}</div>
                                    <div class="stat-card-label">Aktif</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-card-icon yellow">
                                        <i class="fas fa-clock"></i>
                                    </div>
                                    <div class="stat-card-value">${listings.filter(l => l.status === 'pending').length}</div>
                                    <div class="stat-card-label">Menunggu</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-card-icon red">
                                        <i class="fas fa-times-circle"></i>
                                    </div>
                                    <div class="stat-card-value">${listings.filter(l => l.status === 'rejected').length}</div>
                                    <div class="stat-card-label">Ditolak</div>
                                </div>
                            </div>
                            <div class="panel-header">
                                <h2 class="panel-title">Listing Terbaru</h2>
                                <button class="btn btn-primary" onclick="showAddListingModal()">
                                    <i class="fas fa-plus"></i> Tambah Kos
                                </button>
                            </div>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Judul</th>
                                            <th>Harga</th>
                                            <th>Status</th>
                                            <th>Aktif</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${listings.slice(0, 5).map(l => `
                                            <tr>
                                                <td>${escapeHtml(l.title)}</td>
                                                <td>Rp ${formatNumber(l.price_monthly)}</td>
                                                <td><span class="status-badge ${escapeHtml(l.status)}">${escapeHtml(l.status)}</span></td>
                                                <td><span class="status-badge ${l.is_active ? 'active' : 'inactive'}">${l.is_active ? 'Ya' : 'Tidak'}</span></td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="action-btn view" title="Lihat Detail" onclick="showListingDetail('${escapeHtml(l.id)}')"><i class="fas fa-eye"></i></button>
                                                        <button class="action-btn edit" title="Edit" onclick="editListing('${escapeHtml(l.id)}')"><i class="fas fa-edit"></i></button>
                                                        <button class="action-btn delete" title="Hapus" onclick="deleteListing('${escapeHtml(l.id)}')"><i class="fas fa-trash"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

async function loadAdminDashboard() {
    // Show loading
    showDashboard('<div class="loading-container"><div class="loading-spinner"></div><p>Memuat data...</p></div>');

    // Fetch data
    const [pendingRes, paymentsRes, overviewRes] = await Promise.all([
        api('/listings/admin/pending'),
        api('/subscriptions/admin/pending-payments'),
        api('/subscriptions/admin/overview'),
    ]);

    const pendingListings = pendingRes.data || [];
    const pendingPayments = paymentsRes.data || [];
    const overview = overviewRes.data || [];

    showDashboard(`
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="container">
                    <h1><i class="fas fa-shield-alt"></i> Dashboard Admin</h1>
                </div>
            </div>
            <div class="dashboard-content">
                <div class="container">
                    <div class="dashboard-grid">
                        <aside class="sidebar">
                            <nav class="sidebar-menu">
                                <a href="#" class="sidebar-link active" onclick="loadAdminDashboard(); return false;">
                                    <i class="fas fa-home"></i> Dashboard
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadPendingListings(); return false;">
                                    <i class="fas fa-list"></i> Pending Listings
                                    ${pendingListings.length > 0 ? `<span class="badge">${pendingListings.length}</span>` : ''}
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadPendingPayments(); return false;">
                                    <i class="fas fa-money-bill"></i> Verifikasi Bayar
                                    ${pendingPayments.length > 0 ? `<span class="badge">${pendingPayments.length}</span>` : ''}
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadAllSubscriptions(); return false;">
                                    <i class="fas fa-users"></i> Semua Langganan
                                </a>
                                <a href="#" class="sidebar-link" onclick="logout(); return false;">
                                    <i class="fas fa-sign-out-alt"></i> Keluar
                                </a>
                            </nav>
                        </aside>
                        <div class="main-panel">
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-card-icon yellow">
                                        <i class="fas fa-clock"></i>
                                    </div>
                                    <div class="stat-card-value">${pendingListings.length}</div>
                                    <div class="stat-card-label">Pending Listings</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-card-icon blue">
                                        <i class="fas fa-money-bill"></i>
                                    </div>
                                    <div class="stat-card-value">${pendingPayments.length}</div>
                                    <div class="stat-card-label">Pending Payments</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-card-icon green">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <div class="stat-card-value">${overview.filter(o => o.subscription_status === 'active').length}</div>
                                    <div class="stat-card-label">Active Subscriptions</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-card-icon red">
                                        <i class="fas fa-exclamation-triangle"></i>
                                    </div>
                                    <div class="stat-card-value">${overview.filter(o => o.subscription_status === 'expired').length}</div>
                                    <div class="stat-card-label">Expired</div>
                                </div>
                            </div>
                            <div class="panel-header">
                                <h2 class="panel-title">Pending Listings</h2>
                            </div>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Judul</th>
                                            <th>Owner</th>
                                            <th>Harga</th>
                                            <th>Tanggal</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pendingListings.length === 0 ? '<tr><td colspan="5" style="text-align:center">Tidak ada pending listings</td></tr>' : ''}
                                        ${pendingListings.slice(0, 5).map(l => `
                                            <tr>
                                                <td>${escapeHtml(l.title)}</td>
                                                <td>${escapeHtml(l.owner_name)}</td>
                                                <td>Rp ${formatNumber(l.price_monthly)}</td>
                                                <td>${new Date(l.created_at).toLocaleDateString('id-ID')}</td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="action-btn view" title="Lihat Detail" onclick="showListingDetail('${escapeHtml(l.id)}')"><i class="fas fa-eye"></i></button>
                                                        <button class="action-btn edit" title="Approve" onclick="approveListing('${escapeHtml(l.id)}')"><i class="fas fa-check"></i></button>
                                                        <button class="action-btn delete" title="Reject" onclick="rejectListing('${escapeHtml(l.id)}')"><i class="fas fa-times"></i></button>
                                                        <button class="action-btn delete" title="Hapus Permanen" onclick="adminDeleteListing('${escapeHtml(l.id)}')"><i class="fas fa-trash"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

// =====================================================
// LISTING ACTIONS
// =====================================================
async function approveListing(id) {
    const result = await api(`/listings/admin/${id}/approve`, { method: 'PATCH' });
    if (result.success) {
        showToast('success', 'Berhasil!', 'Listing telah diapprove');
        loadAdminDashboard();
    } else {
        showToast('error', 'Gagal', result.message);
    }
}

async function rejectListing(id) {
    const reason = prompt('Alasan penolakan:');
    if (!reason) return;

    const result = await api(`/listings/admin/${id}/reject`, {
        method: 'PATCH',
        body: { reason },
    });
    if (result.success) {
        showToast('success', 'Berhasil!', 'Listing telah ditolak');
        loadAdminDashboard();
    } else {
        showToast('error', 'Gagal', result.message);
    }
}

async function deleteListing(id) {
    if (!confirm('Yakin ingin menghapus listing ini?')) return;

    const result = await api(`/listings/${id}`, { method: 'DELETE' });
    if (result.success) {
        showToast('success', 'Berhasil!', 'Listing telah dihapus');
        loadOwnerDashboard();
    } else {
        showToast('error', 'Gagal', result.message);
    }
}

/**
 * Edit listing - show edit modal
 */
async function editListing(id) {
    // Fetch listing detail
    const result = await api(`/listings/${id}`);
    if (!result.success) {
        showToast('error', 'Gagal', 'Tidak dapat memuat data listing');
        return;
    }

    const listing = result.data;

    // Fetch locations
    const locResult = await api('/locations');
    const locations = locResult.data || [];

    // Group locations by district
    const groupedByDistrict = {};
    locations.forEach(loc => {
        if (!groupedByDistrict[loc.district]) {
            groupedByDistrict[loc.district] = [];
        }
        groupedByDistrict[loc.district].push(loc);
    });

    // Get current district villages
    const currentDistrict = listing.district || '';
    const currentVillageId = listing.location_id || '';

    // Create modal HTML
    const modalHtml = `
        <div class="modal active" id="editListingModal">
            <div class="modal-overlay" onclick="closeEditListingModal()"></div>
            <div class="modal-content" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
                <button class="modal-close" onclick="closeEditListingModal()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="modal-header">
                    <div class="modal-icon">
                        <i class="fas fa-edit"></i>
                    </div>
                    <h2>Edit Kos</h2>
                    <p>Ubah data kos Anda</p>
                </div>
                <form id="editListingForm" onsubmit="handleEditListing(event, '${escapeHtml(listing.id)}')">
                    <div class="form-group">
                        <label for="editListingTitle">Judul Kos *</label>
                        <div class="input-wrapper">
                            <i class="fas fa-home"></i>
                            <input type="text" id="editListingTitle" value="${escapeHtml(listing.title)}" placeholder="Contoh: Kos Nyaman Ende" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editListingDescription">Deskripsi</label>
                        <div class="input-wrapper">
                            <i class="fas fa-align-left"></i>
                            <textarea id="editListingDescription" placeholder="Deskripsikan kos Anda..." rows="3" style="width:100%;padding:12px 16px 12px 44px;border:1.5px solid #e2e8f0;border-radius:12px;resize:vertical;">${escapeHtml(listing.description || '')}</textarea>
                        </div>
                    </div>
                    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label for="editListingDistrict">Kecamatan *</label>
                            <div class="input-wrapper">
                                <i class="fas fa-map"></i>
                                <select id="editListingDistrict" required onchange="updateEditVillageOptions()">
                                    <option value="">Pilih Kecamatan</option>
                                    ${Object.keys(groupedByDistrict).sort().map(dist => `<option value="${escapeHtml(dist)}" ${dist === currentDistrict ? 'selected' : ''}>${escapeHtml(dist)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editListingVillage">Kelurahan/Desa *</label>
                            <div class="input-wrapper">
                                <i class="fas fa-map-marker-alt"></i>
                                <select id="editListingVillage" required>
                                    <option value="">Pilih Kelurahan/Desa</option>
                                    ${currentDistrict && groupedByDistrict[currentDistrict] ? groupedByDistrict[currentDistrict].map(v => `<option value="${escapeHtml(v.id)}" ${v.id === currentVillageId ? 'selected' : ''}>${escapeHtml(v.village)}</option>`).join('') : ''}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editListingAddress">Alamat Lengkap *</label>
                        <div class="input-wrapper">
                            <i class="fas fa-road"></i>
                            <input type="text" id="editListingAddress" value="${escapeHtml(listing.address)}" placeholder="Contoh: Jl. Kelapa Lima No. 10, Ende" required>
                        </div>
                    </div>
                    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label for="editListingPrice">Harga per Bulan (Rp) *</label>
                            <div class="input-wrapper">
                                <i class="fas fa-money-bill"></i>
                                <input type="number" id="editListingPrice" value="${listing.price_monthly}" placeholder="750000" min="0" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editListingRoomSize">Ukuran Kamar</label>
                            <div class="input-wrapper">
                                <i class="fas fa-ruler-combined"></i>
                                <input type="text" id="editListingRoomSize" value="${escapeHtml(listing.room_size || '')}" placeholder="Contoh: 3x4 meter">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editListingFacilities">Fasilitas (pisahkan dengan koma)</label>
                        <div class="input-wrapper">
                            <i class="fas fa-list"></i>
                            <input type="text" id="editListingFacilities" value="${escapeHtml((listing.facilities || []).join(', '))}" placeholder="Contoh: AC, WiFi, Kamar Mandi Dalam, Parkir">
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        <span>Simpan Perubahan</span>
                        <i class="fas fa-check"></i>
                    </button>
                </form>
            </div>
        </div>
    `;

    // Store locations globally
    window._editLocationsData = groupedByDistrict;

    // Append modal to body
    const modalContainer = document.createElement('div');
    modalContainer.id = 'editModalContainer';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    document.body.style.overflow = 'hidden';
}

function updateEditVillageOptions() {
    const district = document.getElementById('editListingDistrict').value;
    const villageSelect = document.getElementById('editListingVillage');

    if (!district || !window._editLocationsData[district]) {
        villageSelect.innerHTML = '<option value="">Pilih Kelurahan/Desa</option>';
        villageSelect.disabled = true;
        return;
    }

    const villages = window._editLocationsData[district];
    villageSelect.innerHTML = '<option value="">Pilih Kelurahan/Desa</option>' +
        villages.map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.village)}</option>`).join('');
    villageSelect.disabled = false;
}

function closeEditListingModal() {
    const modal = document.getElementById('editModalContainer');
    if (modal) modal.remove();
    document.body.style.overflow = '';
}

async function handleEditListing(e, id) {
    e.preventDefault();

    const title = document.getElementById('editListingTitle').value.trim();
    const description = document.getElementById('editListingDescription').value.trim();
    const locationId = document.getElementById('editListingVillage').value;
    const address = document.getElementById('editListingAddress').value.trim();
    const priceInput = document.getElementById('editListingPrice').value;
    const roomSize = document.getElementById('editListingRoomSize').value.trim();
    const facilitiesInput = document.getElementById('editListingFacilities').value;

    if (!title || !locationId || !address || !priceInput) {
        showToast('error', 'Gagal', 'Judul, lokasi, alamat, dan harga wajib diisi');
        return;
    }

    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
        showToast('error', 'Gagal', 'Harga tidak valid');
        return;
    }

    const facilities = facilitiesInput
        .split(',')
        .map(f => f.trim())
        .filter(f => f);

    const listingData = {
        title,
        description,
        location_id: locationId,
        address,
        price_monthly: price,
        room_size: roomSize,
        facilities,
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Menyimpan...</span><div class="spinner" style="width:16px;height:16px;border-width:2px;"></div>';
    submitBtn.disabled = true;

    try {
        const result = await api(`/listings/${id}`, {
            method: 'PUT',
            body: listingData,
        });

        if (result.success) {
            closeEditListingModal();
            showToast('success', 'Berhasil!', 'Listing berhasil diperbarui');
            loadOwnerDashboard();
        } else {
            showToast('error', 'Gagal', result.message);
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showToast('error', 'Gagal', 'Terjadi kesalahan. Silakan coba lagi.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Admin delete any listing
 */
async function adminDeleteListing(id) {
    if (!confirm('Yakin ingin menghapus listing ini secara permanen?\n\nTindakan ini tidak bisa dibatalkan.')) return;

    const result = await api(`/listings/admin/${id}`, { method: 'DELETE' });
    if (result.success) {
        showToast('success', 'Berhasil!', 'Listing telah dihapus oleh admin');
        // Reload current admin page
        if (document.querySelector('.panel-title')?.textContent.includes('Pending')) {
            loadPendingListings();
        } else {
            loadAdminDashboard();
        }
    } else {
        showToast('error', 'Gagal', result.message);
    }
}

async function adminDeleteUser(userId, name) {
    if (!confirm(`Yakin ingin menghapus owner "${name}"?\n\nSemua data akan dihapus:\n- Semua listing kos\n- Data langganan\n- Riwayat pembayaran\n\nTindakan ini tidak bisa dibatalkan.`)) return;

    const result = await api(`/users/admin/${userId}`, { method: 'DELETE' });
    if (result.success) {
        showToast('success', 'Berhasil!', result.message);
        // Reload subscriptions page
        loadAllSubscriptions();
    } else {
        showToast('error', 'Gagal', result.message);
    }
}

// =====================================================
// ADD LISTING MODAL & FUNCTIONS
// =====================================================
async function showAddListingModal() {
    // Fetch locations first
    const locResult = await api('/locations');
    const locations = locResult.data || [];

    // Group locations by district
    const groupedByDistrict = {};
    locations.forEach(loc => {
        if (!groupedByDistrict[loc.district]) {
            groupedByDistrict[loc.district] = [];
        }
        groupedByDistrict[loc.district].push(loc);
    });

    // Create modal HTML
    const modalHtml = `
        <div class="modal active" id="addListingModal">
            <div class="modal-overlay" onclick="closeAddListingModal()"></div>
            <div class="modal-content" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
                <button class="modal-close" onclick="closeAddListingModal()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="modal-header">
                    <div class="modal-icon">
                        <i class="fas fa-plus"></i>
                    </div>
                    <h2>Tambah Kos Baru</h2>
                    <p>Daftarkan kos Anda untuk mendapat penyewa</p>
                </div>
                <form id="addListingForm" onsubmit="handleAddListing(event)">
                    <div class="form-group">
                        <label for="listingTitle">Judul Kos *</label>
                        <div class="input-wrapper">
                            <i class="fas fa-home"></i>
                            <input type="text" id="listingTitle" placeholder="Contoh: Kos Nyaman Ende" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="listingDescription">Deskripsi</label>
                        <div class="input-wrapper">
                            <i class="fas fa-align-left"></i>
                            <textarea id="listingDescription" placeholder="Deskripsikan kos Anda..." rows="3" style="width:100%;padding:12px 16px 12px 44px;border:1px solid #e5e7eb;border-radius:12px;resize:vertical;"></textarea>
                        </div>
                    </div>

                    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label for="listingDistrict">Kecamatan *</label>
                            <div class="input-wrapper">
                                <i class="fas fa-map"></i>
                                <select id="listingDistrict" required onchange="updateVillageOptions()">
                                    <option value="">Pilih Kecamatan</option>
                                    ${Object.keys(groupedByDistrict).sort().map(dist => `<option value="${dist}">${dist}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="listingVillage">Kelurahan/Desa *</label>
                            <div class="input-wrapper">
                                <i class="fas fa-map-marker-alt"></i>
                                <select id="listingVillage" required disabled>
                                    <option value="">Pilih Kelurahan/Desa</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="listingAddress">Alamat Lengkap *</label>
                        <div class="input-wrapper">
                            <i class="fas fa-road"></i>
                            <input type="text" id="listingAddress" placeholder="Contoh: Jl. Kelapa Lima No. 10, Ende" required>
                        </div>
                    </div>
                    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label for="listingPrice">Harga per Bulan (Rp) *</label>
                            <div class="input-wrapper">
                                <i class="fas fa-money-bill"></i>
                                <input type="number" id="listingPrice" placeholder="750000" min="0" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="listingDeposit">Deposit (Rp)</label>
                            <div class="input-wrapper">
                                <i class="fas fa-shield-alt"></i>
                                <input type="number" id="listingDeposit" placeholder="0" min="0">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="listingRoomSize">Ukuran Kamar</label>
                        <div class="input-wrapper">
                            <i class="fas fa-ruler-combined"></i>
                            <input type="text" id="listingRoomSize" placeholder="Contoh: 3x4 meter">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="listingFacilities">Fasilitas (pisahkan dengan koma)</label>
                        <div class="input-wrapper">
                            <i class="fas fa-list"></i>
                            <input type="text" id="listingFacilities" placeholder="Contoh: AC, WiFi, Kamar Mandi Dalam, Parkir">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Gambar Kos *</label>
                        <div class="upload-area" id="uploadArea">
                            <input type="file" id="listingImages" accept="image/*" multiple onchange="handleImageUpload(this)" style="display:none;">
                            <div class="upload-placeholder" onclick="document.getElementById('listingImages').click()">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p><strong>Klik untuk upload</strong> atau drag & drop</p>
                                <span>JPG, PNG, WEBP, GIF (Maks 5MB per file, max 5 file)</span>
                            </div>
                        </div>
                        <div class="image-preview" id="imagePreview"></div>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        <span>Daftarkan Kos</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </form>
            </div>
        </div>
    `;

    // Store locations globally for the village update function
    window._locationsData = groupedByDistrict;

    // Append modal to body
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modalContainer';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    document.body.style.overflow = 'hidden';
}

function updateVillageOptions() {
    const district = document.getElementById('listingDistrict').value;
    const villageSelect = document.getElementById('listingVillage');

    if (!district || !window._locationsData[district]) {
        villageSelect.innerHTML = '<option value="">Pilih Kelurahan/Desa</option>';
        villageSelect.disabled = true;
        return;
    }

    const villages = window._locationsData[district];
    villageSelect.innerHTML = '<option value="">Pilih Kelurahan/Desa</option>' +
        villages.map(v => `<option value="${v.id}">${v.village}</option>`).join('');
    villageSelect.disabled = false;
}

function closeAddListingModal() {
    const modal = document.getElementById('modalContainer');
    if (modal) modal.remove();
    document.body.style.overflow = '';
}

async function handleAddListing(e) {
    e.preventDefault();

    // Get form values
    const title = document.getElementById('listingTitle').value.trim();
    const description = document.getElementById('listingDescription').value.trim();
    const locationId = document.getElementById('listingVillage').value;
    const address = document.getElementById('listingAddress').value.trim();
    const priceInput = document.getElementById('listingPrice').value;
    const depositInput = document.getElementById('listingDeposit').value;
    const roomSize = document.getElementById('listingRoomSize').value.trim();
    const facilitiesInput = document.getElementById('listingFacilities').value;

    // Validation
    if (!title) {
        showToast('error', 'Gagal', 'Judul kos wajib diisi');
        return;
    }
    if (!locationId) {
        showToast('error', 'Gagal', 'Pilih kelurahan/desa terlebih dahulu');
        return;
    }
    if (!address) {
        showToast('error', 'Gagal', 'Alamat wajib diisi');
        return;
    }
    if (!priceInput) {
        showToast('error', 'Gagal', 'Harga wajib diisi');
        return;
    }

    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
        showToast('error', 'Gagal', 'Harga tidak valid. Masukkan angka yang benar.');
        return;
    }
    if (price > 9999999999999) {
        showToast('error', 'Gagal', 'Harga terlalu besar. Maksimal 9.999.999.999.999.');
        return;
    }

    const deposit = parseFloat(depositInput) || 0;
    if (deposit < 0) {
        showToast('error', 'Gagal', 'Deposit tidak boleh negatif');
        return;
    }

    const facilities = facilitiesInput
        .split(',')
        .map(f => f.trim())
        .filter(f => f);

    // Get uploaded image URLs from the hidden input
    const imageUrlsInput = document.getElementById('uploadedImageUrls');
    let imageUrls = [];
    try {
        imageUrls = imageUrlsInput ? JSON.parse(imageUrlsInput.value || '[]') : [];
    } catch (e) {
        imageUrls = [];
    }

    const listingData = {
        title: title,
        description: description,
        location_id: locationId,
        address: address,
        price_monthly: price,
        deposit: deposit,
        room_size: roomSize,
        facilities: facilities,
        images: imageUrls,
    };

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Menyimpan...</span><div class="spinner" style="width:16px;height:16px;border-width:2px;"></div>';
    submitBtn.disabled = true;

    try {
        const result = await api('/listings', {
            method: 'POST',
            body: listingData,
        });

        if (result.success) {
            closeAddListingModal();
            showToast('success', 'Berhasil!', 'Kos berhasil didaftarkan. Menunggu approval admin.');
            loadOwnerDashboard();
        } else {
            showToast('error', 'Gagal', result.message);
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showToast('error', 'Gagal', 'Terjadi kesalahan. Silakan coba lagi.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleImageUpload(input) {
    const files = input.files;
    if (!files || files.length === 0) return;

    // Validate file count
    if (files.length > 5) {
        showToast('error', 'Gagal', 'Maksimal 5 gambar');
        input.value = '';
        return;
    }

    // Validate file size and type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    for (let file of files) {
        if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'Gagal', `File ${file.name} terlalu besar (maks 5MB)`);
            input.value = '';
            return;
        }
        if (!allowedTypes.includes(file.type)) {
            showToast('error', 'Gagal', `Format ${file.name} tidak didukung`);
            input.value = '';
            return;
        }
    }

    // Show preview
    const previewContainer = document.getElementById('imagePreview');
    previewContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Mengupload...</p></div>';

    // Create FormData
    const formData = new FormData();
    for (let file of files) {
        formData.append('images', file);
    }

    try {
        const token = state.token;
        const response = await fetch(`${API_BASE}/listings/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        const result = await response.json();

        if (result.success) {
            // Store URLs in hidden input
            let hiddenInput = document.getElementById('uploadedImageUrls');
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'uploadedImageUrls';
                document.getElementById('addListingForm').appendChild(hiddenInput);
            }
            hiddenInput.value = JSON.stringify(result.data.images);

            // Show preview thumbnails
            previewContainer.innerHTML = result.data.images.map(url => `
                <div class="preview-item">
                    <img src="${url}" alt="Preview">
                    <button type="button" class="remove-image" onclick="removeImage('${url}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            showToast('success', 'Berhasil!', result.message);
        } else {
            previewContainer.innerHTML = '';
            showToast('error', 'Gagal', result.message);
        }
    } catch (error) {
        previewContainer.innerHTML = '';
        showToast('error', 'Gagal', 'Gagal mengupload gambar');
    }
}

function removeImage(url) {
    const hiddenInput = document.getElementById('uploadedImageUrls');
    if (hiddenInput) {
        let urls = JSON.parse(hiddenInput.value || '[]');
        urls = urls.filter(u => u !== url);
        hiddenInput.value = JSON.stringify(urls);

        // Update preview
        const previewContainer = document.getElementById('imagePreview');
        if (urls.length === 0) {
            previewContainer.innerHTML = '';
        } else {
            previewContainer.innerHTML = urls.map(u => `
                <div class="preview-item">
                    <img src="${u}" alt="Preview">
                    <button type="button" class="remove-image" onclick="removeImage('${u}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }
}

// =====================================================
// OWNER DASHBOARD PAGES
// =====================================================
async function loadMyListings() {
    // Show loading
    showDashboard('<div class="loading-container"><div class="loading-spinner"></div><p>Memuat data...</p></div>');

    const result = await api('/listings/my-listings');
    const listings = result.data || [];

    showDashboard(`
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="container">
                    <h1><i class="fas fa-list"></i> Kos Saya</h1>
                </div>
            </div>
            <div class="dashboard-content">
                <div class="container">
                    <div class="dashboard-grid">
                        <aside class="sidebar">
                            <nav class="sidebar-menu">
                                <a href="#" class="sidebar-link" onclick="loadOwnerDashboard(); return false;">
                                    <i class="fas fa-home"></i> Dashboard
                                </a>
                                <a href="#" class="sidebar-link" onclick="showAddListingModal(); return false;">
                                    <i class="fas fa-plus"></i> Tambah Kos
                                </a>
                                <a href="#" class="sidebar-link active" onclick="loadMyListings(); return false;">
                                    <i class="fas fa-list"></i> Kos Saya
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadSubscription(); return false;">
                                    <i class="fas fa-credit-card"></i> Langganan
                                </a>
                                <a href="#" class="sidebar-link" onclick="logout(); return false;">
                                    <i class="fas fa-sign-out-alt"></i> Keluar
                                </a>
                            </nav>
                        </aside>
                        <div class="main-panel">
                            <div class="panel-header">
                                <h2 class="panel-title">Semua Kos Saya</h2>
                                <button class="btn btn-primary" onclick="showAddListingModal()">
                                    <i class="fas fa-plus"></i> Tambah Kos
                                </button>
                            </div>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Judul</th>
                                            <th>Harga</th>
                                            <th>Lokasi</th>
                                            <th>Status</th>
                                            <th>Aktif</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${listings.length === 0 ? '<tr><td colspan="6" style="text-align:center">Belum ada kos terdaftar</td></tr>' : ''}
                                        ${listings.map(l => `
                                            <tr>
                                                <td>${escapeHtml(l.title)}</td>
                                                <td>Rp ${formatNumber(l.price_monthly)}</td>
                                                <td>${escapeHtml(l.village || '-')}, ${escapeHtml(l.district || '-')}</td>
                                                <td><span class="status-badge ${escapeHtml(l.status)}">${escapeHtml(l.status)}</span></td>
                                                <td><span class="status-badge ${l.is_active ? 'active' : 'inactive'}">${l.is_active ? 'Ya' : 'Tidak'}</span></td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="action-btn view" title="Lihat"><i class="fas fa-eye"></i></button>
                                                        <button class="action-btn edit" title="Edit"><i class="fas fa-edit"></i></button>
                                                        <button class="action-btn delete" title="Hapus" onclick="deleteListing('${escapeHtml(l.id)}')"><i class="fas fa-trash"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

async function loadSubscription() {
    // Show loading
    showDashboard('<div class="loading-container"><div class="loading-spinner"></div><p>Memuat data...</p></div>');

    const [subResult, payResult] = await Promise.all([
        api('/subscriptions/my-subscription'),
        api('/subscriptions/payments'),
    ]);

    const subscription = subResult.data || {};
    const payments = payResult.data || [];

    showDashboard(`
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="container">
                    <h1><i class="fas fa-credit-card"></i> Langganan</h1>
                </div>
            </div>
            <div class="dashboard-content">
                <div class="container">
                    <div class="dashboard-grid">
                        <aside class="sidebar">
                            <nav class="sidebar-menu">
                                <a href="#" class="sidebar-link" onclick="loadOwnerDashboard(); return false;">
                                    <i class="fas fa-home"></i> Dashboard
                                </a>
                                <a href="#" class="sidebar-link" onclick="showAddListingModal(); return false;">
                                    <i class="fas fa-plus"></i> Tambah Kos
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadMyListings(); return false;">
                                    <i class="fas fa-list"></i> Kos Saya
                                </a>
                                <a href="#" class="sidebar-link active" onclick="loadSubscription(); return false;">
                                    <i class="fas fa-credit-card"></i> Langganan
                                </a>
                                <a href="#" class="sidebar-link" onclick="logout(); return false;">
                                    <i class="fas fa-sign-out-alt"></i> Keluar
                                </a>
                            </nav>
                        </aside>
                        <div class="main-panel">
                            <div class="subscription-card">
                                <div class="subscription-status">
                                    <i class="fas fa-circle"></i>
                                    ${subscription.status === 'active' ? 'Aktif' : subscription.status === 'trial' ? 'Trial' : 'Expired'}
                                </div>
                                <div class="subscription-info">
                                    <div>
                                        <div class="subscription-days">${subscription.days_remaining || 0}</div>
                                        <div class="subscription-label">Hari Tersisa</div>
                                    </div>
                                    ${subscription.status !== 'active' ? `
                                        <button class="btn btn-white" onclick="showPaymentModal()">
                                            <i class="fas fa-credit-card"></i> Perpanjang
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="panel-header">
                                <h2 class="panel-title">Perpanjang Langganan</h2>
                            </div>
                            <div class="payment-info" style="background: var(--gray-50); padding: 24px; border-radius: var(--radius-lg); margin-bottom: 24px;">
                                <h3 style="margin-bottom: 16px;">Informasi Pembayaran</h3>
                                <p style="margin-bottom: 12px; color: var(--gray-600);">Untuk memperpanjang langganan, silakan transfer ke:</p>
                                <div style="background: white; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                                    <p><strong>Bank BNI</strong></p>
                                    <p>No. Rekening: <strong>1886420281</strong></p>
                                    <p>a.n. <strong>Oktavianus Avilaryl Nggai Dae</strong></p>
                                </div>
                                <p style="margin-bottom: 12px; color: var(--gray-600);">Harga langganan: <strong>Rp 50.000 / bulan</strong></p>
                            </div>

                            <form id="paymentForm" onsubmit="handlePaymentSubmit(event)">
                                <div class="form-group">
                                    <label for="paymentAmount">Jumlah Pembayaran (Rp)</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-money-bill"></i>
                                        <input type="number" id="paymentAmount" value="50000" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="paymentMethod">Metode Pembayaran</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-credit-card"></i>
                                        <select id="paymentMethod" required>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="e_wallet">E-Wallet</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="paymentNotes">Catatan</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-sticky-note"></i>
                                        <input type="text" id="paymentNotes" placeholder="Contoh: Pembayaran 1 bulan">
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary btn-block">
                                    <span>Kirim Bukti Pembayaran</span>
                                    <i class="fas fa-arrow-right"></i>
                                </button>
                            </form>

                            <div class="panel-header" style="margin-top: 32px;">
                                <h2 class="panel-title">Riwayat Pembayaran</h2>
                            </div>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Jumlah</th>
                                            <th>Metode</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${payments.length === 0 ? '<tr><td colspan="4" style="text-align:center">Belum ada riwayat pembayaran</td></tr>' : ''}
                                        ${payments.map(p => `
                                            <tr>
                                                <td>${new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                                                <td>Rp ${formatNumber(p.amount)}</td>
                                                <td>${p.payment_method}</td>
                                                <td><span class="status-badge ${p.status === 'verified' ? 'active' : p.status === 'pending' ? 'pending' : 'rejected'}">${p.status}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

async function handlePaymentSubmit(e) {
    e.preventDefault();

    const paymentData = {
        amount: parseFloat(document.getElementById('paymentAmount').value),
        payment_method: document.getElementById('paymentMethod').value,
        notes: document.getElementById('paymentNotes').value,
    };

    const result = await api('/subscriptions/payment', {
        method: 'POST',
        body: paymentData,
    });

    if (result.success) {
        showToast('success', 'Berhasil!', 'Pembayaran berhasil dikirim. Menunggu verifikasi admin.');
        loadSubscription();
    } else {
        showToast('error', 'Gagal', result.message);
    }
}

// =====================================================
// ADMIN DASHBOARD PAGES
// =====================================================
async function loadPendingListings() {
    // Show loading
    showDashboard('<div class="loading-container"><div class="loading-spinner"></div><p>Memuat data...</p></div>');

    const result = await api('/listings/admin/pending');
    if (!result.success) {
        showDashboard(`<div class="error-container"><i class="fas fa-exclamation-circle"></i><h3>Gagal memuat data</h3><p>${result.message}</p><button class="btn btn-primary" onclick="loadPendingListings(); return false;">Coba Lagi</button></div>`);
        return;
    }
    const pendingListings = result.data || [];

    showDashboard(`
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="container">
                    <h1><i class="fas fa-list"></i> Pending Listings</h1>
                </div>
            </div>
            <div class="dashboard-content">
                <div class="container">
                    <div class="dashboard-grid">
                        <aside class="sidebar">
                            <nav class="sidebar-menu">
                                <a href="#" class="sidebar-link" onclick="loadAdminDashboard(); return false;">
                                    <i class="fas fa-home"></i> Dashboard
                                </a>
                                <a href="#" class="sidebar-link active" onclick="loadPendingListings(); return false;">
                                    <i class="fas fa-list"></i> Pending Listings
                                    ${pendingListings.length > 0 ? `<span class="badge">${pendingListings.length}</span>` : ''}
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadPendingPayments(); return false;">
                                    <i class="fas fa-money-bill"></i> Verifikasi Bayar
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadAllSubscriptions(); return false;">
                                    <i class="fas fa-users"></i> Semua Langganan
                                </a>
                                <a href="#" class="sidebar-link" onclick="logout(); return false;">
                                    <i class="fas fa-sign-out-alt"></i> Keluar
                                </a>
                            </nav>
                        </aside>
                        <div class="main-panel">
                            <div class="panel-header">
                                <h2 class="panel-title">Listing Menunggu Approval</h2>
                            </div>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Judul</th>
                                            <th>Owner</th>
                                            <th>Harga</th>
                                            <th>Lokasi</th>
                                            <th>Tanggal</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pendingListings.length === 0 ? '<tr><td colspan="6" style="text-align:center">Tidak ada pending listings</td></tr>' : ''}
                                        ${pendingListings.map(l => `
                                            <tr>
                                                <td>${escapeHtml(l.title)}</td>
                                                <td>${escapeHtml(l.owner_name)}</td>
                                                <td>Rp ${formatNumber(l.price_monthly)}</td>
                                                <td>${escapeHtml(l.village || '-')}, ${escapeHtml(l.district || '-')}</td>
                                                <td>${new Date(l.created_at).toLocaleDateString('id-ID')}</td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="action-btn view" title="Approve" onclick="approveListing('${escapeHtml(l.id)}')"><i class="fas fa-check"></i></button>
                                                        <button class="action-btn delete" title="Reject" onclick="rejectListing('${escapeHtml(l.id)}')"><i class="fas fa-times"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

async function loadPendingPayments() {
    // Show loading
    showDashboard('<div class="loading-container"><div class="loading-spinner"></div><p>Memuat data...</p></div>');

    const result = await api('/subscriptions/admin/pending-payments');
    if (!result.success) {
        showDashboard(`<div class="error-container"><i class="fas fa-exclamation-circle"></i><h3>Gagal memuat data</h3><p>${result.message}</p><button class="btn btn-primary" onclick="loadPendingPayments(); return false;">Coba Lagi</button></div>`);
        return;
    }
    const pendingPayments = result.data || [];

    showDashboard(`
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="container">
                    <h1><i class="fas fa-money-bill"></i> Verifikasi Pembayaran</h1>
                </div>
            </div>
            <div class="dashboard-content">
                <div class="container">
                    <div class="dashboard-grid">
                        <aside class="sidebar">
                            <nav class="sidebar-menu">
                                <a href="#" class="sidebar-link" onclick="loadAdminDashboard(); return false;">
                                    <i class="fas fa-home"></i> Dashboard
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadPendingListings(); return false;">
                                    <i class="fas fa-list"></i> Pending Listings
                                </a>
                                <a href="#" class="sidebar-link active" onclick="loadPendingPayments(); return false;">
                                    <i class="fas fa-money-bill"></i> Verifikasi Bayar
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadAllSubscriptions(); return false;">
                                    <i class="fas fa-users"></i> Semua Langganan
                                </a>
                                <a href="#" class="sidebar-link" onclick="logout(); return false;">
                                    <i class="fas fa-sign-out-alt"></i> Keluar
                                </a>
                            </nav>
                        </aside>
                        <div class="main-panel">
                            <div class="panel-header">
                                <h2 class="panel-title">Pembayaran Menunggu Verifikasi</h2>
                            </div>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Jumlah</th>
                                            <th>Metode</th>
                                            <th>Tanggal</th>
                                            <th>Catatan</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pendingPayments.length === 0 ? '<tr><td colspan="6" style="text-align:center">Tidak ada pembayaran pending</td></tr>' : ''}
                                        ${pendingPayments.map(p => `
                                            <tr>
                                                <td>${escapeHtml(p.user_name)}<br><small>${escapeHtml(p.user_email)}</small></td>
                                                <td>Rp ${formatNumber(p.amount)}</td>
                                                <td>${escapeHtml(p.payment_method)}</td>
                                                <td>${new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                                                <td>${escapeHtml(p.notes || '-')}</td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="action-btn view" title="Verifikasi" onclick="verifyPayment('${escapeHtml(p.id)}')"><i class="fas fa-check"></i></button>
                                                        <button class="action-btn delete" title="Tolak" onclick="rejectPayment('${escapeHtml(p.id)}')"><i class="fas fa-times"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

async function verifyPayment(id) {
    const duration = prompt('Durasi langganan (bulan):', '1');
    if (!duration) return;

    const result = await api(`/subscriptions/admin/payments/${id}/verify`, {
        method: 'PATCH',
        body: { status: 'verified', duration_months: parseInt(duration) },
    });

    if (result.success) {
        showToast('success', 'Berhasil!', 'Pembayaran berhasil diverifikasi');
        loadPendingPayments();
    } else {
        showToast('error', 'Gagal', result.message);
    }
}

async function rejectPayment(id) {
    const result = await api(`/subscriptions/admin/payments/${id}/verify`, {
        method: 'PATCH',
        body: { status: 'rejected' },
    });

    if (result.success) {
        showToast('success', 'Berhasil!', 'Pembayaran ditolak');
        loadPendingPayments();
    } else {
        showToast('error', 'Gagal', result.message);
    }
}

async function loadAllSubscriptions() {
    // Show loading
    showDashboard('<div class="loading-container"><div class="loading-spinner"></div><p>Memuat data...</p></div>');

    const result = await api('/subscriptions/admin/overview');
    if (!result.success) {
        showDashboard(`<div class="error-container"><i class="fas fa-exclamation-circle"></i><h3>Gagal memuat data</h3><p>${result.message}</p><button class="btn btn-primary" onclick="loadAllSubscriptions(); return false;">Coba Lagi</button></div>`);
        return;
    }
    const overview = result.data || [];

    showDashboard(`
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="container">
                    <h1><i class="fas fa-users"></i> Semua Langganan</h1>
                </div>
            </div>
            <div class="dashboard-content">
                <div class="container">
                    <div class="dashboard-grid">
                        <aside class="sidebar">
                            <nav class="sidebar-menu">
                                <a href="#" class="sidebar-link" onclick="loadAdminDashboard(); return false;">
                                    <i class="fas fa-home"></i> Dashboard
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadPendingListings(); return false;">
                                    <i class="fas fa-list"></i> Pending Listings
                                </a>
                                <a href="#" class="sidebar-link" onclick="loadPendingPayments(); return false;">
                                    <i class="fas fa-money-bill"></i> Verifikasi Bayar
                                </a>
                                <a href="#" class="sidebar-link active" onclick="loadAllSubscriptions(); return false;">
                                    <i class="fas fa-users"></i> Semua Langganan
                                </a>
                                <a href="#" class="sidebar-link" onclick="logout(); return false;">
                                    <i class="fas fa-sign-out-alt"></i> Keluar
                                </a>
                            </nav>
                        </aside>
                        <div class="main-panel">
                            <div class="panel-header">
                                <h2 class="panel-title">Overview Semua Owner</h2>
                            </div>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Nama</th>
                                            <th>Email</th>
                                            <th>Status</th>
                                            <th>Sisa Hari</th>
                                            <th>Total Kos</th>
                                            <th>Kos Aktif</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${overview.length === 0 ? '<tr><td colspan="7" style="text-align:center">Belum ada data</td></tr>' : ''}
                                        ${overview.map(o => `
                                            <tr>
                                                <td>${escapeHtml(o.name)}</td>
                                                <td>${escapeHtml(o.email)}</td>
                                                <td><span class="status-badge ${o.subscription_status === 'active' ? 'active' : o.subscription_status === 'trial' ? 'pending' : 'expired'}">${escapeHtml(o.subscription_status)}</span></td>
                                                <td>${o.days_remaining} hari</td>
                                                <td>${o.total_listings}</td>
                                                <td>${o.active_listings}</td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="action-btn delete" onclick="adminDeleteUser('${o.user_id}', '${escapeHtml(o.name)}')" title="Hapus Owner">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

// =====================================================
// DRAG & DROP UPLOAD
// =====================================================
function initDragDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        });
    });

    uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const input = document.getElementById('listingImages');
            input.files = files;
            handleImageUpload(input);
        }
    });
}

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 KosEnde loaded');
    initNavigation();
    loadListings();

    // Check if user is already logged in
    if (state.token) {
        api('/auth/me').then(result => {
            if (result.success) {
                state.user = result.data.user;
                updateUIForLoggedInUser();
            } else {
                localStorage.removeItem('token');
                state.token = null;
            }
        });
    }

    // Search on enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchListings();
        });
    }

    // Make navigation functions globally available
    window.goToHome = goToHome;
    window.goToListings = goToListings;
    window.goToAbout = goToAbout;
    window.showPage = showPage;
    window.showModal = showModal;
    window.closeModal = closeModal;
    window.switchModal = switchModal;
    window.handleLogin = handleLogin;
    window.handleRegister = handleRegister;
    window.logout = logout;
    window.showAddListingModal = showAddListingModal;
    window.closeAddListingModal = closeAddListingModal;
    window.handleAddListing = handleAddListing;
    window.handleImageUpload = handleImageUpload;
    window.removeImage = removeImage;
    window.updateVillageOptions = updateVillageOptions;
    window.deleteListing = deleteListing;
    window.approveListing = approveListing;
    window.rejectListing = rejectListing;
    window.loadAdminDashboard = loadAdminDashboard;
    window.loadOwnerDashboard = loadOwnerDashboard;
    window.loadPendingListings = loadPendingListings;
    window.loadPendingPayments = loadPendingPayments;
    window.loadAllSubscriptions = loadAllSubscriptions;
    window.loadMyListings = loadMyListings;
    window.loadSubscription = loadSubscription;
    window.goToDashboard = goToDashboard;
    window.searchListings = searchListings;
    window.filterListings = filterListings;
    window.adminDeleteUser = adminDeleteUser;
});

// Re-init drag drop when modal opens
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea && !uploadArea.dataset.initialized) {
                uploadArea.dataset.initialized = 'true';
                initDragDrop();
            }
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });
