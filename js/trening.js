/* Záložka "Uhádni trik": tréning rozpoznávania typu úlohy. Žiak vidí zadanie, vyberie typ triku, potom vidí vysvetlenie. */
(function () {
  const P = window.PYT, h = P.h;
  let host, cur = null, opts = [], answered = null, score = { ok: 0, n: 0 }, kat = null;

  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function next() {
    const pool = P.ULOHY.filter((u) => u.typ_triku && u.typ_triku !== "iny" && P.TRIKY[u.typ_triku] && u.odpoved && u.zadanie.length < 300
      && u.tema !== "geometria_obrazok" && (!kat || u.kategoria === kat));
    cur = pool[Math.floor(Math.random() * pool.length)];
    const others = shuffle(Object.keys(P.TRIKY).filter((k) => k !== "iny" && k !== cur.typ_triku)).slice(0, 3);
    opts = shuffle([cur.typ_triku, ...others]); answered = null; render();
  }

  function pick(id) { if (answered) return; answered = id; score.n++; if (id === cur.typ_triku) score.ok++; render(); }

  function render() {
    if (!cur) { next(); return; }
    const t = P.TRIKY[cur.typ_triku];
    host.replaceChildren(h("div", { class: "page narrow" },
      h("h2", null, "Uhádni trik"),
      h("p", { class: "lead" }, "Prečítaj si úlohu a vyber, aký trik ju najrýchlejšie rieši. Hneď uvidíš, či si trafila/trafil, a postup."),
      h("div", { class: "chips", style: "margin-bottom:1rem" }, [null, ...P.KATEGORIE].map((k) =>
        h("button", { class: "chip", type: "button", "aria-pressed": kat === k, onclick: () => { kat = k; cur = null; render(); } }, k || "všetky kategórie"))),
      h("div", { class: "quiz-card" },
        h("div", { class: "meta" }, h("span", { class: "badge cat" }, cur.kategoria), h("span", { class: "badge" }, cur.rok), h("span", { class: "badge" }, cur.kolo + " kolo")),
        h("div", { class: "zadanie", id: "quiz-q" }, P.zadanieNode(cur)), P.obrazkyNode(cur)),
      h("div", { class: "quiz-opts" }, opts.map((id) => {
        const cls = answered ? (id === cur.typ_triku ? "right" : id === answered ? "wrong" : "") : "";
        return h("button", { class: "btn quiz-opt " + cls, type: "button", "data-opt": id, disabled: !!answered, onclick: () => pick(id) }, P.TRIKY[id].n);
      })),
      answered ? h("div", { class: "quiz-fb", id: "quiz-fb" },
        h("p", null, h("b", null, answered === cur.typ_triku ? "Správne. " : "Nie celkom. "), "Typ: ", h("b", null, t.n), "."),
        h("p", null, "Odpoveď: ", h("b", null, cur.odpoved)),
        cur.trik ? h("p", null, h("b", null, "Trik v tejto úlohe: "), cur.trik) : null,
        t.postup && t.postup.length ? h("ol", null, t.postup.map((x) => h("li", null, x))) : null,
        h("button", { class: "btn primary", type: "button", id: "quiz-next", onclick: next }, "Ďalšia úloha →")) : null,
      h("p", { class: "note mono" }, `Skóre: ${score.ok} / ${score.n}`)));
  }

  P.initTrening = function () { host = document.getElementById("panel-trening"); next(); };
  P.registerTab({ id: "trening", label: "Uhádni trik", init: () => P.initTrening() });
})();
