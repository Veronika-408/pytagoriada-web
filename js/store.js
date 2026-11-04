/* Trvalé ukladanie (localStorage) – vlastné úlohy, pracovné listy, košík, nastavenia.
   Všetko je v try/catch: keď je úložisko zablokované, aplikácia ide ďalej bez ukladania. */
(function () {
  const P = (window.PYT = window.PYT || {});
  const PREFIX = "pyt.v1.";
  let memoryOnly = false;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { memoryOnly = true; return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch (e) { memoryOnly = true; return false; }
  }

  P.store = {
    read, write,
    isMemoryOnly: () => memoryOnly,
    getCustom: () => read("custom", []),
    saveCustom: (list) => write("custom", list),
    getCart: () => read("cart", []),
    saveCart: (ids) => write("cart", ids),
    getSheets: () => read("sheets", []),
    saveSheets: (list) => write("sheets", list),
    getPrefs: () => read("prefs", {}),
    savePrefs: (p) => write("prefs", p),
  };
})();
