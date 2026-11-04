/* Spoločné veci: slovníky, pomocné funkcie, prístup k úlohám. */
(function () {
  const P = (window.PYT = window.PYT || {});

  P.OKRUHY = {
    cisla: "Čísla, premenná a počtové výkony s číslami",
    geo: "Geometria a meranie",
    komb: "Kombinatorika, pravdepodobnosť, štatistika",
    vztahy: "Vzťahy, funkcie, tabuľky, diagramy",
    logika: "Logika, dôvodenie, dôkazy",
  };

  // Kľúče tém sú tie isté ako v databáze (vrátane pôvodného "desetinne_cisla").
  P.TEMY = {
    vypocet_vyrazu: { n: "Výpočet výrazu", okruh: "cisla" },
    rovnice_neznama: { n: "Rovnice, neznáma", okruh: "cisla" },
    delitelnost_zvysky: { n: "Deliteľnosť, zvyšky", okruh: "cisla" },
    desetinne_cisla: { n: "Desatinné čísla", okruh: "cisla" },
    zlomky: { n: "Zlomky", okruh: "cisla" },
    cisla_stavba: { n: "Stavba čísla", okruh: "cisla" },
    percenta_pomery: { n: "Percentá, pomery", okruh: "cisla" },
    ciferny_sucet_posledna_cislica: { n: "Ciferný súčet, posledná cifra", okruh: "cisla" },
    slovna_uloha_prakticka: { n: "Praktická slovná úloha", okruh: "cisla" },
    geometria_obrazok: { n: "Geometria s obrázkom", okruh: "geo" },
    geometria_objem_povrch: { n: "Objem a povrch", okruh: "geo" },
    kombinatorika_pravdepodobnost: { n: "Kombinatorika, pravdepodobnosť", okruh: "komb" },
    prumer_stat: { n: "Priemer, štatistika", okruh: "komb" },
    postupnosti_vzory: { n: "Postupnosti, vzory", okruh: "vztahy" },
    ine: { n: "Iné, logika", okruh: "logika" },
  };

  P.KATEGORIE = ["P6", "P7", "P8"];
  P.KOLA = ["školské", "okresné", "celoštátne"];
  P.temaNazov = (t) => (P.TEMY[t] ? P.TEMY[t].n : t || "bez témy");
  P.temaOkruh = (t) => (P.TEMY[t] ? P.TEMY[t].okruh : null);

  P.norm = (s) =>
    (s || "").toLocaleLowerCase("sk").normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Malý pomocník na skladanie DOM-u bez innerHTML (žiadne problémy s escapovaním).
  P.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k.startsWith("aria-")) { el.setAttribute(k, String(v ?? false)); continue; }   // aria-pressed="true"/"false"
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "checked" || k === "disabled" || k === "selected" || k === "value") el[k] = v;
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };

  P.isUrl = (s) => /^https?:\/\//i.test(s || "");

  // Odkaz na pôvodné PDF (leží o priečinok vyššie). Pri textových PDF aj priamo na stranu úlohy.
  P.pdfOdkaz = function (u) {
    if (u.pdf) return { href: u.pdf + (u.strana ? "#page=" + u.strana : ""), text: "PDF originál" + (u.strana ? ", s. " + u.strana : "") };
    const m = /lokálny súbor:\s*([^\s)]+\.pdf)/.exec(u.zdroj_url || "");
    if (m) return { href: "../" + m[1], text: "PDF originál" };
    if (P.isUrl(u.zdroj_url)) return { href: u.zdroj_url, text: "zdroj" };
    return null;
  };
  // Obrázok chýba len pri skenovaných ročníkoch (2009–2014), kde poloha úlohy v PDF nie je známa.
  P.chybaObrazok = (u) => u.tema === "geometria_obrazok" && !u.strana && !(u.obrazky || []).length;
  P.obrazkyNode = (u) => (u.obrazky || []).length
    ? P.h("div", { class: "figs" }, u.obrazky.map((src) => P.h("img", { src, alt: "Obrázok k úlohe", loading: "lazy" })))
    : null;
  P.rokKratko = (r) => (/^\d{4}\/\d{4}$/.test(r || "") ? r.slice(2, 4) + "/" + r.slice(7) : r || "");

  // Všetky úlohy = databáza + vlastné z úložiska.
  P.vlastne = () =>
    P.store.getCustom().map((u) => Object.assign({}, u, { vlastna: true }));
  P.vsetky = () => P.ULOHY.concat(P.vlastne());

  const KOLO_PORADIE = { "školské": 0, "okresné": 1, "celoštátne": 2 };
  P.zoradit = (a, b) =>
    (a.rok < b.rok ? 1 : a.rok > b.rok ? -1 : 0) ||
    (a.kategoria < b.kategoria ? -1 : a.kategoria > b.kategoria ? 1 : 0) ||
    (KOLO_PORADIE[a.kolo] ?? 9) - (KOLO_PORADIE[b.kolo] ?? 9) ||
    (a.cislo_ulohy || 0) - (b.cislo_ulohy || 0);

  P.popis = (u) => `${u.kategoria} · ${u.rok} · ${u.kolo} kolo · č. ${u.cislo_ulohy ?? "–"}`;

  // jednoduchá správa "udalostí" medzi záložkami
  const listeners = {};
  P.on = (ev, fn) => ((listeners[ev] = listeners[ev] || []).push(fn));
  P.emit = (ev, data) => (listeners[ev] || []).forEach((fn) => fn(data));

  // Košík (zoznam id v poradí, v akom sa budú tlačiť)
  P.cart = {
    ids: P.store.getCart(),
    has: (id) => P.cart.ids.includes(id),
    add(id) { if (!P.cart.has(id)) { P.cart.ids.push(id); P.cart._save(); } },
    remove(id) { P.cart.ids = P.cart.ids.filter((x) => x !== id); P.cart._save(); },
    // hromadne – uloží a prekreslí len raz (inak sa pri stovkách úloh aplikácia zasekne)
    addMany(ids) { const s = new Set(P.cart.ids); ids.forEach((id) => { if (!s.has(id)) { s.add(id); P.cart.ids.push(id); } }); P.cart._save(); },
    removeMany(ids) { const s = new Set(ids); P.cart.ids = P.cart.ids.filter((x) => !s.has(x)); P.cart._save(); },
    toggle(id) { P.cart.has(id) ? P.cart.remove(id) : P.cart.add(id); },
    clear() { P.cart.ids = []; P.cart._save(); },
    move(id, d) {
      const i = P.cart.ids.indexOf(id), j = i + d;
      if (i < 0 || j < 0 || j >= P.cart.ids.length) return;
      [P.cart.ids[i], P.cart.ids[j]] = [P.cart.ids[j], P.cart.ids[i]];
      P.cart._save();
    },
    _save() { P.store.saveCart(P.cart.ids); P.emit("cart"); },
    items() {
      const map = new Map(P.vsetky().map((u) => [u.id, u]));
      return P.cart.ids.map((id) => map.get(id)).filter(Boolean);
    },
  };
})();
