/* Žiacka verzia – záložka "Súťaž na skúšku": celé kolo z minulého roka s odpočítavaním času.
   Body: 1 bod za každú správnu úlohu; body za čas: za každé ušetrené 4 minúty 1 bod (pravidlo podľa učiteľky).
   Body za čas sa dávajú len pri dostatočnom počte bodov za úlohy (PRAH_CAS). Čas na riešenie 60 minút (podľa učiteľky).
   Pri celoštátnom kole sa výsledok porovná s bodmi zo skutočnej výsledkovej listiny (P.HRANICE – bez mien). */
(function () {
  const P = window.PYT, h = P.h;
  if (!P.ZIAK) return;

  // ČAS NA RIEŠENIE (minúty) – podľa pravidiel Pytagoriády; uprav, ak treba
  const LIMIT_MIN = { "školské": 60, "okresné": 60, "celoštátne": 60 };
  const MIN_ZA_BOD = 4;                 // za každé ušetrené 4 minúty 1 bod
  // body za čas len pri aspoň toľkých bodoch za úlohy: školské a okresné „viac ako 10“ (podľa učiteľky),
  // celoštátne 12 (podľa výsledkových listín: „Podmienkou získania bodov za čas bolo získanie min. 12 bodov za úlohy.“)
  const PRAH_CAS = { "školské": 11, "okresné": 11, "celoštátne": 12 };

  // hranica postupu zo školského do okresného kola (body spolu, vrátane bodov za čas) – podľa učiteľky, šk. rok 2025/2026
  const POSTUP_OK = { rok: "2025/2026", "P6": 20, "P7": 20, "P8": 19 };

  let host, timer = null, volba = { kat: null, kolo: "školské", rok: "nahodny" };
  const kluc = () => "sutaz." + (P.profil() ? P.profil().k : "-");
  const histKluc = () => "sutaze." + (P.profil() ? P.profil().k : "-");
  const aktivna = () => P.store.read(kluc(), null);
  const ulozAktivnu = (s) => P.store.write(kluc(), s);

  // kolá, ktoré sa dajú použiť: všetky úlohy (okrem najviac jednej) majú odpoveď v kľúči
  function kola(kat, kolo) {
    const m = new Map();
    P.ULOHY.filter((u) => u.kategoria === kat && u.kolo === kolo).forEach((u) => m.set(u.rok, (m.get(u.rok) || []).concat(u)));
    return [...m.entries()].filter(([, a]) => a.length >= 10 && a.filter((u) => !u.odpoved).length <= 1)
      .map(([rok, a]) => ({ rok, ulohy: a.sort((x, y) => (x.cislo_ulohy || 0) - (y.cislo_ulohy || 0)) }))
      .sort((a, b) => (a.rok < b.rok ? 1 : -1));
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  function zacni() {
    const k = kola(volba.kat, volba.kolo);
    if (!k.length) return;
    const vyber = volba.rok === "nahodny" ? k[Math.floor(Math.random() * k.length)] : k.find((x) => x.rok === volba.rok) || k[0];
    ulozAktivnu({ kat: volba.kat, kolo: volba.kolo, rok: vyber.rok, ids: vyber.ulohy.map((u) => u.id), start: Date.now(), limit: LIMIT_MIN[volba.kolo] * 60, odp: {} });
    render(); window.scrollTo(0, 0);
  }

  function odovzdaj() {
    const s = aktivna(); if (!s) return;
    const koniec = Math.min(Date.now(), s.start + s.limit * 1000);
    const trvanie = Math.round((koniec - s.start) / 1000);
    const ul = new Map(P.ULOHY.map((u) => [u.id, u]));
    const riadky = s.ids.map((id) => {
      const u = ul.get(id), o = (s.odp[id] || "").trim();
      const ok = u.odpoved ? (o ? !!P.porovnaj(o, u.odpoved) : false) : null;
      if (o && ok !== null) P.pokrok.zapis(id, ok);
      return { id, o, ok };
    });
    const bodyUlohy = riadky.filter((r) => r.ok).length;
    const usetrene = Math.max(0, s.limit - trvanie);
    const prah = PRAH_CAS[s.kolo] || 0;
    const bodyCas = bodyUlohy >= prah ? Math.floor(usetrene / 60 / MIN_ZA_BOD) : 0;
    const vysledok = { kat: s.kat, kolo: s.kolo, rok: s.rok, t: Date.now(), trvanie, bodyUlohy, bodyCas, spolu: bodyUlohy + bodyCas,
      max: riadky.filter((r) => r.ok !== null).length, riadky, prah, usetrene };
    const hist = P.store.read(histKluc(), []); hist.unshift(vysledok); P.store.write(histKluc(), hist.slice(0, 50));
    ulozAktivnu(null); P.emit("pokrok");
    render(vysledok); window.scrollTo(0, 0);
  }

  function nastavenie() {
    if (!volba.kat) volba.kat = (P.profil() || {}).kat || "P6";
    const k = kola(volba.kat, volba.kolo);
    if (volba.rok !== "nahodny" && !k.some((x) => x.rok === volba.rok)) volba.rok = "nahodny";
    const pocet = k.length ? k[0].ulohy.length : 0;
    const chips = (vals, cur, set, lbl) => h("div", { class: "chips" }, vals.map((v) => h("button", { class: "chip", type: "button", "aria-pressed": cur === v, onclick: () => { set(v); render(); } }, lbl ? lbl(v) : v)));
    return h("div", { class: "page narrow" },
      h("h2", null, "Súťaž na skúšku"),
      h("p", { class: "lead" }, "Vyrieš celé kolo Pytagoriády z niektorého minulého roka – ako na skutočnej súťaži. Odpovede uvidíš až na konci."),
      h("div", { class: "box sutaz-setup" },
        h("div", { class: "field" }, h("label", null, "Kategória"), chips(P.KATEGORIE, volba.kat, (v) => (volba.kat = v))),
        h("div", { class: "field" }, h("label", null, "Kolo"), chips(P.KOLA, volba.kolo, (v) => (volba.kolo = v), (v) => v + " kolo")),
        h("div", { class: "field" }, h("label", { for: "s-rok" }, "Ktorý rok"),
          h("select", { class: "input", id: "s-rok", style: "width:auto", onchange: (e) => (volba.rok = e.target.value) },
            h("option", { value: "nahodny", selected: volba.rok === "nahodny" }, "náhodný"),
            k.map((x) => h("option", { value: x.rok, selected: volba.rok === x.rok }, x.rok)))),
        h("ul", { class: "pravidla" },
          h("li", null, `${pocet || "–"} úloh, čas ${LIMIT_MIN[volba.kolo]} minút.`),
          h("li", null, "Za každú správnu úlohu 1 bod."),
          h("li", null, `Za každé ušetrené ${MIN_ZA_BOD} minúty 1 bod navyše` + (PRAH_CAS[volba.kolo] ? ` (len ak máš aspoň ${PRAH_CAS[volba.kolo]} bodov za úlohy).` : ".")),
          volba.kolo === "školské" && POSTUP_OK[volba.kat] ? h("li", null, `Do okresného kola sa v roku ${POSTUP_OK.rok} postupovalo s ${POSTUP_OK[volba.kat]} bodmi (spolu za úlohy aj čas).`) : null,
          h("li", null, "Keď si hotový/hotová, klikni „Odovzdať“. Po uplynutí času sa test odovzdá sám.")),
        k.length ? h("button", { class: "btn primary", type: "button", id: "s-start", onclick: zacni }, "Začať súťaž") : h("p", { class: "note warn" }, "Pre túto kategóriu a kolo nemáme celé kolo s odpoveďami.")));
  }

  function beh(s) {
    const ul = new Map(P.ULOHY.map((u) => [u.id, u]));
    const hodiny = h("span", { class: "odpocet mono", id: "odpocet" });
    const tik = () => {
      const zostava = Math.round((s.start + s.limit * 1000 - Date.now()) / 1000);
      if (zostava <= 0) { odovzdaj(); return; }
      hodiny.textContent = "⏱ " + mmss(zostava); hodiny.classList.toggle("malo", zostava <= 300);
    };
    clearInterval(timer); timer = setInterval(() => (hodiny.isConnected ? tik() : clearInterval(timer)), 1000); tik();
    return h("div", { class: "page narrow" },
      h("div", { class: "sutaz-bar" }, h("span", null, h("b", null, `${s.kat} · ${s.kolo} kolo`), ` · ${s.rok}`), hodiny,
        h("button", { class: "btn primary", type: "button", id: "s-odovzdat", onclick: () => { if (confirm("Naozaj odovzdať? Odpovede už nebude možné zmeniť.")) odovzdaj(); } }, "Odovzdať")),
      s.ids.map((id, i) => {
        const u = ul.get(id);
        return h("div", { class: "card solo sutaz-uloha" }, h("div", null,
          h("div", { class: "meta" }, h("span", { class: "badge cat" }, `${i + 1}.`)),
          h("div", { class: "zadanie" }, P.zadanieNode(u)), P.obrazkyNode(u),
          h("div", { class: "try" }, h("input", { class: "input", type: "text", placeholder: "odpoveď", autocomplete: "off", "aria-label": `Odpoveď na úlohu ${i + 1}`, value: s.odp[id] || "",
            oninput: (e) => { const a = aktivna(); if (a) { a.odp[id] = e.target.value; ulozAktivnu(a); } } }))));
      }),
      h("div", { class: "row next-row" }, h("button", { class: "btn primary", type: "button", onclick: () => { if (confirm("Naozaj odovzdať?")) odovzdaj(); } }, "Odovzdať")));
  }

  function postup(v) {
    const hr = POSTUP_OK[v.kat];
    if (v.kolo !== "školské" || !hr) return null;
    const ok = v.spolu >= hr;
    return h("p", { class: "note " + (ok ? "good-note" : "warn") },
      ok ? `S ${v.spolu} bodmi by si postúpil(a) do okresného kola – hranica v roku ${POSTUP_OK.rok} bola ${hr} bodov.`
         : `Na postup do okresného kola by ti chýbali ${hr - v.spolu} ${hr - v.spolu === 1 ? "bod" : hr - v.spolu < 5 ? "body" : "bodov"} – hranica v roku ${POSTUP_OK.rok} bola ${hr} bodov.`);
  }

  function umiestnenie(v) {
    const zoznam = (P.HRANICE || {})[v.rok + "|" + v.kat];
    if (v.kolo !== "celoštátne" || !zoznam) return null;
    const miesto = zoznam.filter((b) => b > v.spolu).length + 1;
    return h("p", { class: "note good-note" }, `V skutočnom celoštátnom kole ${v.rok} (${v.kat}) by si s ${v.spolu} bodmi skončil(a) na ${miesto}. mieste z ${zoznam.length + 1}.`);
  }

  function vysledky(v) {
    const ul = new Map(P.ULOHY.map((u) => [u.id, u]));
    return h("div", { class: "page narrow" },
      h("h2", null, "Výsledok súťaže"),
      h("p", { class: "lead" }, `${v.kat} · ${v.kolo} kolo · ${v.rok}`),
      h("div", { class: "tiles" },
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Body za úlohy"), h("div", { class: "tv mono" }, `${v.bodyUlohy} / ${v.max}`)),
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Čas"), h("div", { class: "tv mono" }, mmss(v.trvanie)), h("div", { class: "ts" }, `ušetril(a) si ${Math.floor(v.usetrene / 60)} min`)),
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Body za čas"), h("div", { class: "tv mono" }, v.bodyCas),
          v.prah && v.bodyUlohy < v.prah ? h("div", { class: "ts" }, `body za čas sú od ${v.prah} bodov za úlohy`) : null),
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Spolu"), h("div", { class: "tv mono" }, v.spolu))),
      umiestnenie(v), postup(v),
      h("h3", { class: "sec" }, "Úlohy"),
      v.riadky.map((r, i) => {
        const u = ul.get(r.id);
        return h("div", { class: "card solo" }, h("div", null,
          h("div", { class: "meta" }, h("span", { class: "badge cat" }, `${i + 1}.`),
            r.ok === null ? h("span", { class: "badge" }, "bez odpovede v kľúči") : h("span", { class: "badge " + (r.ok ? "own" : "warn") }, r.ok ? "✓ správne" : r.o ? "✗ nesprávne" : "– nevyplnené")),
          h("div", { class: "zadanie" }, P.zadanieNode(u)), P.obrazkyNode(u),
          h("div", { class: "answer" }, h("span", null, "Tvoja odpoveď: ", h("b", null, r.o || "–")), h("br"),
            h("span", null, "Správna odpoveď: ", h("b", null, u.odpoved || "–")), u.trik ? h("span", { class: "trik" }, "Trik: " + u.trik) : null)));
      }),
      h("div", { class: "row next-row" }, h("button", { class: "btn primary", type: "button", onclick: () => render() }, "Nová súťaž")));
  }

  // história do Môjho pokroku
  P.sutazHistoria = function () {
    const hist = P.store.read(histKluc(), []);
    if (!hist.length) return null;
    return h("div", null, h("h3", { class: "sec" }, "Súťaže na skúšku"),
      h("div", { class: "table-wrap" }, h("table", { class: "cov" },
        h("thead", null, h("tr", null, ["Dátum", "Kolo", "Za úlohy", "Za čas", "Spolu", "Čas"].map((c) => h("th", null, c)))),
        h("tbody", null, hist.map((v) => h("tr", null, h("td", null, new Date(v.t).toLocaleDateString("sk")), h("td", null, `${v.kat} ${v.kolo.slice(0, 3)}. ${P.rokKratko(v.rok)}`),
          h("td", null, `${v.bodyUlohy}/${v.max}`), h("td", null, v.bodyCas), h("td", { class: "strong" }, v.spolu), h("td", null, mmss(v.trvanie))))))));
  };

  function render(vysledok) {
    if (!host) return;
    clearInterval(timer);
    const s = aktivna();
    P.fill(host, vysledok ? vysledky(vysledok) : s ? beh(s) : nastavenie());
  }

  P.registerTab({ id: "sutaz", label: "Súťaž na skúšku", init: () => { host = document.getElementById("panel-sutaz"); render(); } });
  P.on("profil", () => { volba.kat = null; render(); });
})();
