/* Žiacka verzia (zverejnená na GitHube): heslo pre triedu, profil žiaka, kontrola odpovedí, pokrok.
   Zapína sa v index.html cez window.PYT_ZIAK = true (robí scripts/priprav_web.py).
   Všetko sa ukladá len v prehliadači žiaka (localStorage) – nikam sa nič neposiela. */
(function () {
  const P = window.PYT, h = P.h;
  P.ZIAK = !!window.PYT_ZIAK;
  if (!P.ZIAK) return;

  // ---------- heslo pre triedu ----------
  // Nie je to skutočná ochrana (stránka je verejná), len aby sa k úlohám nedostal hocikto náhodný.
  const fnv = (s) => { let x = 0x811c9dc5; for (const c of s) { x ^= c.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16); };
  const hesloHash = (s) => fnv("pyt|" + P.norm(String(s || "").trim()));   // bez ohľadu na veľké písmená a diakritiku
  // viac hesiel (napr. pre dve triedy): window.PYT_HESLO je zoznam odtlačkov
  const HESLA = [].concat(window.PYT_HESLO || []).filter(Boolean);
  const hesloOk = () => !HESLA.length || HESLA.includes(P.store.read("heslo", ""));

  // ---------- profily (viac žiakov môže používať ten istý počítač) ----------
  const profilKluc = (meno) => P.norm(meno).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  P.profil = () => P.store.read("ziak", null);
  const ulozProfil = (p) => P.store.write("ziak", p);

  // ---------- pokrok ----------
  const pkKey = () => "pokrok." + (P.profil() ? P.profil().k : "-");
  P.trvanie = (s) => (s == null ? "–" : s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`);
  P.pokrok = {
    vsetko: () => P.store.read(pkKey(), {}),
    get: (id) => P.pokrok.vsetko()[id] || null,
    // ok: true/false; pokusy sa počítajú, "správne" ostane, keď to žiak raz vyriešil
    zapis(id, ok, sek) {
      const all = P.pokrok.vsetko(), r = all[id] || { pokusy: 0, ok: false };
      r.pokusy++; r.posledne = ok; r.t = Date.now();
      if (sek != null) r.cas = sek;
      if (ok && !r.ok && sek != null) r.casOk = sek;   // čas, za ktorý to žiak prvýkrát vyriešil
      r.ok = r.ok || ok;
      all[id] = r; P.store.write(pkKey(), all); P.emit("pokrok", id);
    },
    oprav(id) {   // "mal(a) som to správne, len iný zápis"
      const all = P.pokrok.vsetko(); if (!all[id]) return;
      all[id].ok = true; all[id].posledne = true; P.store.write(pkKey(), all); P.emit("pokrok", id);
    },
    zmaz() { P.store.write(pkKey(), {}); P.emit("pokrok"); },
  };

  // ---------- porovnanie odpovede s kľúčom ----------
  // Odpovede v kľúči majú rôzny tvar: "2 011", "3,07", "169/120", "– 2,5", "55°50´", "24 kg", "D", "o 44 %".
  function zaklad(s) {
    return String(s || "").toLowerCase()
      .replace(/[–—−]/g, "-")            // pomlčky a matematické mínus -> "-"
      .replace(/[´ʹ’′`]/g, "'")
      .replace(/^o\s+/, "")                             // "o 44 %" -> "44 %"
      .replace(/=\s*$/, "").trim();
  }
  function hodnota(s) {                                 // číslo (aj zmiešané a zlomok), ak sa dá; inak null
    let t = zaklad(s);
    const zm = /^(-?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)/.exec(t);      // 32 2/5
    if (zm) return { v: (zm[1] ? -1 : 1) * (+zm[2] + zm[3] / zm[4]), zlomok: true, p: +zm[3], q: +zm[4] };
    t = t.replace(/(\d)[\s  ]+(?=\d{3}(\D|$))/g, "$1");  // medzery v tisícoch
    t = t.replace(/\s+/g, "");
    const fr = /^(-?\d+)\/(\d+)/.exec(t);
    if (fr) return { v: fr[1] / fr[2], zlomok: true, p: Math.abs(+fr[1]), q: +fr[2] };
    const n = /^-?\d+(?:[.,]\d+)?/.exec(t);
    if (n && !/^-?\d+(?:[.,]\d+)?°\d/.test(t) && !/^\d+:\d/.test(t)) return { v: +n[0].replace(",", ".") };
    return null;
  }
  const nsd = (a, b) => (b ? nsd(b, a % b) : a);
  P.porovnaj = function (ziak, kluc) {
    if (!kluc) return null;
    const a = zaklad(ziak).replace(/\s+/g, "").replace(/,/g, "."), b = zaklad(kluc).replace(/\s+/g, "").replace(/,/g, ".");
    if (!a) return null;
    if (a === b || a.replace(/'$/, "") === b.replace(/'$/, "")) return true;
    const x = hodnota(ziak), y = hodnota(kluc);
    if (x && y) {
      if (Math.abs(x.v - y.v) > 1e-9) return false;
      if (y.zlomok) return !!x.zlomok && nsd(x.p, x.q) === 1;   // pri zlomku sa čaká zlomok v základnom tvare
      return true;
    }
    return false;
  };

  // ---------- okno s prihlásením ----------
  function prihlasenie() {
    const stary = P.profil();
    let chyba = "";
    const o = h("div", { class: "login-wrap", id: "login" });
    function kresli() {
      const heslo = h("input", { class: "input", type: "password", id: "l-heslo", autocomplete: "off", placeholder: "heslo od pani učiteľky" });
      const meno = h("input", { class: "input", id: "l-meno", maxlength: "30", placeholder: "napr. Jano K. alebo prezývka", value: stary ? stary.meno : "" });
      let kat = stary ? stary.kat : "P6";
      const katBtns = h("div", { class: "chips" }, P.KATEGORIE.map((k) => h("button", { class: "chip", type: "button", "aria-pressed": kat === k, onclick: (e) => { kat = k; katBtns.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", b.textContent === k)); } }, k)));
      const potvrd = () => {
        if (HESLA.length && !hesloOk()) {
          const hh = hesloHash(heslo.value);
          if (!HESLA.includes(hh)) { chyba = "Heslo nie je správne."; kresli(); return; }
          P.store.write("heslo", hh);
        }
        const m = meno.value.trim();
        if (!m) { chyba = "Napíš svoje meno alebo prezývku."; kresli(); return; }
        ulozProfil({ meno: m, k: profilKluc(m) || "ziak", kat });
        o.remove(); document.body.classList.remove("locked");
        P.emit("profil"); if (P.dbSetKat) P.dbSetKat(kat);
      };
      o.replaceChildren(h("form", { class: "login box", onsubmit: (e) => { e.preventDefault(); potvrd(); } },
        h("h2", null, "Tréning na Pytagoriádu"),
        h("p", { class: "note" }, "Úlohy z minulých ročníkov Pytagoriády (P6–P8). Rieš, kontroluj si odpovede a sleduj svoj pokrok."),
        HESLA.length && !hesloOk() ? h("div", { class: "field" }, h("label", { for: "l-heslo" }, "Heslo triedy"), heslo) : null,
        h("div", { class: "field" }, h("label", { for: "l-meno" }, "Ako sa voláš?"), meno),
        h("div", { class: "field" }, h("label", null, "Tvoja kategória"), katBtns),
        chyba ? h("p", { class: "note warn", role: "alert" }, chyba) : null,
        h("button", { class: "btn primary", type: "submit", id: "l-ok" }, "Začať"),
        h("p", { class: "note small" }, "Tvoje meno a výsledky sa ukladajú len v tomto prehliadači, nikam sa neposielajú.")));
      setTimeout(() => (HESLA.length && !hesloOk() ? heslo : meno).focus(), 0);
    }
    kresli();
    document.body.classList.add("locked");
    document.body.append(o);
  }
  // odhlásenie zabudne meno aj heslo – ďalší človek na tom istom počítači musí zadať heslo znova
  P.odhlasit = () => { P.store.write("ziak", null); P.store.write("heslo", ""); prihlasenie(); };

  // ---------- hlavička: kto je prihlásený ----------
  function hlavicka() {
    let el = document.getElementById("ziak-chip");
    if (!el) {
      el = h("div", { class: "ziak-chip", id: "ziak-chip" });
      const btn = document.getElementById("theme-btn"); btn.parentNode.insertBefore(el, btn);
    }
    const p = P.profil();
    el.replaceChildren(p ? h("span", null, "👤 ", h("b", null, p.meno), ` · ${p.kat}`) : "",
      p ? h("button", { class: "link-btn", type: "button", onclick: P.odhlasit, title: "Prepnúť na iného žiaka" }, "odhlásiť") : "");
  }

  // ---------- záložka Môj pokrok ----------
  let pokrokHost;
  function renderPokrok() {
    if (!pokrokHost) return;
    const p = P.profil(), all = P.pokrok.vsetko(), ul = new Map(P.ULOHY.map((u) => [u.id, u]));
    const zaz = Object.entries(all).filter(([id]) => ul.has(id)).map(([id, r]) => Object.assign({ u: ul.get(id) }, r));
    const ok = zaz.filter((r) => r.ok).length, zle = zaz.filter((r) => !r.ok);
    const priemer = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null);
    const casy = zaz.map((r) => r.casOk).filter((x) => x != null);
    const podla = (f, nazov) => {
      const m = new Map(); zaz.forEach((r) => { const k = f(r.u); const e = m.get(k) || { n: 0, ok: 0, cas: [] }; e.n++; if (r.ok) e.ok++; if (r.casOk != null) e.cas.push(r.casOk); m.set(k, e); });
      return h("div", { class: "table-wrap" }, h("table", { class: "cov" }, h("thead", null, h("tr", null, h("th", null, nazov), h("th", null, "Skúšal(a)"), h("th", null, "Správne"), h("th", null, "Úspešnosť"), h("th", null, "Priem. čas"))),
        h("tbody", null, [...m.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, e]) => h("tr", null, h("td", null, k), h("td", null, e.n), h("td", null, e.ok),
          h("td", { class: "shade", style: `--p:${Math.round((e.ok / e.n) * 55)}%` }, Math.round((100 * e.ok) / e.n) + " %"),
          h("td", null, P.trvanie(priemer(e.cas))))))));
    };
    pokrokHost.replaceChildren(h("div", { class: "page" },
      h("h2", null, `Môj pokrok${p ? " – " + p.meno : ""}`),
      h("p", { class: "lead" }, "V záložke Trénovať napíš pri úlohe svoju odpoveď a klikni „Skontrolovať“. Tu uvidíš, ako sa ti darí a ako rýchlo riešiš."),
      h("div", { class: "tiles" },
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Skúšané úlohy"), h("div", { class: "tv mono" }, zaz.length)),
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Vyriešené správne"), h("div", { class: "tv mono" }, ok)),
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Úspešnosť"), h("div", { class: "tv mono" }, zaz.length ? Math.round((100 * ok) / zaz.length) + " %" : "–")),
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Treba zopakovať"), h("div", { class: "tv mono" }, zle.length)),
        h("div", { class: "tile" }, h("div", { class: "tl" }, "Priemerný čas na správnu úlohu"), h("div", { class: "tv mono" }, P.trvanie(priemer(casy))))),
      P.sutazHistoria ? P.sutazHistoria() : null,
      zaz.length ? [
        h("h3", { class: "sec" }, "Podľa témy"), podla((u) => P.temaNazov(u.tema), "Téma"),
        h("h3", { class: "sec" }, "Podľa typu triku"), podla((u) => (P.TRIKY[u.typ_triku] || { n: "–" }).n, "Typ triku"),
        zle.length ? h("div", { class: "row", style: "margin-top:1rem" }, h("button", { class: "btn primary", type: "button", onclick: () => P.dbLenChybne && P.dbLenChybne() }, `Precvičiť znova ${zle.length} úloh, ktoré mi nevyšli →`)) : null,
      ] : h("p", { class: "empty" }, "Zatiaľ si nekontroloval(a) žiadnu úlohu."),
      h("div", { class: "row", style: "margin-top:2rem" },
        h("button", { class: "btn danger", type: "button", onclick: () => { if (confirm("Naozaj vymazať celý svoj pokrok?")) P.pokrok.zmaz(); } }, "Vymazať môj pokrok"))));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("ziak");
    P.registerTab({ id: "pokrok", label: "Môj pokrok", init: () => { pokrokHost = document.getElementById("panel-pokrok"); renderPokrok(); } });
    P.on("pokrok", renderPokrok); P.on("profil", () => { hlavicka(); renderPokrok(); });
    // dvojitý odklad: až po tom, čo main.js postaví záložky (aj on štartuje cez setTimeout)
    setTimeout(() => setTimeout(() => { hlavicka(); if (!hesloOk() || !P.profil()) prihlasenie(); else if (P.dbSetKat) P.dbSetKat(P.profil().kat); }, 0), 0);
  });
})();
