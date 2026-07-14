/* Google Sheets data source for Sales Flow */
(function () {
  const endpoint = 'https://script.google.com/macros/s/AKfycbyqJLlc3IHvRzOr6cw25FgSy9s2E1IOWCNzvQXVp0IPfXPqxthC1-1ylCqrQB178Z4i/exec';
  const storeKey = 'sales-flow-records';
  // Bump this key whenever the API changes so an existing tab refreshes its data.
  const syncKey = 'sales-flow-sheet-synced-v2';

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

  // The sheet is the source of truth: refresh each browser tab once per session.
  if (!sessionStorage.getItem(syncKey)) {
    load().then(records => {
      localStorage.setItem(storeKey, JSON.stringify(records));
      sessionStorage.setItem(syncKey, '1');
      window.dispatchEvent(new CustomEvent('sales-flow-sheet-loaded', { detail: records }));
      if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => location.reload(), { once: true });
      else location.reload();
    }).catch(() => {
      sessionStorage.setItem(syncKey, '1');
    });
  }
}());
