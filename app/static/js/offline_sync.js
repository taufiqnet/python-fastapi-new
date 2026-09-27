/**
 * Offline-First PWA Local Client & Sync Engine
 * Retail & POS Scoped Offline Sync with Module Restrictions
 */

(function () {
  let db = null;
  let currentUserProfile = null;
  let isSyncing = false;

  // Initialize Dexie IndexedDB
  function initDB() {
    if (typeof Dexie !== 'undefined') {
      db = new Dexie('SaaSOfflineDB');
      db.version(1).stores({
        orders: 'id, client_uuid, order_number, client_updated_at, is_deleted',
        invoices: 'id, client_uuid, invoice_number, client_updated_at, is_deleted',
        products: 'id, name, sku, barcode, price, category_id, business_id',
        variants: 'id, product_id, sku, barcode, price',
        categories: 'id, name, business_id',
        tax_rules: 'id, name, tax_rate, business_id',
        cart: '++id, product_id, variant_id, name, sku, quantity, price, tax_rate',
        sync_queue: '++id, entity, action, client_uuid, createdAt'
      });
    } else {
      console.warn('Dexie.js library not loaded; IndexedDB fallback initialized.');
    }
  }

  // Helper to determine protected online-only module name
  function getProtectedModuleName(path) {
    if (!path) return null;
    const lowerPath = path.toLowerCase();

    // HR & Payroll
    if (
      lowerPath.startsWith('/employees') ||
      lowerPath.startsWith('/payroll') ||
      lowerPath.startsWith('/payroll-records') ||
      lowerPath.startsWith('/payroll-setup') ||
      lowerPath.startsWith('/payroll-periods') ||
      lowerPath.startsWith('/leave') ||
      lowerPath.startsWith('/attendance') ||
      lowerPath.startsWith('/compensation') ||
      lowerPath.startsWith('/salary-certificates') ||
      lowerPath.startsWith('/appointment-letters') ||
      lowerPath.startsWith('/offer-letters') ||
      lowerPath.startsWith('/experience-letters') ||
      lowerPath.startsWith('/departments') ||
      lowerPath.startsWith('/job-titles') ||
      lowerPath.startsWith('/organization')
    ) {
      return 'HR & Payroll';
    }

    // Recruitment
    if (
      lowerPath.startsWith('/recruitment') ||
      lowerPath.startsWith('/candidates') ||
      lowerPath.startsWith('/interviews')
    ) {
      return 'Recruitment';
    }

    // Payment Gateways
    if (
      lowerPath.startsWith('/payments') ||
      lowerPath.includes('/capture') ||
      lowerPath.includes('/refund')
    ) {
      return 'Payment Gateways';
    }

    return null;
  }

  // Display prominent offline blocked warning modal/banner
  function showOfflineBlockedNotice(moduleName) {
    const message = `⚠️ Offline Mode: ${moduleName} requires an active internet connection to ensure data security and real-time processing. Billing, POS, and Orders remain fully operational.`;

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Offline Mode Restriction',
        html: `<div class="p-3 text-left text-sm font-medium text-amber-900 bg-amber-50 rounded-lg border border-amber-200">
                ${message}
              </div>`,
        confirmButtonText: 'Understood',
        confirmButtonColor: '#4f46e5'
      });
    } else {
      alert(message);
    }
  }

  // Intercept fetch API calls when offline for protected modules
  if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      const method = (init && init.method) ? init.method.toUpperCase() : 'GET';

      if (!navigator.onLine && urlStr) {
        let path = urlStr;
        try {
          path = new URL(urlStr, window.location.origin).pathname;
        } catch (e) {}

        const moduleName = getProtectedModuleName(path);
        if (moduleName) {
          showOfflineBlockedNotice(moduleName);
          return new Response(
            JSON.stringify({
              detail: `⚠️ Offline Mode: ${moduleName} requires an active internet connection to ensure data security and real-time processing. Billing, POS, and Orders remain fully operational.`
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline Blocked)',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }
      return originalFetch.apply(this, arguments);
    };
  }

  // Update Visual Connection & Sync Indicator UI
  async function updateSyncIndicatorUI() {
    const indicatorEl = document.getElementById('offline-sync-indicator');
    const badgeEl = document.getElementById('sync-status-badge');
    const textEl = document.getElementById('sync-status-text');

    if (!indicatorEl) return;

    if (!currentUserProfile || (!currentUserProfile.can_use_offline_mode && !currentUserProfile.is_superuser)) {
      indicatorEl.style.display = 'none';
      return;
    }

    indicatorEl.style.display = 'inline-flex';

    if (isSyncing) {
      if (badgeEl) badgeEl.className = 'w-2.5 h-2.5 rounded-full bg-indigo-500 animate-spin';
      if (textEl) textEl.textContent = 'Syncing changes...';
      return;
    }

    const isOnline = navigator.onLine;
    let queuedCount = 0;

    if (db && db.sync_queue) {
      try {
        queuedCount = await db.sync_queue.count();
      } catch (e) {
        console.error('Failed to count sync queue:', e);
      }
    }

    if (!isOnline) {
      if (badgeEl) badgeEl.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
      if (textEl) textEl.textContent = `Offline (${queuedCount} queued)`;
    } else if (queuedCount > 0) {
      if (badgeEl) badgeEl.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
      if (textEl) textEl.textContent = `Pending Sync (${queuedCount})`;
    } else {
      if (badgeEl) badgeEl.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
      if (textEl) textEl.textContent = 'Online & Synced';
    }
  }

  // Fetch Current User Profile to inspect can_use_offline_mode and cache reference data
  async function fetchUserProfile() {
    try {
      const res = await fetch('/api/v1/users/me');
      if (res.ok) {
        currentUserProfile = await res.json();
        updateSyncIndicatorUI();
        if (currentUserProfile.can_use_offline_mode || currentUserProfile.is_superuser) {
          if (navigator.onLine) {
            flushSyncQueue();
            cacheCatalogAndPricingForOffline();
          }
        }
      }
    } catch (e) {
      console.warn('Unable to fetch user profile for offline sync entitlement:', e);
      updateSyncIndicatorUI();
    }
  }

  // Cache catalog & pricing reference data when online
  async function cacheCatalogAndPricingForOffline() {
    if (!db || !navigator.onLine) return;
    const bizId = currentUserProfile ? currentUserProfile.business_id : null;

    try {
      // 1. Fetch Products & Variants
      const prodUrl = bizId ? `/products/?skip=0&limit=100&business_id=${bizId}` : '/products/?skip=0&limit=100';
      const prodRes = await fetch(prodUrl);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const productsList = Array.isArray(prodData) ? prodData : (prodData.items || []);
        if (productsList.length > 0) {
          await db.products.bulkPut(productsList.map(p => ({
            id: p.id,
            name: p.title || p.name || '',
            sku: p.sku || '',
            barcode: p.barcode || '',
            price: p.price || p.regular_price || 0,
            category_id: p.category_id || null,
            business_id: p.business_id || bizId
          })));

          // Cache variants for fetched products
          for (const prod of productsList) {
            if (prod.variants && Array.isArray(prod.variants)) {
              await db.variants.bulkPut(prod.variants.map(v => ({
                id: v.id,
                product_id: prod.id,
                sku: v.sku || '',
                barcode: v.barcode || '',
                price: v.price || prod.price || 0
              })));
            } else {
              try {
                const varRes = await fetch(`/products/${prod.id}/variants`);
                if (varRes.ok) {
                  const variants = await varRes.json();
                  if (Array.isArray(variants) && variants.length > 0) {
                    await db.variants.bulkPut(variants.map(v => ({
                      id: v.id,
                      product_id: prod.id,
                      sku: v.sku || '',
                      barcode: v.barcode || '',
                      price: v.price || prod.price || 0
                    })));
                  }
                }
              } catch (e) {}
            }
          }
        }
      }

      // 2. Fetch Categories
      const catUrl = bizId ? `/categories/?business_id=${bizId}` : '/categories/';
      const catRes = await fetch(catUrl);
      if (catRes.ok) {
        const catData = await catRes.json();
        const categoriesList = Array.isArray(catData) ? catData : (catData.items || []);
        if (categoriesList.length > 0) {
          await db.categories.bulkPut(categoriesList.map(c => ({
            id: c.id,
            name: c.name || '',
            business_id: c.business_id || bizId
          })));
        }
      }

      // 3. Fetch Tax Rules
      const taxUrl = bizId ? `/pricing/tax-rules?business_id=${bizId}` : '/pricing/tax-rules';
      const taxRes = await fetch(taxUrl);
      if (taxRes.ok) {
        const taxData = await taxRes.json();
        const taxList = Array.isArray(taxData) ? taxData : (taxData.items || []);
        if (taxList.length > 0) {
          await db.tax_rules.bulkPut(taxList.map(t => ({
            id: t.id,
            name: t.name || '',
            tax_rate: t.rate || t.tax_rate || 0,
            business_id: t.business_id || bizId
          })));
        }
      }
    } catch (e) {
      console.warn('Error caching catalog and pricing data for offline access:', e);
    }
  }

  // Search products/variants offline by query string (name, SKU, barcode)
  async function searchOfflineProducts(query) {
    if (!db || !db.products) return [];
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      return await db.products.toArray();
    }

    const matchedProducts = await db.products.filter(p => {
      return (p.name && p.name.toLowerCase().includes(q)) ||
             (p.sku && p.sku.toLowerCase().includes(q)) ||
             (p.barcode && p.barcode.toLowerCase().includes(q));
    }).toArray();

    const matchedVariants = await db.variants.filter(v => {
      return (v.sku && v.sku.toLowerCase().includes(q)) ||
             (v.barcode && v.barcode.toLowerCase().includes(q));
    }).toArray();

    return {
      products: matchedProducts,
      variants: matchedVariants
    };
  }

  // Lookup product/variant offline by barcode
  async function getOfflineProductByBarcode(barcode) {
    if (!db) return null;
    const b = (barcode || '').trim();
    if (!b) return null;

    const variant = await db.variants.filter(v => v.barcode === b).first();
    if (variant) return { type: 'variant', data: variant };

    const product = await db.products.filter(p => p.barcode === b).first();
    if (product) return { type: 'product', data: product };

    return null;
  }

  // Lookup product/variant offline by SKU
  async function getOfflineProductBySKU(sku) {
    if (!db) return null;
    const s = (sku || '').trim();
    if (!s) return null;

    const variant = await db.variants.filter(v => v.sku === s).first();
    if (variant) return { type: 'variant', data: variant };

    const product = await db.products.filter(p => p.sku === s).first();
    if (product) return { type: 'product', data: product };

    return null;
  }

  // Local Cart Management
  async function addToOfflineCart(item) {
    if (!db || !db.cart) return null;
    const existing = await db.cart.filter(c =>
      (item.variant_id && c.variant_id === item.variant_id) ||
      (!item.variant_id && c.product_id === item.product_id)
    ).first();

    if (existing) {
      existing.quantity += (item.quantity || 1);
      await db.cart.put(existing);
      return existing;
    } else {
      const newItem = {
        product_id: item.product_id || null,
        variant_id: item.variant_id || null,
        name: item.name || 'Unnamed Item',
        sku: item.sku || '',
        quantity: item.quantity || 1,
        price: item.price || 0,
        tax_rate: item.tax_rate || 0
      };
      const id = await db.cart.add(newItem);
      newItem.id = id;
      return newItem;
    }
  }

  async function getOfflineCart() {
    if (!db || !db.cart) return [];
    return await db.cart.toArray();
  }

  async function clearOfflineCart() {
    if (!db || !db.cart) return;
    await db.cart.clear();
  }

  // Complete Offline POS Sale
  async function completeOfflineSale(saleDetails) {
    const {
      payment_method = 'cash',
      customer_name = 'Walk-in Customer',
      guest_email = 'offline@guest.com',
      subtotal = 0,
      tax = 0,
      discount = 0,
      total = 0,
      items = []
    } = saleDetails || {};

    const validPaymentMethod = (payment_method.toLowerCase() === 'cod') ? 'cod' : 'cash';

    const orderUuid = generateUUID();
    const invoiceUuid = generateUUID();

    const orderNumber = `ORD-${orderUuid.substring(0, 8).toUpperCase()}`;
    const invoiceNumber = `INV-${invoiceUuid.substring(0, 8).toUpperCase()}`;

    const orderPayload = {
      id: orderUuid,
      order_number: orderNumber,
      subtotal_amount: parseFloat(subtotal) || 0,
      tax_amount: parseFloat(tax) || 0,
      discount_amount: parseFloat(discount) || 0,
      total_amount: parseFloat(total) || 0,
      payment_status: 'paid',
      payment_method: validPaymentMethod,
      fulfillment_status: 'fulfilled',
      guest_email: guest_email,
      items: items
    };

    const invoicePayload = {
      id: invoiceUuid,
      invoice_number: invoiceNumber,
      buyer_name: customer_name,
      total_payable: parseFloat(total) || 0,
      status: 'paid',
      payment_method: validPaymentMethod
    };

    await window.queueOfflineMutation('orders', 'CREATE', orderPayload, orderUuid);
    await window.queueOfflineMutation('invoices', 'CREATE', invoicePayload, invoiceUuid);

    await clearOfflineCart();

    return {
      order: orderPayload,
      invoice: invoicePayload
    };
  }

  // Flush Outbox Sync Queue to Server
  async function flushSyncQueue() {
    if (!db || !db.sync_queue || isSyncing || !navigator.onLine) return;

    try {
      const queueItems = await db.sync_queue.toArray();
      if (!queueItems || queueItems.length === 0) {
        await pullServerChanges();
        updateSyncIndicatorUI();
        return;
      }

      isSyncing = true;
      updateSyncIndicatorUI();

      const mutations = queueItems.map((item) => ({
        entity: item.entity,
        action: item.action,
        client_uuid: item.client_uuid,
        client_updated_at: item.createdAt || new Date().toISOString(),
        payload: item.payload || {}
      }));

      const response = await fetch('/api/v1/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations })
      });

      if (response.ok) {
        const processedIds = queueItems.map((i) => i.id);
        await db.sync_queue.bulkDelete(processedIds);
        await pullServerChanges();
      }
    } catch (err) {
      console.error('Error during batch sync push:', err);
    } finally {
      isSyncing = false;
      updateSyncIndicatorUI();
    }
  }

  // Pull Server Changes Since Last Sync Timestamp
  async function pullServerChanges() {
    if (!navigator.onLine) return;

    const lastSync = localStorage.getItem('last_sync_timestamp') || '1970-01-01T00:00:00Z';
    try {
      const res = await fetch(`/api/v1/sync/pull?since=${encodeURIComponent(lastSync)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.timestamp) {
          localStorage.setItem('last_sync_timestamp', data.timestamp);
        }
        if (data.changes) {
          if (db) {
            if (data.changes.orders && data.changes.orders.length > 0) {
              await db.orders.bulkPut(data.changes.orders);
            }
            if (data.changes.invoices && data.changes.invoices.length > 0) {
              await db.invoices.bulkPut(data.changes.invoices);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error pulling server changes:', err);
    }
  }

  // Helper to generate UUID
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Helper to Queue Mutation
  window.queueOfflineMutation = async function (entity, action, payload, clientUuid = null) {
    const uuid = clientUuid || generateUUID();
    const nowIso = new Date().toISOString();

    if (db && db.sync_queue) {
      await db.sync_queue.add({
        entity,
        action,
        client_uuid: uuid,
        payload,
        createdAt: nowIso
      });

      if (db[entity]) {
        await db[entity].put({
          id: payload.id || uuid,
          client_uuid: uuid,
          ...payload,
          client_updated_at: nowIso,
          is_deleted: action === 'DELETE'
        });
      }
    }

    updateSyncIndicatorUI();

    if (navigator.onLine) {
      flushSyncQueue();
    }
  };

  // Service Worker Registration
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('PWA ServiceWorker registration failed:', err);
          });
      });
    }
  }

  // Intercept Navigation for Protected Modules when offline
  document.addEventListener('click', function (event) {
    if (!navigator.onLine) {
      const link = event.target.closest('a');
      if (link && link.getAttribute('href')) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          let path = href;
          try {
            path = new URL(href, window.location.origin).pathname;
          } catch (e) {}

          const moduleName = getProtectedModuleName(path);
          if (moduleName) {
            event.preventDefault();
            event.stopPropagation();
            showOfflineBlockedNotice(moduleName);
          }
        }
      }
    }
  }, true);

  // Check current page path on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    initDB();
    registerServiceWorker();
    fetchUserProfile();

    if (!navigator.onLine) {
      const currentModuleName = getProtectedModuleName(window.location.pathname);
      if (currentModuleName) {
        showOfflineBlockedNotice(currentModuleName);
      }
    }
  });

  // Setup Event Listeners
  window.addEventListener('online', () => {
    updateSyncIndicatorUI();
    flushSyncQueue();
    cacheCatalogAndPricingForOffline();
  });

  window.addEventListener('offline', () => {
    updateSyncIndicatorUI();
  });

  // Expose Global Helper Methods
  window.refreshOfflineSyncUI = updateSyncIndicatorUI;
  window.flushSyncQueue = flushSyncQueue;
  window.cacheCatalogAndPricingForOffline = cacheCatalogAndPricingForOffline;
  window.searchOfflineProducts = searchOfflineProducts;
  window.getOfflineProductByBarcode = getOfflineProductByBarcode;
  window.getOfflineProductBySKU = getOfflineProductBySKU;
  window.addToOfflineCart = addToOfflineCart;
  window.getOfflineCart = getOfflineCart;
  window.clearOfflineCart = clearOfflineCart;
  window.completeOfflineSale = completeOfflineSale;
  window.getProtectedModuleName = getProtectedModuleName;
  window.showOfflineBlockedNotice = showOfflineBlockedNotice;
})();
