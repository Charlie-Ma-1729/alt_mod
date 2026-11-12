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

  // ---- 分裂總表：搜尋、時間軸、分裂樹 ----
  var spl = document.getElementById('splits-tools');
  if (spl && main) (function () {
    var rows = [], srcEls = [];
    [].slice.call(main.querySelectorAll('table')).forEach(function (tb) {
      var h = tb.previousElementSibling;
      while (h && !/^H[2-4]$/.test(h.tagName)) h = h.previousElementSibling;
      var parent = h ? h.textContent.trim() : '';
      srcEls.push(tb); if (h) srcEls.push(h);
      [].slice.call(tb.querySelectorAll('tbody tr')).forEach(function (tr) {
        var c = [].slice.call(tr.children).map(function (td) { return td.textContent.trim(); });
        rows.push({ tr: tr, tb: tb, head: h, parent: parent, name: c[0], from: c[1], when: c[2], how: c[3], fixed: c[4], level: c[5], text: c.join(' ').toLowerCase() });
      });
    });
    function norm(s) { return (s || '').replace(/（[^）]*）/g, '').replace(/\s/g, ''); }
    function whenKey(s) {
      var m = /(\d{4}) 年(?: ?約)?(?: ?(\d{1,2}) 月)?/.exec(s || '');
      if (!m) return null;
      var mo = m[2] ? +m[2] : 0, q4 = /第([一二三四])季/.exec(s);
      if (!mo && q4) mo = { '一': 1, '二': 4, '三': 7, '四': 10 }[q4[1]];
      if (!mo) mo = /春/.test(s) ? 3 : /夏/.test(s) ? 6 : /秋/.test(s) ? 9 : /底/.test(s) ? 12 : 0;
      return +m[1] * 100 + mo;
    }
    function chips(s) {
      if (!s || s === '—') return '';
      return '<span class="spl-chips">' + s.split(/[、；]/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</span>';
    }
    var state = { view: 'tables', term: '' };
    var bar = document.createElement('div');
    bar.className = 'spl-bar';
    bar.innerHTML = '<input type="search" class="spl-q" placeholder="在分裂表裡搜尋（勢力、母體、地名、年份…）" aria-label="在分裂表裡搜尋"><div class="spl-views" role="tablist"><button type="button" data-v="tables" class="on">依母體</button><button type="button" data-v="timeline">時間軸</button><button type="button" data-v="tree">分裂樹</button></div><span class="spl-count"></span>';
    var out = document.createElement('div');
    out.className = 'spl-out';
    spl.append(bar, out);
    var input = bar.querySelector('.spl-q'), count = bar.querySelector('.spl-count');
    function visible() {
      var terms = state.term.toLowerCase().split(/\s+/).filter(Boolean);
      return rows.filter(function (r) { return terms.every(function (t) { return r.text.indexOf(t) >= 0; }); });
    }
    function item(r) {
      return '<details class="spl-item"><summary><strong>' + esc(r.name) + '</strong><span class="spl-when' + (r.when && r.when !== '—' ? '' : ' none') + '">' + esc(r.when && r.when !== '—' ? r.when : '未定時間') + '</span></summary>' +
        '<p><span class="spl-k">分裂自</span>' + esc(r.from) + '　<span class="spl-k">母體區塊</span>' + esc(r.parent) + '</p>' +
        '<p>' + esc(r.how) + '</p>' + (r.fixed && r.fixed !== '—' ? '<p><span class="spl-k">已定地盤</span>' + chips(r.fixed) + '</p>' : '') +
        '<p class="spl-lv">' + esc(r.level) + '</p></details>';
    }
    function render() {
      var vis = visible();
      var set = {};
      vis.forEach(function (r) { set[rows.indexOf(r)] = 1; });
      count.textContent = vis.length === rows.length ? '共 ' + rows.length + ' 列' : '符合 ' + vis.length + ' / ' + rows.length + ' 列';
      var showTables = state.view === 'tables';
      srcEls.forEach(function (e) { e.style.display = showTables ? '' : 'none'; });
      rows.forEach(function (r, i) { r.tr.style.display = set[i] ? '' : 'none'; });
      if (showTables) {
        srcEls.forEach(function (e) { if (e.tagName === 'TABLE') { var any = [].some.call(e.querySelectorAll('tbody tr'), function (tr) { return tr.style.display !== 'none'; }); e.style.display = any ? '' : 'none'; var h = e.previousElementSibling; while (h && !/^H[2-4]$/.test(h.tagName)) h = h.previousElementSibling; if (h) h.style.display = any ? '' : 'none'; } });
        out.innerHTML = ''; return;
      }
      if (state.view === 'timeline') {
        var dated = vis.filter(function (r) { return whenKey(r.when) != null; }).sort(function (a, b) { return whenKey(a.when) - whenKey(b.when) || a.name.localeCompare(b.name); });
        var undated = vis.filter(function (r) { return whenKey(r.when) == null; });
        var html = '', lastY = null;
        dated.forEach(function (r) {
          var y = Math.floor(whenKey(r.when) / 100);
          if (y !== lastY) { html += (lastY !== null ? '</div>' : '') + '<h4 class="spl-year">' + y + ' 年</h4><div class="spl-list">'; lastY = y; }
          html += item(r);
        });
        if (lastY !== null) html += '</div>';
        if (undated.length) html += '<h4 class="spl-year">未定時間（' + undated.length + '）</h4><div class="spl-list">' + undated.map(item).join('') + '</div>';
        out.innerHTML = html || '<p class="none">沒有符合的列。</p>';
        return;
      }
      // 分裂樹：依「分裂自」把勢力串成樹
      var names = {};
      vis.forEach(function (r) { names[norm(r.name)] = 1; });
      var kids = {}, roots = {};
      vis.forEach(function (r) {
        var p = norm(r.from).split(/[／、]/)[0] || '（母體）';
        (kids[p] = kids[p] || []).push(r);
        if (!names[p]) roots[p] = 1;
      });
      function node(r, depth) {
        var ch = depth < 4 ? (kids[norm(r.name)] || []).filter(function (x) { return x !== r; }) : [];
        return '<li>' + item(r) + (ch.length ? '<ul>' + ch.map(function (x) { return node(x, depth + 1); }).join('') + '</ul>' : '') + '</li>';
      }
      var keys = Object.keys(roots).sort(function (a, b) { return kids[b].length - kids[a].length; });
      var html2 = keys.map(function (k) { return '<section class="spl-root"><h4>' + esc(k) + '<span>' + kids[k].length + ' 個直接分出</span></h4><ul class="spl-tree">' + kids[k].map(function (r) { return node(r, 0); }).join('') + '</ul></section>'; }).join('');
      out.innerHTML = html2 || '<p class="none">沒有符合的列。</p>';
    }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]');
      if (!b) return;
      state.view = b.getAttribute('data-v');
      [].forEach.call(bar.querySelectorAll('button[data-v]'), function (x) { x.classList.toggle('on', x === b); });
      render();
    });
    input.addEventListener('input', function () { state.term = input.value; render(); });
    render();
  })();

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
