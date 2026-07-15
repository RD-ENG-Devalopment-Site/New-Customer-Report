/* Google Sheets data source for Sales Flow */
(function () {
  const endpoint = 'https://script.google.com/macros/s/AKfycbyqJLlc3IHvRzOr6cw25FgSy9s2E1IOWCNzvQXVp0IPfXPqxthC1-1ylCqrQB178Z4i/exec';
  const storeKey = 'sales-flow-records';
  const fields = ['date', 'planTarget', 'old', 'newProspect', 'waiting', 'closed', 'notClosed'];
  let syncing = false;

  function cleanRecord(row) {
    const result = {};
    fields.forEach(key => { result[key] = key === 'date' ? String(row[key] || '') : Math.max(0, Number(row[key]) || 0); });
    return result;
  }
  function normalize(rows) {
    return (Array.isArray(rows) ? rows : []).map(cleanRecord).filter(row => row.date).sort((a, b) => a.date.localeCompare(b.date));
  }
  function load() {
    return new Promise((resolve, reject) => {
      const callback = 'salesFlowSheet_' + Date.now();
      const script = document.createElement('script');
      const timeout = setTimeout(() => finish(new Error('Google Sheets ใช้เวลาตอบกลับนานเกินไป')), 10000);
      function finish(error, payload) {
        clearTimeout(timeout);
        delete window[callback];
        script.remove();
        error ? reject(error) : resolve(normalize(payload && payload.records));
      }
      window[callback] = payload => finish(null, payload);
      script.onerror = () => finish(new Error('ไม่สามารถโหลดข้อมูลจาก Google Sheets'));
      script.src = endpoint + '?callback=' + callback + '&_=' + Date.now();
      document.head.appendChild(script);
    });
  }
  function save(record) {
    return fetch(endpoint, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cleanRecord(record))
    });
  }
  function sync() {
    if (syncing) return Promise.resolve(false);
    syncing = true;
    return load().then(records => {
      const next = JSON.stringify(records);
      const previous = JSON.stringify(normalize(JSON.parse(localStorage.getItem(storeKey) || '[]')));
      const changed = next !== previous;
      if (changed) {
        localStorage.setItem(storeKey, next);
        window.dispatchEvent(new CustomEvent('sales-flow-sheet-loaded', { detail: records }));
      }
      return changed;
    }).catch(() => false).finally(() => { syncing = false; });
  }

  localStorage.setItem('sales-flow-apps-script-url', endpoint);
  window.salesFlowRemote = { endpoint, load, save, refresh: sync, cleanRecord };
  document.addEventListener('DOMContentLoaded', sync, { once: true });
  window.addEventListener('focus', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
}());
