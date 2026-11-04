/* Záložky, téma (svetlá/tmavá/systém), spustenie. */
(function () {
  const P = window.PYT, h = P.h;
  const TABS = [
    { id: "db", label: P.ZIAK ? "Trénovať" : "Databáza", init: () => P.initDb && P.initDb() },
    { id: "sheet", label: "Pracovný list", init: () => P.initSheet && P.initSheet(), badge: () => P.cart.ids.length },
    { id: "custom", label: "Moje úlohy", init: () => P.initCustom && P.initCustom() },
    { id: "overview", label: "Prehľad dát", init: () => P.initOverview && P.initOverview() },
  ];
  // Ďalšie záložky (analýzy) sa registrujú z vlastných súborov.
  P.registerTab = (t) => TABS.push(t);

  P.showTab = function (id) {
    document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === id));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + id));
    const bar = document.getElementById("cartbar");
    if (bar) bar.style.display = id === "db" ? "" : "none";
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    window.scrollTo(0, 0);
  };

  function applyTheme(mode) {
    const r = document.documentElement;
    if (mode === "light" || mode === "dark") r.setAttribute("data-theme", mode); else r.removeAttribute("data-theme");
    P.store.savePrefs(Object.assign({}, P.store.getPrefs(), { theme: mode || "system" }));
  }

  function start() {
    // Záložky doplnené z iných súborov musia byť zaregistrované pred spustením.
    const nav = document.getElementById("tabs"), panels = document.getElementById("panels");
    // záložky, ktorých skript nie je načítaný (žiacka verzia: Moje úlohy, Prehľad dát), sa vynechajú
    const NEED = { db: "initDb", sheet: "initSheet", custom: "initCustom", overview: "initOverview" };
    for (let i = TABS.length - 1; i >= 0; i--) if (NEED[TABS[i].id] && !P[NEED[TABS[i].id]]) TABS.splice(i, 1);
    TABS.forEach((t) => {
      const badge = t.badge ? h("span", { class: "pill", "data-badge": t.id }, "0") : null;
      nav.append(h("button", { class: "tab", type: "button", role: "tab", "data-tab": t.id, "aria-selected": "false", onclick: () => P.showTab(t.id) }, t.label, badge));
      panels.append(h("section", { class: "panel", id: "panel-" + t.id, role: "tabpanel" }));
    });
    TABS.forEach((t) => t.init());
    const upd = () => TABS.forEach((t) => { if (t.badge) { const el = document.querySelector(`[data-badge="${t.id}"]`); const n = t.badge(); el.textContent = n; el.hidden = !n; } });
    P.on("cart", upd); upd();

    // predvolene svetlý vzhľad (aj keď má systém tmavý režim); tmavý len po prepnutí tlačidlom
    applyTheme(P.store.getPrefs().theme === "dark" ? "dark" : "light");
    document.getElementById("theme-btn").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(dark ? "light" : "dark");
    });

    const hash = location.hash.slice(1);
    P.showTab(TABS.some((t) => t.id === hash) ? hash : "db");
    document.getElementById("total-count").textContent = P.ULOHY.length + " úloh";
    if (P.store.isMemoryOnly()) console.warn("Úložisko prehliadača nie je dostupné – vlastné úlohy sa neuložia.");
  }

  document.addEventListener("DOMContentLoaded", () => {
    // malé oneskorenie, aby sa stihli zaregistrovať záložky z analytických súborov (načítajú sa po main.js)
    setTimeout(start, 0);
  });
})();
