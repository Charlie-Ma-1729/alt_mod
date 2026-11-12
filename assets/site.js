(function () {
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // ---- 本頁目錄 ----
  var main = document.querySelector('main');
  var slot = document.getElementById('toc');
  if (slot && main) {
    var hs = [].slice.call(main.querySelectorAll('h2, h3')).filter(function (h) {
      return !h.closest('.backlinks');
    });
    if (hs.length >= 4) {
      var html = '<details open><summary>本頁目錄（' + hs.length + ' 節）</summary><ol>';
      hs.forEach(function (h, i) {
        if (!h.id) h.id = 'sec-' + i;
        var label = h.textContent.trim();
        if (label === '補充') {
          var n = h.nextElementSibling;
          var s = n ? n.textContent.trim().replace(/\s+/g, ' ').slice(0, 18) : '';
          if (s) label = '補充：' + s + '…';
        }
        html += '<li class="l' + h.tagName.charAt(1) + '"><a href="#' + esc(h.id) + '">' + esc(label) + '</a></li>';
      });
      html += '</ol></details>';
      slot.innerHTML = html;
      slot.hidden = false;
    }
  }

  // ---- 全站搜尋 ----
  var q = document.getElementById('q');
  var box = document.getElementById('results');
  if (!q || !box) return;
  var data = null, loading = false;

  function load(done) {
    if (data) { done(); return; }
    if (loading) return;
    loading = true;
    fetch(q.getAttribute('data-src'))
      .then(function (r) { return r.json(); })
      .then(function (d) { data = d; loading = false; done(); })
      .catch(function () {
        loading = false;
        box.hidden = false;
        box.textContent = '搜尋資料載入失敗，請重新整理再試。';
      });
  }

  function count(text, term) {
    var n = 0, i = text.indexOf(term);
    while (i >= 0 && n < 50) { n++; i = text.indexOf(term, i + term.length); }
    return n;
  }

  function highlight(text, terms) {
    var out = esc(text);
    terms.forEach(function (t) {
      out = out.replace(new RegExp('(' + escRe(esc(t)) + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }

  function run() {
    var v = q.value.trim().toLowerCase();
    if (!v) { box.hidden = true; box.innerHTML = ''; return; }
    var terms = v.split(/\s+/).filter(Boolean);
    var res = [];
    data.forEach(function (d) {
      var tl = d.t.toLowerCase(), xl = d.x.toLowerCase(), score = 0, ok = true;
      terms.forEach(function (t) {
        var inTitle = tl.indexOf(t) >= 0, c = count(xl, t);
        if (!inTitle && c === 0) { ok = false; return; }
        score += (inTitle ? 100 : 0) + c;
      });
      if (ok) res.push({ d: d, score: score, pos: xl.indexOf(terms[0]) });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    var total = res.length;
    res = res.slice(0, 15);
    if (!total) { box.innerHTML = '<p class="none">找不到「' + esc(q.value.trim()) + '」。換個說法，或確認這個設計有沒有被列進去。</p>'; box.hidden = false; return; }
    var base = q.getAttribute('data-base');
    var html = '<p class="count">共 ' + total + ' 頁有這個詞' + (total > res.length ? '（只列前 ' + res.length + ' 頁）' : '') + '</p><ul>';
    res.forEach(function (r) {
      var start = Math.max(0, r.pos - 24);
      var snip = r.pos >= 0 ? (start > 0 ? '…' : '') + r.d.x.slice(start, start + 90) + '…' : r.d.x.slice(0, 90) + '…';
      html += '<li><a href="' + esc(base + r.d.u) + '"><strong>' + esc(r.d.t) + '</strong><span>' + highlight(snip, terms) + '</span></a></li>';
    });
    box.innerHTML = html + '</ul>';
    box.hidden = false;
  }

  q.addEventListener('input', function () { load(run); });
  q.addEventListener('focus', function () { load(function () { if (q.value.trim()) run(); }); });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search')) box.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { box.hidden = true; q.blur(); }
    if (e.key === '/' && document.activeElement !== q && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault(); q.focus();
    }
  });
})();
