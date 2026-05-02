/**
 * shop-api.js - Bodulica Shop API Integration
 * Connects index.html to Supabase backend
 * Replaces hardcoded products with live data and enables real Stripe checkout
 */

(function() {
  'use strict';

  const API_URL = 'https://mbputwgppweoeujiszgv.supabase.co/functions/v1/bodulica-api';

  // Wait for DOM to be ready
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Fetch products from Supabase and override the hardcoded array
  async function fetchAndInjectProducts() {
    try {
      const res = await fetch(API_URL + '/products');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const apiProducts = await res.json();

      if (!apiProducts || apiProducts.length === 0) return;

      // Map Supabase fields to the format used by index.html
      window.products = apiProducts.map(p => ({
        id: p.id,
        cat: p.category,
        name: p.name,
        desc: p.description || '',
        price: Number(p.price),
        badge: p.badge || '',
        badgeClass: getBadgeClass(p.badge),
        image_url: p.image_url || '',
        slug: p.slug,
        stock_quantity: p.stock_quantity,
        is_unique: p.is_unique,
        stripe_price_id: p.stripe_price_id,
        // Keep original fields too
        materials: p.materials,
        dimensions: p.dimensions,
      }));

      // Re-render with real data
      if (typeof window.renderProducts === 'function') {
        window.renderProducts();
      }
      if (typeof window.setupIntersectionObserver === 'function') {
        window.setupIntersectionObserver();
      }

      // Update filter counts
      updateFilterCounts();

      // Check for success/cancel in URL params
      checkOrderStatus();

    } catch (err) {
      console.error('[Bodulica] Failed to load products from API:', err);
    }
  }

  function getBadgeClass(badge) {
    if (!badge) return '';
    if (badge.includes('Premium') || badge.includes('Superior')) return 'bg-award';
    if (badge.includes('Novo') || badge.includes('New')) return 'bg-new';
    if (badge.includes('Ljuto') || badge.includes('Hot')) return 'bg-hot';
    if (badge.includes('Prirodno') || badge.includes('Eco') || badge.includes('Lokalno') || badge.includes('Handmade') || badge.includes('Ručno')) return 'bg-eco';
    return 'bg-new';
  }

  function updateFilterCounts() {
    if (!window.products) return;
    const counts = { all: window.products.length };
    window.products.forEach(p => {
      counts[p.cat] = (counts[p.cat] || 0) + 1;
    });
    document.querySelectorAll('.fb').forEach(btn => {
      const cat = btn.dataset.c;
      if (cat === undefined) return;
      const count = cat === 'all' ? counts.all : (counts[cat] || 0);
      if (count === 0) { btn.style.display = 'none'; return; }
      btn.style.display = '';
      const label = btn.textContent.replace(/\s*\(\d+\)$/, '').trim();
      btn.textContent = label + ' (' + count + ')';
    });
  }

  function checkOrderStatus() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      const orderNum = params.get('order') || '';
      showToast('Hvala na narudžbi!' + (orderNum ? ' Broj narudžbe: ' + orderNum : ''), 'success');
      // Clear cart after successful payment
      localStorage.removeItem('bodulica-cart');
      if (typeof window.cart !== 'undefined') window.cart = [];
      if (typeof window.updateCart === 'function') window.updateCart();
      // Remove params from URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('cancelled') === '1') {
      showToast('Narudžba je otkazana.', 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed', 'top:5rem', 'left:50%', 'transform:translateX(-50%)',
      'background:' + (type === 'success' ? '#16a34a' : '#dc2626'),
      'color:#fff', 'padding:1rem 2rem', 'border-radius:4px',
      'z-index:9999', 'font-size:.85rem', 'text-align:center',
      'box-shadow:0 4px 20px rgba(0,0,0,.3)', 'max-width:90vw'
    ].join(';');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  // Override the renderProducts function to support image_url from Supabase
  function patchRenderProducts() {
    const originalRender = window.renderProducts;
    window.renderProducts = function() {
      const pg = document.getElementById('pg');
      if (!pg || !window.products) { if (originalRender) originalRender(); return; }
      const filtered = window.currentFilter === 'all'
        ? window.products
        : window.products.filter(p => p.cat === window.currentFilter);
      if (filtered.length === 0) {
        pg.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--t2);font-size:.8rem">Nema proizvoda u ovoj kategoriji.</div>';
        return;
      }
      pg.innerHTML = filtered.map(product => {
        const imgContent = product.image_url
          ? '<img class="pi" src="' + product.image_url + '" alt="' + product.name + '" loading="lazy" onerror="this.style.display=\'none\'">'
          : '<div class="pi" style="background:linear-gradient(160deg,var(--b7),var(--b9));display:flex;align-items:center;justify-content:center;color:var(--t2);font-size:.8rem;text-align:center;padding:1rem">' + product.name.split(' — ')[0] + '</div>';
        const badgeHtml = product.badge
          ? '<span class="bd ' + product.badgeClass + '">' + product.badge + '</span>'
          : '';
        const stockWarn = product.stock_quantity === 0
          ? '<div style="color:var(--te);font-size:.5rem;margin-top:.2rem">Rasprodano</div>'
          : (product.stock_quantity <= 3
          ? '<div style="color:var(--go);font-size:.5rem;margin-top:.2rem">Samo još ' + product.stock_quantity + ' kom!</div>'
          : '');
        return '<div class="pc rv" data-cat="' + product.cat + '" onclick="openModal(\'' + product.id + '\')">' +
          '<div class="pw">' + imgContent + '</div>' +
          (product.stock_quantity > 0 ? '<button class="qb" onclick="event.stopPropagation();buyNow(\'' + product.id + '\')" title="Dodaj">+</button>' : '') +
          '<div class="pb">' +
          '<div class="pt">' + product.cat.toUpperCase() + '</div>' +
          '<div class="pn">' + product.name + '</div>' +
          '<div class="pr">' + product.desc + '</div>' +
          '<div class="pf"><div class="pp">' + product.price + '<span class="eu">EUR</span></div>' + badgeHtml + '</div>' +
          stockWarn +
          '</div></div>';
      }).join('');
    };
  }

  // Override the checkout function to use Stripe
  function patchCheckout() {
    window.checkout = async function() {
      const cart = window.cart || [];
      if (cart.length === 0) return;

      // Collect customer info
      const email = prompt('Unesite vašu email adresu:');
      if (!email || !email.includes('@')) {
        alert('Molimo unesite valjanu email adresu.');
        return;
      }
      const name = prompt('Ime i prezime:') || '';
      const address = prompt('Adresa dostave:') || '';
      const city = prompt('Grad:') || '';
      const postal = prompt('Poštanski broj:') || '';

      const ck = document.querySelector('.ck');
      if (ck) { ck.textContent = 'Procesiranje...'; ck.disabled = true; }

      try {
        const res = await fetch(API_URL + '/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map(i => ({ id: i.id, quantity: i.qty })),
            customer_email: email,
            shipping_details: {
              name: name,
              address: address,
              city: city,
              postal_code: postal,
              country: 'HR',
            }
          })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert('Greška: ' + (data.error || 'Nepoznata greška'));
          if (ck) { ck.textContent = 'Naruči'; ck.disabled = false; }
        }
      } catch (err) {
        alert('Greška pri narudžbi: ' + err.message);
        if (ck) { ck.textContent = 'Naruči'; ck.disabled = false; }
      }
    };
  }

  // Override openModal to show full product details
  function patchOpenModal() {
    window.openModal = function(productId) {
      const product = (window.products || []).find(p => p.id === productId);
      if (!product) return;
      const mc = document.getElementById('modalCat');
      const mn = document.getElementById('modalName');
      const mbd = document.querySelector('.mbd');
      const mds = document.querySelector('.mds');
      const mp = document.getElementById('modalPrice');
      const mimg = document.querySelector('.mim img');

      if (mc) mc.textContent = product.cat.toUpperCase();
      if (mn) mn.textContent = product.name;
      if (mbd) mbd.textContent = product.badge || '';
      if (mds) mds.textContent = product.desc + (product.materials ? ' · ' + product.materials : '') + (product.dimensions ? ' · ' + product.dimensions : '');
      if (mp) mp.innerHTML = product.price + '<span class="eu">EUR</span>';

      // Set modal image
      const mim = document.querySelector('.mim');
      if (mim) {
        if (product.image_url) {
          mim.innerHTML = '<img src="' + product.image_url + '" alt="' + product.name + '" style="max-width:90%;max-height:340px;object-fit:contain;filter:drop-shadow(0 12px 30px rgba(0,0,0,.35))">';
        } else {
          mim.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:200px;color:var(--t2);font-size:1.2rem">📷</div>';
        }
      }

      // Stock info
      const addBtn = document.querySelector('.bb');
      if (addBtn) {
        if (product.stock_quantity === 0) {
          addBtn.textContent = 'Rasprodano';
          addBtn.disabled = true;
          addBtn.style.opacity = '.5';
        } else {
          addBtn.textContent = 'Dodaj u košaricu';
          addBtn.disabled = false;
          addBtn.style.opacity = '';
        }
      }

      // Store current product id for addToCart
      document.getElementById('modal').dataset.productId = productId;
      document.getElementById('modal').classList.add('op');
      document.body.style.overflow = 'hidden';
    };
  }

  // Patch addToCart to use product id from modal dataset
  function patchAddToCart() {
    window.addToCart = function() {
      const modal = document.getElementById('modal');
      const productId = modal ? modal.dataset.productId : null;
      if (productId && typeof window.buyNow === 'function') {
        window.buyNow(productId);
      }
      if (typeof window.closeModal === 'function') window.closeModal();
    };
  }

  // Initialize
  ready(function() {
    // Patch functions before products load
    patchRenderProducts();
    patchCheckout();
    patchOpenModal();
    patchAddToCart();

    // Load real products from API
    fetchAndInjectProducts();
  });

})();
