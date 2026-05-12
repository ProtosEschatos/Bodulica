
        // API Configuration
const API_BASE = 'https://mbputwgppweoeujiszgv.supabase.co/functions/v1/bodulica-api';

let products = [];
let cart = [];
let currentFilter = 'all';

// Load products from API
async function loadProducts() {
    const res = await fetch(API_BASE + '/products');
    products = await res.json();
    products = products.filter(p => p.is_active !== false);
    renderProducts();
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    setupFilters();
    setupScrollProgress();
    loadCart();
    setupIntersectionObserver();
});

// Render products
function renderProducts() {
    const pg = document.getElementById('pg');
    const filtered = currentFilter === 'all' ? products : products.filter(p => p.category?.toLowerCase() === currentFilter.toLowerCase());

    pg.innerHTML = filtered.map(product => `
        <div class="pc rv" data-cat="${product.category}" onclick="openModal('${product.id}')">
            <div class="pw">
                <img src="${product.image_url || ''}" alt="${product.name}" 
                     loading="lazy" onerror="this.style.display='none'">
                <div class="pi" style="background:linear-gradient(160deg,var(--b7),var(--b9));display:flex;align-items:center;justify-content:center;color:var(--t2);font-size:.8rem">
                    ${product.name.split(' — ')[0]}
                </div>
            </div>
            <button class="qb" onclick="event.stopPropagation();buyNow('${product.id}')" title="Dodaj">+</button>
            <div class="pb">
                <div class="pt">${product.category.toUpperCase()}</div>
                <div class="pn">${product.name}</div>
                <div class="pr">${product.description}</div>
                <div class="pf">
                    <div class="pp">${product.price}<span class="eu">EUR</span></div>
                    <span class="bd bg-eco">✦ Prirodno</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Setup filters
function setupFilters() {
    document.querySelectorAll('.fb').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.fb').forEach(b => b.classList.remove('ac'));
            e.target.classList.add('ac');
            currentFilter = e.target.dataset.c;
            renderProducts();
            setupIntersectionObserver();
        });
    });
}

// Modal functions
function openModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('modalCat').textContent = product.category.toUpperCase();
    document.getElementById('modalName').textContent = product.name;
    document.getElementById('modalDesc').textContent = product.description;
    document.getElementById('modalDetails').textContent = 'Premium kvalitet, autentično porijeklo';
    document.getElementById('modalPrice').innerHTML = `${product.price}<span class="eu">EUR</span>`;

    document.getElementById('modal').classList.add('op');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.remove('op');
    document.body.style.overflow = '';
}

// Cart functions
function toggleCart() {
    document.getElementById('cart').classList.toggle('op');
    document.getElementById('cartOverlay').classList.toggle('op');
}

function buyNow(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({...product, qty: 1});
    }

    updateCart();
    toggleCart();
}

function addToCart() {
    const modalName = document.getElementById('modalName').textContent;
    const product = products.find(p => p.name === modalName);
    if (product) buyNow(product.id);
    closeModal();
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cC');
    const cartTotal = document.getElementById('cartTotal');

    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="ce">Košarica je prazna</div>';
        cartCount.textContent = '0';
        cartTotal.innerHTML = '0<span class="eu">EUR</span>';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cii">
            <div style="width:42px;height:42px;background:var(--b7);display:flex;align-items:center;justify-content:center;color:var(--t2);font-size:.6rem;border-radius:3px">
                ${item.name.split(' — ')[0]}
            </div>
            <div style="flex:1">
                <div class="cin">${item.name}</div>
                <div class="cip">${parseFloat(item.price).toFixed(2)} EUR x ${item.qty}</div>
            </div>
            <button class="cir" onclick="removeFromCart('${item.id}')">Ukloni</button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
    const count = cart.reduce((sum, item) => sum + item.qty, 0);

    cartCount.textContent = count;
    cartTotal.innerHTML = `${total.toFixed(2)}<span class="eu">EUR</span>`;

    saveCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
}

function saveCart() {
    localStorage.setItem('bodulica-cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('bodulica-cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCart();
    }
}

function checkout() {
    if (cart.length === 0) return;
    alert('Hvala na narudžbi! Kontaktirat ćemo vas uskoro.');
    cart = [];
    updateCart();
    toggleCart();
}

// Scroll progress
function setupScrollProgress() {
    const btt = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            btt.classList.add('vs');
        } else {
            btt.classList.remove('vs');
        }
    });
}

// Intersection Observer for animations
function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('vs');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    document.querySelectorAll('.pc').forEach(el => {
        observer.observe(el);
    });
}

// Close modal on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        if (document.getElementById('cart').classList.contains('op')) {
            toggleCart();
        }
    }
});

// Cart toggle button
document.getElementById('cartToggle').addEventListener('click', toggleCart);
    