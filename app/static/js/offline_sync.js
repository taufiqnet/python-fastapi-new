/**
 * Offline-First PWA Local Client & Sync Engine
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
        tasks: '++id, client_uuid, title, client_updated_at, is_deleted',
        orders: 'id, client_uuid, order_number, client_updated_at, is_deleted',
        invoices: 'id, client_uuid, invoice_number, client_updated_at, is_deleted',
        sync_queue: '++id, entity, action, client_uuid, createdAt'
      });
    } else {
      console.warn('Dexie.js library not loaded; IndexedDB fallback initialized.');
    }
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

  // Fetch Current User Profile to inspect can_use_offline_mode
  async function fetchUserProfile() {
    try {
      const res = await fetch('/api/v1/users/me');
      if (res.ok) {
        currentUserProfile = await res.json();
        updateSyncIndicatorUI();
        if (currentUserProfile.can_use_offline_mode || currentUserProfile.is_superuser) {
          if (navigator.onLine) {
            flushSyncQueue();
          }
        }
      }
    } catch (e) {
      console.warn('Unable to fetch user profile for offline sync entitlement:', e);
      // Assume offline state
      updateSyncIndicatorUI();
    }
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
        const resData = await response.json();
        // Remove processed items from sync_queue
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
            if (data.changes.tasks && data.changes.tasks.length > 0) {
              await db.tasks.bulkPut(data.changes.tasks);
            }
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

  // Setup Event Listeners
  window.addEventListener('online', () => {
    updateSyncIndicatorUI();
    flushSyncQueue();
  });

  window.addEventListener('offline', () => {
    updateSyncIndicatorUI();
  });

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initDB();
    registerServiceWorker();
    fetchUserProfile();
  });

  window.refreshOfflineSyncUI = updateSyncIndicatorUI;
  window.flushSyncQueue = flushSyncQueue;
})();
