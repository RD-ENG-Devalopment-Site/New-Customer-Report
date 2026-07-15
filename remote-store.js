/* Google Sheets data source for Sales Flow */
(function () {
  const endpoint = 'https://script.google.com/macros/s/AKfycbyqJLlc3IHvRzOr6cw25FgSy9s2E1IOWCNzvQXVp0IPfXPqxthC1-1ylCqrQB178Z4i/exec';
  const storeKey = 'sales-flow-records';

  function load() {
    return new Promise((resolve, reject) => {
      const callback = 'salesFlowSheet_' + Date.now();
      const script = document.createElement('script');
      const timeout = setTimeout(() => finish(new Error('Google Sheets ใช้เวลาตอบกลับนานเกินไป')), 10000);
      function finish(error, payload) {
        clearTimeout(timeout);
        delete window[callback];
        script.remove();
        error ? reject(error) : resolve((payload && payload.records) || []);
      }
      window[callback] = payload => finish(null, payload);
      script.onerror = () => finish(new Error('ไม่สามารถโหลดข้อมูลจาก Google Sheets'));
      script.src = endpoint + '?callback=' + callback + '&_=' + Date.now();
      document.head.appendChild(script);
    });
  }

  function save(record) {
    return fetch(endpoint, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(record)
    });
  }

  localStorage.setItem('sales-flow-apps-script-url', endpoint);
  window.salesFlowRemote = { endpoint, load, save };

  // Google Sheets is the source of truth. Check it again whenever the user
  // returns to the dashboard, so data saved in another tab is never cached.
  let syncing = false;
  function stableRecords(value) {
    const rows = Array.isArray(value) ? value : [];
    return rows.map(row => {
      const copy = { ...row };
      delete copy.planAchieved;
      return copy;
    }).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  }
  function syncFromSheet() {
    if (syncing) return Promise.resolve(false);
    syncing = true;
    return load().then(records => {
      const normalized = stableRecords(records);
      const next = JSON.stringify(normalized);
      let previous = '[]';
      try { previous = JSON.stringify(stableRecords(JSON.parse(localStorage.getItem(storeKey) || '[]'))); } catch {}
      const changed = next !== previous;
      if (changed) {
        localStorage.setItem(storeKey, next);
        window.dispatchEvent(new CustomEvent('sales-flow-sheet-loaded', { detail: normalized }));
      }
      return changed;
    }).catch(() => false).finally(() => { syncing = false; });
  }

  window.salesFlowRemote.refresh = syncFromSheet;
  function startSync() { syncFromSheet(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSync, { once: true });
  } else {
    startSync();
  }
  window.addEventListener('focus', startSync);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) startSync();
  });
}());
