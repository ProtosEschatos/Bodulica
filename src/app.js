
        // Product data
        const products = [
            {id:'facol',cat:'moda',name:'Babin Facol — Svilena Marama',desc:'100% Svila · 60×60 cm',price:60,badge:'★ Premium',badgeClass:'bg-award'},
            {id:'torba',cat:'moda',name:'Babin Facol — Platnena Torba',desc:'Platno · Facola uzorak',price:15,badge:'✦ Handmade',badgeClass:'bg-eco'},
            {id:'aceto-maraska',cat:'delicije',name:'Aceto od Maraske',desc:'Matulić OPG · Pašman',price:15,badge:'Ručno',badgeClass:'bg-eco'},
            {id:'aceto-smokva',cat:'delicije',name:'Pašman Libre',desc:'Matulić OPG · Aceto od smokve',price:15,badge:'★ Superior Taste',badgeClass:'bg-award'},
            {id:'morska-sol',cat:'delicije',name:'Gourmet Morska Sol',desc:'Matulić OPG · Pašman',price:10,badge:'✦ Lokalno',badgeClass:'bg-eco'},
            {id:'pasmanero',cat:'delicije',name:'Pašmanero Hot Chili',desc:'Matulić OPG · Ljuti umak',price:12,badge:'🌶 Ljuto',badgeClass:'bg-hot'},
            {id:'immortelle',cat:'kozmetika',name:'Immortelle',desc:'Matulić OPG · Krema od smilja',price:45,badge:'🌿 Prirodno',badgeClass:'bg-eco'},
            {id:'lavanda',cat:'kozmetika',name:'Lavanda',desc:'Matulić OPG · Ulje lavande',price:25,badge:'✦ Aromaterapija',badgeClass:'bg-eco'},
            {id:'maslinovo-ulje',cat:'delicije',name:'Maslinovo Ulje',desc:'Matulić OPG · Extra virgin',price:20,badge:'🫒 Premium',badgeClass:'bg-award'},
            {id:'fig-marmelada',cat:'delicije',name:'Fig Marmelada',desc:'Matulić OPG · Domaća',price:12,badge:'🍃 Prirodno',badgeClass:'bg-eco'}
        ];

        let cart = [];
        let currentFilter = 'all';

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            renderProducts();
            setupFilters();
            setupScrollProgress();
            loadCart();
            setupIntersectionObserver();
        });

        // Render products
        function renderProducts() {
            const pg = document.getElementById('pg');
            const filtered = currentFilter === 'all' ? products : products.filter(p => p.cat === currentFilter);

            pg.innerHTML = filtered.map(product => `
                <div class="pc rv" data-cat="${product.cat}" onclick="openModal('${product.id}')">
                    <div class="pw">
                        <div class="pi" style="background:linear-gradient(160deg,var(--b7),var(--b9));display:flex;align-items:center;justify-content:center;color:var(--t2);font-size:.8rem">
                            ${product.name.split(' — ')[0]}
                        </div>
                    </div>
                    <button class="qb" onclick="event.stopPropagation();buyNow('${product.id}')" title="Dodaj">+</button>
                    <div class="pb">
                        <div class="pt">${product.cat.toUpperCase()}</div>
                        <div class="pn">${product.name}</div>
                        <div class="pr">${product.desc}</div>
                        <div class="pf">
                            <div class="pp">${product.price}<span class="eu">EUR</span></div>
                            <span class="bd ${product.badgeClass}">${product.badge}</span>
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

            document.getElementById('modalCat').textContent = product.cat.toUpperCase();
            document.getElementById('modalName').textContent = product.name;
            document.getElementById('modalDesc').textContent = product.desc;
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
                        <div class="cip">${item.price} EUR x ${item.qty}</div>
                    </div>
                    <button class="cir" onclick="removeFromCart('${item.id}')">Ukloni</button>
                </div>
            `).join('');

            const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const count = cart.reduce((sum, item) => sum + item.qty, 0);

            cartCount.textContent = count;
            cartTotal.innerHTML = `${total}<span class="eu">EUR</span>`;

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
    