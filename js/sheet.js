/* Záložka "Pracovný list": poradie úloh, možnosti, náhľad, tlač, uložené listy. */
(function () {
  const P = window.PYT, h = P.h;
  const SPACE = { none: 0, s: 1.6, m: 3.4, l: 6 }; // rem

  const defaults = { nazov: "Pracovný list – Pytagoriáda", podnazov: "", polia: true, zdroj: true, miesto: "m", riesenia: "none", novaStrana: true, trik: false };
  let opts = Object.assign({}, defaults, P.store.getPrefs().sheet || {});
  const saveOpts = () => P.store.savePrefs(Object.assign({}, P.store.getPrefs(), { sheet: opts }));

  let controlsEl, previewEl;

  function sheetNode(items) {
    const head = h("div", { class: "sheet-head" },
      h("h1", null, opts.nazov || "Pracovný list"),
      opts.podnazov ? h("div", { class: "sub" }, opts.podnazov) : null,
      opts.polia ? h("div", { class: "fields" }, h("div", null, "Meno"), h("div", null, "Trieda"), h("div", null, "Dátum")) : null);

    const tasks = h("div", { class: "sheet-tasks" }, head, items.map((u, i) =>
      h("div", { class: "problem" },
        h("div", { class: "ph" }, h("span", { class: "no" }, (i + 1) + "."), h("span", { class: "txt" }, P.zadanieNode(u))),
        P.obrazkyNode(u),
        opts.zdroj ? h("div", { class: "src-line" }, P.popis(u)) : null,
        opts.miesto === "none" ? null : h("div", { class: "space", style: `height:${SPACE[opts.miesto] || SPACE.m}rem` }))));

    const wrap = h("div", { class: "sheet" }, tasks);
    if (opts.riesenia === "end" || document.body.dataset.print === "solutions") {
      wrap.append(h("div", { class: "sol-sec" + (opts.novaStrana ? " newpage" : "") },
        h("h2", null, "Riešenia – " + (opts.nazov || "pracovný list")),
        h("ol", { class: "sol-list", style: "list-style:none" }, items.map((u, i) =>
          h("li", null, h("span", { class: "no" }, (i + 1) + "."), u.odpoved ? u.odpoved : "— (odpoveď chýba v databáze)",
            opts.trik && u.trik ? h("span", { class: "tr" }, "Trik: " + u.trik) : null)))));
    }
    return wrap;
  }

  function printMode(mode) {
    if (mode) document.body.dataset.print = mode; else delete document.body.dataset.print;
    renderPreview();
    window.print();
  }
  window.addEventListener("afterprint", () => { if (document.body.dataset.print) { delete document.body.dataset.print; renderPreview(); } });

  function renderPreview() {
    const items = P.cart.items();
    previewEl.replaceChildren(items.length
      ? sheetNode(items)
      : h("div", { class: "empty" }, "Zatiaľ nie sú vybraté žiadne úlohy. V záložke Databáza zaškrtni úlohy, ktoré chceš dať na list."));
  }

  function field(label, input) { return h("div", { class: "field" }, h("label", null, label), input); }
  function checkbox(label, key, id) {
    return h("label", { class: "check-row" }, h("input", { type: "checkbox", id, checked: !!opts[key], onchange: (e) => { opts[key] = e.target.checked; saveOpts(); renderPreview(); renderControls(); } }), h("span", null, label));
  }
  function radio(name, val, label, key) {
    return h("label", null, h("input", { type: "radio", name, value: val, checked: opts[key] === val, onchange: () => { opts[key] = val; saveOpts(); renderPreview(); renderControls(); } }), h("span", null, label));
  }

  function renderControls() {
    const items = P.cart.items();
    controlsEl.replaceChildren(
      h("div", { class: "box" },
        h("h3", null, `Úlohy na liste (${items.length})`),
        items.length ? h("ol", { class: "cart-list", style: "list-style:none" }, items.map((u, i) =>
          h("li", null,
            h("span", { class: "m" }, (i + 1) + "."),
            h("span", { class: "t", title: u.zadanie }, `${u.kategoria} ${P.rokKratko(u.rok)} ${u.kolo.slice(0, 3)}. – ${u.zadanie}`),
            h("span", null,
              h("button", { class: "mini", type: "button", title: "Posunúť vyššie", "aria-label": "Posunúť vyššie", onclick: () => P.cart.move(u.id, -1) }, "↑"),
              h("button", { class: "mini", type: "button", title: "Posunúť nižšie", "aria-label": "Posunúť nižšie", onclick: () => P.cart.move(u.id, 1) }, "↓"),
              h("button", { class: "mini", type: "button", title: "Odstrániť", "aria-label": "Odstrániť z listu", onclick: () => P.cart.remove(u.id) }, "✕"))))) : h("p", { class: "note" }, "Prázdne."),
        (() => { const n = items.filter(P.chybaObrazok).length;
          return n ? h("p", { class: "note warn", id: "img-warn", style: "margin-top:.6rem" }, `${n} ${n === 1 ? "úloha má" : n < 5 ? "úlohy majú" : "úloh má"} v origináli obrázok, ktorý v liste nie je – skontroluj podľa PDF originálu.`) : null; })(),
        h("div", { class: "row", style: "margin-top:.7rem" },
          h("button", { class: "btn", type: "button", id: "cart-shuffle", disabled: items.length < 2, onclick: () => { P.cart.ids.sort(() => Math.random() - .5); P.cart._save(); } }, "Premiešať"),
          h("button", { class: "btn danger", type: "button", disabled: !items.length, onclick: () => P.cart.clear() }, "Vyprázdniť"))),
      h("div", { class: "box" },
        h("h3", null, "Vzhľad listu"),
        field("Nadpis", h("input", { class: "input", id: "opt-nazov", value: opts.nazov, oninput: (e) => { opts.nazov = e.target.value; saveOpts(); renderPreview(); } })),
        field("Podnadpis (voliteľný)", h("input", { class: "input", id: "opt-podnazov", value: opts.podnazov, placeholder: "napr. Sekunda B · príprava na okresné kolo", oninput: (e) => { opts.podnazov = e.target.value; saveOpts(); renderPreview(); } })),
        checkbox("riadok Meno / Trieda / Dátum", "polia", "opt-polia"),
        checkbox("pri úlohe uviesť zdroj (rok, kolo)", "zdroj", "opt-zdroj"),
        h("div", { class: "field", style: "margin-top:.6rem" }, h("label", null, "Miesto na riešenie"),
          h("div", { class: "seg" }, radio("miesto", "none", "žiadne", "miesto"), radio("miesto", "s", "malé", "miesto"), radio("miesto", "m", "stredné", "miesto"), radio("miesto", "l", "veľké", "miesto")))),
      h("div", { class: "box" },
        h("h3", null, "Riešenia"),
        h("div", { class: "seg" },
          radio("riesenia", "none", "bez riešení na liste", "riesenia"),
          radio("riesenia", "end", "riešenia na konci listu", "riesenia")),
        opts.riesenia === "end" ? checkbox("riešenia na novej strane (dá sa odtrhnúť)", "novaStrana", "opt-nova") : null,
        checkbox("pridať aj trik k riešeniu", "trik", "opt-trik"),
        h("p", { class: "note", style: "margin-top:.5rem" }, "Riešenia pre seba môžeš vytlačiť samostatne – žiakom pošleš len list.")),
      h("div", { class: "box" },
        h("div", { class: "row" },
          h("button", { class: "btn primary", type: "button", id: "print-sheet", disabled: !items.length, onclick: () => printMode(null) }, "Tlačiť list"),
          h("button", { class: "btn", type: "button", id: "print-sol", disabled: !items.length, onclick: () => printMode("solutions") }, "Tlačiť len riešenia")),
        h("p", { class: "note" }, "V tlačovom okne vyber „Uložiť ako PDF“, ak chceš súbor.")),
      savedBox(items));
  }

  function savedBox(items) {
    const saved = P.store.getSheets();
    let nameInput;
    return h("div", { class: "box" },
      h("h3", null, "Uložené listy"),
      h("div", { class: "row" },
        nameInput = h("input", { class: "input", id: "save-name", style: "flex:1", placeholder: "názov uloženého listu", value: opts.nazov }),
        h("button", { class: "btn", type: "button", id: "save-sheet", disabled: !items.length, onclick: () => {
          const name = (nameInput.value || opts.nazov || "List").trim();
          const list = P.store.getSheets().filter((s) => s.nazov !== name);
          list.unshift({ id: "L-" + Date.now(), nazov: name, ids: P.cart.ids.slice(), opts: Object.assign({}, opts), ts: Date.now() });
          P.store.saveSheets(list); renderControls();
        } }, "Uložiť")),
      saved.length ? h("ul", { class: "saved-list", style: "margin-top:.6rem" }, saved.map((s) =>
        h("li", null,
          h("span", { class: "nm", title: s.nazov }, `${s.nazov} (${s.ids.length})`),
          h("button", { class: "btn", type: "button", onclick: () => { P.cart.ids = s.ids.slice(); opts = Object.assign({}, defaults, s.opts); saveOpts(); P.cart._save(); } }, "Otvoriť"),
          h("button", { class: "mini", type: "button", "aria-label": "Zmazať uložený list", onclick: () => { P.store.saveSheets(P.store.getSheets().filter((x) => x.id !== s.id)); renderControls(); } }, "✕")))) : h("p", { class: "note", style: "margin-top:.5rem" }, "Zatiaľ žiadne."));
  }

  P.initSheet = function () {
    controlsEl = h("div", { class: "controls no-print" });
    previewEl = h("div", { class: "sheet-wrap", id: "sheet-preview" });
    document.getElementById("panel-sheet").replaceChildren(h("div", { class: "sheet-layout" }, controlsEl, previewEl));
    renderControls(); renderPreview();
    P.on("cart", () => { renderControls(); renderPreview(); });
    P.on("data", () => { renderControls(); renderPreview(); });
  };
})();
