/* Záložka "Databáza": filtre + zoznam úloh + výber do pracovného listu. */
(function () {
  const P = window.PYT, h = P.h;
  const PAGE = 40;

  const state = {
    kat: new Set(), kolo: new Set(), rok: new Set(), okruh: new Set(), tema: new Set(), typ: new Set(),
    q: "", len_vlastne: false, len_s_odpovedou: false, stav: "",   // stav (žiak): "" | "nove" | "zle" | "ok"
    showAns: false, showTrik: false, shown: PAGE,
    rezim: "jedna", jednaId: null,   // žiak: "jedna" = úloha za úlohou, "zoznam" = všetky úlohy
  };

  const toggle = (set, v) => (set.has(v) ? set.delete(v) : set.add(v));
  const STAV = { nove: "ešte neriešené", zle: "nevyšli mi", ok: "vyriešené správne" };

  function matches(u, skip) {
    if (skip !== "kat" && state.kat.size && !state.kat.has(u.kategoria)) return false;
    if (skip !== "kolo" && state.kolo.size && !state.kolo.has(u.kolo)) return false;
    if (skip !== "rok" && state.rok.size && !state.rok.has(u.rok)) return false;
    if (skip !== "okruh" && state.okruh.size && !state.okruh.has(P.temaOkruh(u.tema))) return false;
    if (skip !== "tema" && state.tema.size && !state.tema.has(u.tema)) return false;
    if (skip !== "typ" && state.typ.size && !state.typ.has(u.typ_triku)) return false;
    if (state.len_vlastne && !u.vlastna) return false;
    if (state.len_s_odpovedou && !u.odpoved) return false;
    if (state.stav && P.pokrok) {
      const r = P.pokrok.get(u.id);
      if (state.stav === "nove" && r) return false;
      if (state.stav === "zle" && !(r && !r.ok)) return false;
      if (state.stav === "ok" && !(r && r.ok)) return false;
    }
    if (state.q) {
      const hay = P.norm(u.zadanie + " " + P.matPlain(u.zadanie_mat) + " " + (u.odpoved || "") + " " + (u.trik || "") + " " + P.temaNazov(u.tema));
      if (!state.q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }

  const root = () => document.getElementById("panel-db");
  let railEl, resultsEl, railOpen = false;

  // riadok so zaškrtávacím políčkom; zaškrtnutý je zvýraznený
  function checkRow(set, id, text, extra) {
    return h("label", { class: "check-row" + (set.has(id) ? " on" : "") },
      h("input", { type: "checkbox", checked: set.has(id), onchange: () => { toggle(set, id); render(); } }),
      h("span", null, text), extra || null);
  }
  // nadpis skupiny filtrov: počet vybraných + "zrušiť" len keď je čo rušiť
  function groupHead(title, set) {
    return h("h2", { class: set.size ? "on" : null }, h("span", null, title, set.size ? h("span", { class: "cnt" }, set.size) : null),
      set.size ? h("button", { class: "link-btn", type: "button", onclick: () => { set.clear(); render(); } }, "zrušiť") : null);
  }

  // zoznam aktívnych filtrov pre lištu nad výsledkami
  function aktivne() {
    const out = [];
    const add = (set, lbl) => set.forEach((v) => out.push({ t: lbl(v), x: () => { set.delete(v); render(); } }));
    add(state.kat, (v) => v);
    add(state.kolo, (v) => v + " kolo");
    add(state.rok, (v) => v);
    add(state.okruh, (v) => P.OKRUHY[v]);
    add(state.tema, (v) => P.temaNazov(v));
    add(state.typ, (v) => (P.TRIKY && P.TRIKY[v] ? P.TRIKY[v].n : v));
    if (state.q) out.push({ t: `„${state.q}“`, x: () => { state.q = ""; render(); } });
    if (state.len_s_odpovedou) out.push({ t: "s odpoveďou", x: () => { state.len_s_odpovedou = false; render(); } });
    if (state.len_vlastne) out.push({ t: "moje úlohy", x: () => { state.len_vlastne = false; render(); } });
    if (state.stav) out.push({ t: STAV[state.stav], x: () => { state.stav = ""; render(); } });
    return out;
  }
  function zrusitVsetko() {
    ["kat", "kolo", "rok", "okruh", "tema", "typ"].forEach((k) => state[k].clear());
    state.q = ""; state.len_s_odpovedou = false; state.len_vlastne = false; state.stav = ""; render();
  }

  function chipGroup(values, set, label) {
    return h("div", { class: "chips" }, values.map((v) =>
      h("button", { class: "chip", type: "button", "aria-pressed": set.has(v), onclick: () => { toggle(set, v); render(); } }, label ? label(v) : v)));
  }

  function renderRail() {
    if (railEl) railEl.classList.toggle("open", railOpen);
    const all = P.vsetky();
    const roky = [...new Set(all.map((u) => u.rok))].sort().reverse();
    const countTema = {};
    all.filter((u) => matches(u, "tema")).forEach((u) => (countTema[u.tema] = (countTema[u.tema] || 0) + 1));

    const nAkt = aktivne().length;
    P.fill(railEl, 
      // na mobile sú filtre zbalené pod týmto tlačidlom
      h("button", { class: "btn rail-toggle", type: "button", "aria-expanded": railOpen, onclick: () => { railOpen = !railOpen; renderRail(); } },
        (railOpen ? "▴ Skryť filtre" : "▾ Filtre") + (nAkt ? ` (${nAkt})` : "")),
      h("section", null,
        h("h2", null, "Hľadať"),
        h("input", { class: "input", type: "search", placeholder: "napr. zvyšok, trojuholník, 2025…", value: state.q,
          "aria-label": "Hľadať v úlohách", oninput: (e) => { state.q = P.norm(e.target.value.trim()); state.shown = PAGE; renderResults(); renderRailCounts(); } })),
      h("section", null, groupHead("Kategória", state.kat), chipGroup(P.KATEGORIE, state.kat)),
      h("section", null, groupHead("Kolo", state.kolo), chipGroup(P.KOLA, state.kolo, (k) => k)),
      P.ZIAK ? null : rokSekcia(roky),
      P.ZIAK ? null : h("section", null,
        groupHead("Okruh ŠVP", state.okruh),
        Object.entries(P.OKRUHY).map(([k, n]) => checkRow(state.okruh, k, n))),
      h("section", null,
        groupHead("Téma", state.tema),
        Object.entries(P.OKRUHY).flatMap(([ok, okName]) => {
          const temy = Object.entries(P.TEMY).filter(([, t]) => t.okruh === ok);
          return [h("div", { class: "okruh-name" }, okName),
            ...temy.map(([id, t]) => checkRow(state.tema, id, t.n, h("span", { class: "n", "data-tema-count": id }, countTema[id] || 0)))];
        })),
      P.ZIAK ? null : h("section", null,
        groupHead("Typ triku", state.typ),
        Object.entries(P.TRIKY || {}).map(([id, t]) => checkRow(state.typ, id, t.n))),
      P.ZIAK ? h("details", { class: "more-filters", open: state.rok.size > 0 }, h("summary", null, "Viac filtrov"), rokSekcia(roky)) : null,
      h("section", null,
        h("h2", null, "Ďalšie"),
        h("label", { class: "check-row" + (state.len_s_odpovedou ? " on" : "") }, h("input", { type: "checkbox", checked: state.len_s_odpovedou, onchange: (e) => { state.len_s_odpovedou = e.target.checked; render(); } }), h("span", null, "len úlohy s odpoveďou")),
        P.ZIAK ? null : h("label", { class: "check-row" + (state.len_vlastne ? " on" : "") }, h("input", { type: "checkbox", checked: state.len_vlastne, onchange: (e) => { state.len_vlastne = e.target.checked; render(); } }), h("span", null, "len moje vlastné úlohy"))),
      P.ZIAK ? h("section", null, h("h2", { class: state.stav ? "on" : null }, "Môj pokrok"),
        h("div", { class: "chips" }, [["", "všetky"], ["nove", "ešte neriešené"], ["zle", "nevyšli mi"], ["ok", "vyriešené"]].map(([k, t]) =>
          h("button", { class: "chip", type: "button", "aria-pressed": state.stav === k, onclick: () => { state.stav = k; render(); } }, t)))) : null,
      P.ZIAK ? null : h("p", { class: "note" }, "Okruh ŠVP je odvodený z témy úlohy (jedna téma = jeden okruh), nie z oficiálnych výkonových štandardov po ročníkoch.")
    );
  }

  function rokSekcia(roky) {
    return h("section", null, groupHead("Školský rok", state.rok),
      h("div", { class: "chips" }, roky.map((r) =>
        h("button", { class: "chip sm", type: "button", "aria-pressed": state.rok.has(r), onclick: () => { toggle(state.rok, r); render(); } }, r))));
  }

  function renderRailCounts() {
    const all = P.vsetky();
    const counts = {};
    all.filter((u) => matches(u, "tema")).forEach((u) => (counts[u.tema] = (counts[u.tema] || 0) + 1));
    railEl.querySelectorAll("[data-tema-count]").forEach((el) => (el.textContent = counts[el.dataset.temaCount] || 0));
  }

  function card(u) {
    const selected = P.cart.has(u.id);
    const meta = h("div", { class: "meta" },
      h("span", { class: "badge cat" }, u.kategoria),
      h("span", { class: "badge" }, u.rok),
      h("span", { class: "badge" }, u.kolo + " kolo"),
      u.cislo_ulohy != null ? h("span", { class: "badge" }, "č. " + u.cislo_ulohy) : null,
      u.vlastna ? h("span", { class: "badge own" }, "moja úloha") : null,
      P.chybaObrazok(u) ? h("span", { class: "badge warn", title: "Skenovaný ročník: obrázok k úlohe nie je vystrihnutý – pozri PDF originál." }, "obrázok v PDF") : null);

    const odkaz = P.ZIAK ? null : P.pdfOdkaz(u);
    const foot = h("div", { class: "foot" },
      u.tema ? h("span", { class: "tag" }, P.temaNazov(u.tema)) : null,
      !P.ZIAK && u.typ_triku && P.TRIKY && P.TRIKY[u.typ_triku] ? h("span", { class: "tag trik-tag" }, P.TRIKY[u.typ_triku].n) : null,
      odkaz ? h("span", { class: "src" }, h("a", { href: odkaz.href, target: "_blank", rel: "noopener" }, odkaz.text + " ↗"))
        : u.zdroj_url ? h("span", { class: "src" }, u.zdroj_url) : null);

    const kids = [meta, h("div", { class: "zadanie" }, P.zadanieNode(u)), P.obrazkyNode(u), foot];
    if (P.ZIAK) kids.push(odpovedBox(u));
    if ((state.showAns && !P.ZIAK) || state.showTrik) {
      const ans = h("div", { class: "answer" + (u.odpoved ? "" : " missing") });
      if (state.showAns && !P.ZIAK) ans.append(u.odpoved ? h("span", null, "Odpoveď: ", h("b", null, u.odpoved)) : h("span", null, "Odpoveď chýba v databáze."));
      if (state.showTrik && u.trik) ans.append(h("span", { class: "trik" }, "Trik: " + u.trik));
      if (ans.childNodes.length) kids.push(ans);
    }
    const cb = h("input", { type: "checkbox", checked: selected, "aria-label": "Pridať do pracovného listu",
      onchange: (e) => { P.cart.toggle(u.id); e.target.closest(".card").classList.toggle("selected", P.cart.has(u.id)); syncSelectAll(); } });
    const r = P.ZIAK && P.pokrok.get(u.id);
    if (r) meta.append(h("span", { class: "badge " + (r.ok ? "own" : "warn") }, r.ok ? "✓ vyriešené" : "✗ skús znova"));
    if (P.ZIAK) return h("article", { class: "card solo", "data-id": u.id }, h("div", null, kids));
    return h("article", { class: "card" + (selected ? " selected" : ""), "data-id": u.id }, h("div", null, cb), h("div", null, kids));
  }

  // žiak: políčko na odpoveď + kontrola; riešenie (a trik) až po pokuse
  function odpovedBox(u) {
    const box = h("div", { class: "try" });
    if (!u.odpoved) { box.append(h("span", { class: "note" }, "K tejto úlohe nemáme odpoveď v kľúči – vyrieš ju a porovnaj so spolužiakmi.")); return box; }
    const inp = h("input", { class: "input", type: "text", inputmode: "text", placeholder: "tvoja odpoveď", "aria-label": "Tvoja odpoveď", autocomplete: "off" });
    const fb = h("div", { class: "try-fb", "aria-live": "polite" });
    const riesenie = (ok) => h("div", { class: "answer" }, h("span", null, "Správna odpoveď: ", h("b", null, u.odpoved)),
      u.trik ? h("span", { class: "trik" }, "Trik: " + u.trik) : null,
      u.typ_triku && P.TRIKY && P.TRIKY[u.typ_triku] ? h("span", { class: "trik" }, "Typ úlohy: " + P.TRIKY[u.typ_triku].n) : null,
      ok ? null : h("button", { class: "link-btn", type: "button", style: "margin-top:.3rem", onclick: () => { P.pokrok.oprav(u.id); fb.replaceChildren(h("div", { class: "try-ok" }, "✓ Zapísané ako správne."), riesenie(true)); } }, "Mal(a) som to správne, len som to zapísal(a) inak"));
    const skontroluj = () => {
      const v = P.porovnaj(inp.value, u.odpoved);
      if (v === null) { fb.replaceChildren(h("span", { class: "note" }, "Najprv napíš odpoveď.")); return; }
      P.pokrok.zapis(u.id, v);
      fb.replaceChildren(v ? h("div", { class: "try-ok" }, "✓ Správne!") : h("div", { class: "try-bad" }, "✗ Nie je to správne. Skús ešte raz, alebo si pozri riešenie."),
        v ? riesenie(true) : h("button", { class: "btn", type: "button", onclick: () => fb.append(riesenie(false)) }, "Ukázať riešenie"));
    };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") skontroluj(); });
    box.append(h("div", { class: "row" }, inp, h("button", { class: "btn primary", type: "button", onclick: skontroluj }, "Skontrolovať")), fb);
    return box;
  }

  let current = [];
  // po zaškrtnutí jednej úlohy aktualizovať políčko "vybrať všetkých" bez prekreslenia zoznamu
  function syncSelectAll() {
    const cb = document.getElementById("select-all"); if (!cb) return;
    const n = current.filter((u) => P.cart.has(u.id)).length;
    cb.checked = current.length > 0 && n === current.length; cb.indeterminate = n > 0 && n < current.length;
    const lbl = cb.parentElement.querySelector(".sel-n");
    if (lbl) lbl.textContent = n ? `(v liste ${n})` : "";
    else if (n) cb.parentElement.append(h("span", { class: "sel-n" }, `(v liste ${n})`));
  }
  function renderResults() {
    current = P.vsetky().filter((u) => matches(u)).sort(P.zoradit);
    const list = current.slice(0, state.shown);
    const vybrane = current.filter((u) => P.cart.has(u.id)).length;
    const vsetky = h("input", { type: "checkbox", id: "select-all", checked: current.length > 0 && vybrane === current.length, disabled: !current.length,
      onchange: (e) => { const ids = current.map((u) => u.id); e.target.checked ? P.cart.addMany(ids) : P.cart.removeMany(ids); renderResults(); } });
    vsetky.indeterminate = vybrane > 0 && vybrane < current.length;   // časť vybraná = pomlčka
    const toolbar = h("div", { class: "toolbar" },
      h("label", { class: "select-all", title: "Pridať (alebo odobrať) všetky zobrazené úlohy do pracovného listu" }, vsetky,
        h("span", null, `vybrať všetkých ${current.length}`), vybrane ? h("span", { class: "sel-n" }, `(v liste ${vybrane})`) : null),
      h("span", { class: "total", id: "total" }, `${current.length} úloh`),
      P.ZIAK ? null : h("label", null, h("input", { type: "checkbox", id: "show-ans", checked: state.showAns, onchange: (e) => { state.showAns = e.target.checked; renderResults(); } }), "ukázať odpovede"),
      h("label", null, h("input", { type: "checkbox", id: "show-trik", checked: state.showTrik, onchange: (e) => { state.showTrik = e.target.checked; renderResults(); } }), P.ZIAK ? "ukázať nápovedu (trik)" : "ukázať triky"),
      h("span", { class: "sp" }));
    const akt = aktivne();
    const filtre = h("div", { class: "active-filters" + (akt.length ? "" : " none") },
      h("span", { class: "af-lbl" }, akt.length ? "Aktívne filtre:" : "Bez filtra – zobrazené sú všetky úlohy."),
      akt.map((f) => h("button", { class: "af-chip", type: "button", title: "Zrušiť tento filter", onclick: f.x }, f.t, h("span", { class: "x", "aria-hidden": "true" }, "✕"))),
      akt.length > 1 ? h("button", { class: "link-btn", type: "button", onclick: zrusitVsetko }, "zrušiť všetky") : null);
    if (P.ZIAK) { renderZiak(filtre); return; }
    const body = list.length ? list.map(card) : [h("div", { class: "empty" }, "Žiadna úloha nezodpovedá filtrom. Skús zrušiť tému alebo vyhľadávaný výraz.")];
    P.fill(resultsEl, filtre, toolbar, ...body,
      current.length > list.length ? h("button", { class: "btn more", type: "button", id: "more", onclick: () => { state.shown += PAGE; renderResults(); } }, `Zobraziť ďalších ${Math.min(PAGE, current.length - list.length)} (zostáva ${current.length - list.length})`) : null);
  }

  // ---- žiak: "úloha za úlohou" alebo zoznam ----
  function vyberUlohu() {
    // najprv ešte neriešené, potom tie, čo nevyšli, inak hocijaká; náhodne
    const r = (u) => P.pokrok.get(u.id);
    const pool = [current.filter((u) => !r(u)), current.filter((u) => r(u) && !r(u).ok), current].find((a) => a.length) || [];
    const ina = pool.filter((u) => u.id !== state.jednaId);
    const z = ina.length ? ina : pool;
    return z.length ? z[Math.floor(Math.random() * z.length)].id : null;
  }
  function renderZiak(filtre) {
    const prepinac = h("div", { class: "chips mode-switch" },
      [["jedna", "Úloha za úlohou"], ["zoznam", "Zoznam úloh"]].map(([k, t]) =>
        h("button", { class: "chip", type: "button", "aria-pressed": state.rezim === k, onclick: () => { state.rezim = k; renderResults(); } }, t)));
    const pocet = h("span", { class: "total", id: "total" }, `${current.length} úloh`);
    const napoveda = h("label", null, h("input", { type: "checkbox", id: "show-trik", checked: state.showTrik, onchange: (e) => { state.showTrik = e.target.checked; renderResults(); } }), "ukázať nápovedu (trik)");
    if (!current.length) { P.fill(resultsEl, filtre, h("div", { class: "toolbar" }, prepinac, pocet), h("div", { class: "empty" }, "Žiadna úloha nezodpovedá filtrom. Skús zrušiť tému alebo vyhľadávaný výraz.")); return; }
    if (state.rezim === "jedna") {
      if (!state.jednaId || !current.some((u) => u.id === state.jednaId)) state.jednaId = vyberUlohu();
      const u = current.find((x) => x.id === state.jednaId);
      const ries = current.filter((x) => P.pokrok.get(x.id)).length, dobre = current.filter((x) => (P.pokrok.get(x.id) || {}).ok).length;
      const dalsia = () => { state.jednaId = vyberUlohu(); renderResults(); window.scrollTo({ top: 0 }); };
      P.fill(resultsEl, filtre, h("div", { class: "toolbar" }, prepinac, h("span", { class: "sp" }), napoveda),
        h("p", { class: "note" }, `Z ${current.length} úloh si skúšal(a) ${ries}, správne ${dobre}.`),
        card(u),
        h("div", { class: "row next-row" }, h("button", { class: "btn primary", type: "button", id: "dalsia", onclick: dalsia }, "Ďalšia úloha →")));
      return;
    }
    const list = current.slice(0, state.shown);
    P.fill(resultsEl, filtre, h("div", { class: "toolbar" }, prepinac, pocet, h("span", { class: "sp" }), napoveda), ...list.map(card),
      current.length > list.length ? h("button", { class: "btn more", type: "button", id: "more", onclick: () => { state.shown += PAGE; renderResults(); } }, `Zobraziť ďalších ${Math.min(PAGE, current.length - list.length)} (zostáva ${current.length - list.length})`) : null);
  }

  function renderCartBar() {
    const n = P.cart.ids.length;
    let bar = document.getElementById("cartbar");
    if (!bar) {
      bar = h("div", { class: "cartbar no-print", id: "cartbar" });
      document.body.append(bar);
    }
    bar.hidden = n === 0;
    bar.replaceChildren(
      h("span", null, h("b", { id: "cart-count" }, n), " úloh v pracovnom liste"),
      h("button", { class: "btn ghost", type: "button", onclick: () => { P.cart.clear(); renderResults(); } }, "Vyprázdniť"),
      h("button", { class: "btn primary", type: "button", id: "open-sheet", onclick: () => P.showTab("sheet") }, "Pracovný list →"));
  }

  function render() { state.shown = PAGE; renderRail(); renderResults(); }

  // Otvorí Databázu s predvolenými filtrami (volá sa z analýzy úloh).
  P.dbSetFilter = function (f) {
    state.kat.clear(); state.kolo.clear(); state.rok.clear(); state.okruh.clear(); state.tema.clear(); state.typ.clear(); state.q = "";
    if (f.typ_triku) state.typ.add(f.typ_triku);
    if (f.kat) state.kat.add(f.kat);
    state.showAns = true; state.showTrik = true;
    render(); P.showTab("db");
  };

  // žiak: predvolená kategória po prihlásení; "precvičiť znova" z Môjho pokroku
  P.dbSetKat = (k) => { state.kat.clear(); if (k) state.kat.add(k); render(); };
  P.dbLenChybne = () => { zrusitVsetko(); state.stav = "zle"; render(); P.showTab("db"); };

  P.initDb = function () {
    const panel = root();
    railEl = h("aside", { class: "rail no-print", "aria-label": "Filtre" });
    resultsEl = h("main", { class: "results" });
    panel.replaceChildren(h("div", { class: "db-layout" }, railEl, resultsEl));
    render();
    if (!P.ZIAK) renderCartBar();
    P.on("cart", () => { if (P.ZIAK) return; renderCartBar(); document.querySelectorAll("#panel-db .card").forEach((c) => {
      const sel = P.cart.has(c.dataset.id); c.classList.toggle("selected", sel);
      const cb = c.querySelector("input[type=checkbox]"); if (cb) cb.checked = sel; }); syncSelectAll(); });
    P.on("data", render);
  };
})();
