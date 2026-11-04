/* Záložka "Analýza úloh": ktoré typy trikov sa v Pytagoriáde opakujú, ako sa líšia P6/P7/P8, kolá a obdobia + katalóg typov. */
(function () {
  const P = window.PYT, h = P.h;
  const OBDOBIA = [
    ["2009/10–2013/14", (r) => r >= "2009/2010" && r <= "2013/2014"],
    ["2014/15–2019/20", (r) => r >= "2014/2015" && r <= "2019/2020"],
    ["2020/21–2025/26", (r) => r >= "2020/2021" && r <= "2025/2026"],
  ];
  let host, mode = "vsetky";

  const hash = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; };
  const pct = (n, t) => (t ? (100 * n / t) : 0);

  function dataset() { return P.ULOHY.filter((u) => u.typ_triku && P.TRIKY[u.typ_triku]); }
  function counts(set) { const c = {}; set.forEach((u) => (c[u.typ_triku] = (c[u.typ_triku] || 0) + 1)); return c; }

  function topBars(set) {
    const c = counts(set), rows = Object.entries(c).sort((a, b) => b[1] - a[1]);
    const max = rows[0][1];
    return h("div", { class: "bars" }, rows.map(([id, n]) =>
      h("div", { class: "bar-row clickable", title: "Zobraziť úlohy tohto typu", onclick: () => P.dbSetFilter({ typ_triku: id }) },
        h("span", null, P.TRIKY[id].n),
        h("div", { class: "bar-track" }, h("div", { class: "bar-fill", style: `width:${(n / max) * 100}%` })),
        h("span", { class: "v" }, `${n} · ${pct(n, set.length).toFixed(1)}%`))));
  }

  function shareTable(set, cols, colOf, caption) {
    const ids = Object.keys(counts(set)).sort((a, b) => counts(set)[b] - counts(set)[a]);
    const tot = cols.map((c) => set.filter((u) => colOf(u) === c).length);
    const head = h("tr", null, h("th", null, "Typ triku"), cols.map((c, i) => h("th", null, c, h("br"), h("span", { class: "sub" }, "n=" + tot[i]))));
    const rows = ids.map((id) => h("tr", null, h("td", { class: "lbl" }, P.TRIKY[id].n),
      cols.map((c, i) => {
        const n = set.filter((u) => colOf(u) === c && u.typ_triku === id).length, p = pct(n, tot[i]);
        return h("td", { class: "shade", style: `--p:${Math.min(p * 4, 70)}%`, title: `${n} úloh` }, p ? p.toFixed(1) + " %" : "–");
      })));
    return h("div", null, h("h3", { class: "sec" }, caption), h("div", { class: "table-wrap" }, h("table", { class: "cov share" }, h("thead", null, head), h("tbody", null, rows))));
  }

  function examples(id) {
    const out = [];
    P.KATEGORIE.forEach((k) => {
      const pool = P.ULOHY.filter((u) => u.typ_triku === id && u.kategoria === k && u.odpoved && u.zadanie.length < 260 && u.tema !== "geometria_obrazok")
        .sort((a, b) => hash(a.id) - hash(b.id));
      if (pool.length) out.push(pool[0]);
    });
    return out;
  }

  function catalogCard(id, n, set) {
    const t = P.TRIKY[id];
    const byKat = P.KATEGORIE.map((k) => `${k}: ${set.filter((u) => u.typ_triku === id && u.kategoria === k).length}`).join(" · ");
    const ex = examples(id);
    return h("details", { class: "cat-card", "data-typ": id },
      h("summary", null, h("span", { class: "nm" }, t.n), h("span", { class: "n mono" }, `${n} úloh`)),
      h("div", { class: "cat-body" },
        h("p", { class: "mono small" }, byKat),
        h("p", null, h("b", null, "Ako to spoznáš: "), t.spoznas),
        t.postup && t.postup.length ? h("div", null, h("b", null, "Postup:"), h("ol", null, t.postup.map((x) => h("li", null, x)))) : null,
        t.pasce ? h("p", null, h("b", null, "Na čo si dať pozor: "), t.pasce) : null,
        t.cas ? h("p", { class: "small" }, h("b", null, "Orientačný čas: "), t.cas) : null,
        ex.length ? h("div", null, h("b", null, "Príklady z databázy:"), ex.map((u) =>
          h("div", { class: "ex" }, h("span", { class: "badge" }, `${u.kategoria} · ${P.rokKratko(u.rok)} · ${u.kolo}`),
            h("div", { class: "zadanie" }, P.zadanieNode(u)), P.obrazkyNode(u), h("div", { class: "answer" }, "Odpoveď: ", h("b", null, u.odpoved), u.trik ? h("span", { class: "trik" }, "Trik: " + u.trik) : null)))) : null,
        h("button", { class: "btn", type: "button", onclick: () => P.dbSetFilter({ typ_triku: id }) }, `Všetkých ${n} úloh tohto typu v databáze →`)));
  }

  function render() {
    const all = dataset();
    const set = mode === "vsetky" ? all : all.filter((u) => u.kategoria === mode);
    const c = counts(set), ids = Object.keys(c).sort((a, b) => c[b] - c[a]);
    const top3 = ids.filter((i) => i !== "iny").slice(0, 3).reduce((s, i) => s + c[i], 0);
    host.replaceChildren(h("div", { class: "page" },
      h("h2", null, "Analýza úloh"),
      h("p", { class: "lead" }, `Každá z ${all.length} úloh je zaradená k jednému hlavnému typu triku (a niektoré k vedľajšiemu). Tri najčastejšie typy tvoria ${pct(top3, set.length).toFixed(0)} % úloh ${mode === "vsetky" ? "všetkých kategórií" : "kategórie " + mode}. Klik na riadok otvorí tieto úlohy v Databáze.`),
      h("p", { class: "note warn" }, "Zaradenie úloh k typom triku robil Claude podľa zadania a odpovede; je to pomôcka, nie oficiálne členenie. Rozdiely medzi obdobiami sú malé (rádovo 1–2 percentuálne body), preto ich ber ako orientačné. Texty a časy v katalógu sú tiež odhady – skontroluj ich."),
      h("div", { class: "chips", style: "margin:1rem 0" }, ["vsetky", ...P.KATEGORIE].map((k) =>
        h("button", { class: "chip", type: "button", "aria-pressed": mode === k, onclick: () => { mode = k; render(); } }, k === "vsetky" ? "všetky kategórie" : k))),
      h("h3", { class: "sec" }, "Najčastejšie typy triku"), topBars(set),
      h("div", { class: "stack" },
        shareTable(all, P.KATEGORIE, (u) => u.kategoria, "Podiel typu v kategórii (stĺpce = 100 %)"),
        shareTable(all, P.KOLA, (u) => u.kolo, "Podiel typu podľa kola"),
        shareTable(all, OBDOBIA.map((o) => o[0]), (u) => (OBDOBIA.find((o) => o[1](u.rok)) || [])[0], "Podiel typu podľa obdobia")),
      h("h3", { class: "sec" }, "Katalóg typov"),
      h("p", { class: "note" }, "Rozbaľ typ – nájdeš, ako ho spoznať, postup, pasce a príklady z databázy (príklady sú vybrané automaticky)."),
      h("div", { class: "catalog" }, ids.map((id) => catalogCard(id, c[id], set)))));
  }

  P.initAnalyzaUloh = function () { host = document.getElementById("panel-analyza"); render(); };
  P.registerTab({ id: "analyza", label: "Analýza úloh", init: () => P.initAnalyzaUloh() });
})();
