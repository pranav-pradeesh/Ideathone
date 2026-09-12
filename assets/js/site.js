/* Ideathon 2026 — shared rendering for the home page, rule book and footer. */

(function () {
  'use strict';

  var I = window.IDEATHON;
  if (!I) return;
  var cfg = I.config;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function all(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  /* ---- simple text bindings --------------------------------------------- */

  function bindText() {
    all('[data-bind="event-name"]').forEach(function (n) { n.textContent = cfg.name; });
    all('[data-bind="host-short"]').forEach(function (n) { n.textContent = cfg.hostShort || ''; });
    all('[data-bind="host-full"]').forEach(function (n) { n.textContent = cfg.host || ''; });
    all('[data-bind="event-date"]').forEach(function (n) { n.textContent = cfg.date || 'TBA'; });
    all('[data-bind="event-date-short"]').forEach(function (n) { n.textContent = cfg.dateShort || cfg.date || 'TBA'; });
    all('[data-bind="event-time"]').forEach(function (n) { n.textContent = cfg.timeRange || ''; });
    all('[data-bind="total-minutes"]').forEach(function (n) { n.textContent = String(cfg.totalMinutes); });
    all('[data-bind="event-full-name"]').forEach(function (n) { n.textContent = cfg.fullName || cfg.name; });
    all('[data-bind="tagline"]').forEach(function (n) { n.textContent = cfg.tagline || ''; });
    all('[data-bind="max-team"]').forEach(function (n) { n.textContent = String(cfg.maxTeamSize); });
    all('[data-bind="pitch-capacity"]').forEach(function (n) { n.textContent = String(I.pitchCapacity()); });
    all('[data-bind="ai-disclosure"]').forEach(function (n) { n.textContent = I.aiPolicy.disclosure; });

    all('[data-bind="footer-name"]').forEach(function (n) {
      n.textContent = cfg.name + ' · ' + cfg.tagline;
      n.title = cfg.host || '';
    });
    all('[data-bind="footer-contact"]').forEach(function (n) {
      n.textContent = '';
      /* Deliberately no link to admin.html from any public page. */
      if (cfg.contactEmail) {
        var a = el('a', null, cfg.contactEmail);
        a.href = 'mailto:' + cfg.contactEmail;
        n.appendChild(a);
      } else {
        n.appendChild(document.createTextNode('Questions? Ask an organiser.'));
      }
    });

  }

  /* ---- schedule timeline ------------------------------------------------- */

  function renderTimeline(host) {
    host.textContent = '';
    I.schedule.forEach(function (p) {
      var row = el('div', 'phase');
      row.setAttribute('data-ai', p.ai);

      /* Real clock first — the event runs at a fixed time, so "3:13 pm" is
         more use in the room than "43:00 elapsed". */
      var time = el('div', 'clock');
      time.appendChild(document.createTextNode(I.wallRange(p.start, p.start + p.minutes)));
      time.appendChild(el('span', 'dur', p.minutes + ' min · ' + I.clock(p.start).slice(0, 2) + '–' +
        I.clock(p.start + p.minutes).slice(0, 2)));
      row.appendChild(time);

      var body = el('div');
      var h = el('h3', null, p.name);
      if (p.ai === 'yes') h.appendChild(el('span', 'tag ai', 'AI allowed'));
      if (p.ai === 'no') h.appendChild(el('span', 'tag noai', 'No AI'));
      body.appendChild(h);
      body.appendChild(el('p', null, p.what));
      if (p.owner) body.appendChild(el('div', 'owner', p.owner));
      row.appendChild(body);

      host.appendChild(row);
    });
  }

  /* ---- role cards -------------------------------------------------------- */

  function renderRoleCards(host, only) {
    host.textContent = '';
    I.roles.filter(function (r) {
      return only === undefined || Boolean(r.required) === only;
    }).forEach(function (r, i) {
      var c = el('div', 'card');
      c.appendChild(el('div', 'role-no', r.required ? 'Required' : 'Optional'));
      c.appendChild(el('h3', null, r.name));
      c.appendChild(el('p', null, r.short));
      var ul = el('ul', 'ticks');
      r.owns.slice(0, 3).forEach(function (o) { ul.appendChild(el('li', null, o)); });
      c.appendChild(ul);
      var a = el('a', null, 'See the rules →');
      a.href = 'rulebook.html#roles';
      c.appendChild(a);
      host.appendChild(c);
    });
  }

  function renderTeamShapes(host) {
    host.textContent = '';
    I.teamShapes.forEach(function (s) {
      var tr = el('tr');
      var td1 = el('td');
      td1.setAttribute('data-label', 'Team size');
      td1.appendChild(el('span', 'role-name', s.label));
      tr.appendChild(td1);
      var td2 = el('td', null, s.how);
      td2.setAttribute('data-label', 'Roles');
      tr.appendChild(td2);
      host.appendChild(tr);
    });
  }

  /* ---- AI policy lists --------------------------------------------------- */

  function renderList(host, items) {
    host.textContent = '';
    items.forEach(function (t) { host.appendChild(el('li', null, t)); });
  }

  /* ---- role detail blocks ------------------------------------------------ */

  function renderRoleBook(host) {
    host.textContent = '';
    I.roles.forEach(function (r, i) {
      var block = el('section', 'role-block');
      block.id = r.id;

      var head = el('header');
      head.appendChild(el('div', 'role-no', 'Role ' + (i + 1) + ' of ' + I.roles.length));
      head.appendChild(el('h2', null, r.name));
      head.appendChild(el('p', 'subtitle', r.short));
      block.appendChild(head);

      block.appendChild(el('p', null, r.summary));

      var cols = el('div', 'role-cols');
      cols.appendChild(column('Owns', r.owns));
      cols.appendChild(column('Delivers', r.delivers));
      cols.appendChild(column('Common failures', r.avoid));
      block.appendChild(cols);

      var mh = el('h4', null, 'Minute by minute');
      mh.style.cssText = 'font-family:var(--mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--cyan);margin:26px 0 10px';
      block.appendChild(mh);

      var ml = el('ul', 'minute-list');
      r.minutes.forEach(function (m) {
        var li = el('li');
        li.appendChild(el('b', null, m.t));
        li.appendChild(el('span', null, m.do));
        ml.appendChild(li);
      });
      block.appendChild(ml);

      var ai = el('div', 'callout');
      ai.style.marginTop = '24px';
      var aih = el('h4', null, 'AI in this role');
      aih.style.cssText = 'font-family:var(--mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--violet);margin:0 0 8px';
      ai.appendChild(aih);
      ai.appendChild(el('p', null, r.ai));
      block.appendChild(ai);

      host.appendChild(block);
    });
  }

  function column(title, items) {
    var d = el('div');
    d.appendChild(el('h4', null, title));
    var ul = el('ul');
    items.forEach(function (t) { ul.appendChild(el('li', null, t)); });
    d.appendChild(ul);
    return d;
  }

  function renderRoleToc(host) {
    host.textContent = '';
    I.roles.forEach(function (r) {
      var a = el('a', null, r.name);
      a.href = '#' + r.id;
      host.appendChild(a);
    });
  }

  /* ---- perks -------------------------------------------------------------- */

  function renderPerks(host) {
    host.textContent = '';
    I.perks.forEach(function (perk) {
      var li = el('li');
      var icon = el('span', 'perk-icon', perk.icon);
      icon.setAttribute('aria-hidden', 'true');
      li.appendChild(icon);
      var body = el('span', 'perk-body');
      body.appendChild(el('strong', null, perk.title));
      body.appendChild(el('small', null, perk.note));
      li.appendChild(body);
      host.appendChild(li);
    });
  }

  /* ---- rule book ---------------------------------------------------------- */

  function renderRules(host) {
    host.textContent = '';
    I.rules.forEach(function (section, si) {
      var block = el('section', 'rule-section');
      block.id = section.id;

      var head = el('header', 'rule-head');
      head.appendChild(el('span', 'rule-no', String(si + 1)));
      head.appendChild(el('h2', null, section.title));
      block.appendChild(head);

      var ol = el('ol', 'rule-list');
      section.items.forEach(function (text, ii) {
        var li = el('li');
        li.appendChild(el('span', 'rule-ref', (si + 1) + '.' + (ii + 1)));
        li.appendChild(el('span', 'rule-text', text));
        ol.appendChild(li);
      });
      block.appendChild(ol);
      host.appendChild(block);
    });
  }

  function renderRuleToc(host) {
    host.textContent = '';
    I.rules.forEach(function (section, i) {
      var a = el('a', null, (i + 1) + '. ' + section.title);
      a.href = '#' + section.id;
      host.appendChild(a);
    });
  }

  function renderRoleTable(host) {
    host.textContent = '';
    I.roles.forEach(function (r) {
      var tr = el('tr');
      var td1 = el('td');
      td1.setAttribute('data-label', 'Role');
      td1.appendChild(el('span', 'role-name', r.name));
      td1.appendChild(el('span', 'role-flag' + (r.required ? ' is-required' : ''),
        r.required ? 'Required' : 'Optional'));
      tr.appendChild(td1);
      var td2 = el('td', null, r.short);
      td2.setAttribute('data-label', 'Owns');
      tr.appendChild(td2);
      var td3 = el('td', null, r.delivers.join(' · '));
      td3.setAttribute('data-label', 'Delivers');
      tr.appendChild(td3);
      host.appendChild(tr);
    });
  }

  /* ---- pod planner ------------------------------------------------------- */

  function initPlanner() {
    var input = document.getElementById('teamCount');
    if (!input) return;
    var cap = I.pitchCapacity();

    function update() {
      var teams = parseInt(input.value, 10);
      if (isNaN(teams) || teams < 1) teams = 1;
      var pods = Math.ceil(teams / cap);
      var perPod = Math.ceil(teams / pods);
      setText('podCount', pods);
      setText('judgeCount', pods);
      setText('roomCount', pods);
      setText('perPod', perPod);
    }

    function setText(id, v) {
      var n = document.getElementById(id);
      if (n) n.textContent = String(v);
    }

    input.addEventListener('input', update);
    update();
  }

  /* ---- registration link -------------------------------------------------- */

  /* Every "Register" link on the site points at register.html in the markup.
     When a registration URL is configured, rewrite them all in one place
     rather than editing five pages — and keep register.html as a redirect so
     any link already shared still lands in the right place. */
  function applyRegistrationUrl() {
    var url = cfg.registrationUrl;
    if (!url) return;
    all('a[href="register.html"], a[href="register"], a[href="./register.html"]')
      .forEach(function (a) {
        a.href = url;
        a.rel = 'noopener';
      });
  }

  /* ---- mobile menu -------------------------------------------------------- */

  function initNav() {
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('siteNav');
    if (!toggle || !nav) return;

    function open() {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKey);
      document.addEventListener('click', onOutside, true);
    }

    function close(refocus) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onOutside, true);
      if (refocus) toggle.focus();
    }

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') close(true);
    }

    function onOutside(e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) close(false);
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) close(false); else open();
    });

    /* Following a link should not leave the panel hanging open behind the
       next page, and an in-page anchor does not reload at all. */
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) close(false);
    });

    /* Dragging the window back to a wide layout must not leave the menu in
       its open state, where it would sit over the page. */
    var pending;
    window.addEventListener('resize', function () {
      clearTimeout(pending);
      pending = setTimeout(function () {
        if (window.innerWidth > 720 && isOpen()) close(false);
      }, 120);
    });
  }

  /* ---- wide tables -------------------------------------------------------- */

  /* Mark the containers that actually overflow, so the "scrolls sideways" hint
     only appears when it is true. */
  function markScrollables() {
    all('.table-scroll').forEach(function (box) {
      box.classList.toggle('is-scrollable', box.scrollWidth > box.clientWidth + 1);
    });
  }

  window.IdeathonSite = { markScrollables: markScrollables };

  /* ---- boot -------------------------------------------------------------- */

  function boot() {
    bindText();

    var t = document.querySelector('[data-render="timeline"]');
    if (t) renderTimeline(t);

    var rc = document.querySelector('[data-render="role-cards"]');
    if (rc) renderRoleCards(rc);

    var rcReq = document.querySelector('[data-render="role-cards-required"]');
    if (rcReq) renderRoleCards(rcReq, true);

    var rcOpt = document.querySelector('[data-render="role-cards-optional"]');
    if (rcOpt) renderRoleCards(rcOpt, false);

    var ts = document.querySelector('[data-render="team-shapes"]');
    if (ts) renderTeamShapes(ts);

    var ok = document.querySelector('[data-render="ai-allowed"]');
    if (ok) renderList(ok, I.aiPolicy.allowed);

    var no = document.querySelector('[data-render="ai-not-allowed"]');
    if (no) renderList(no, I.aiPolicy.notAllowed);

    var rb = document.querySelector('[data-render="role-book"]');
    if (rb) renderRoleBook(rb);

    var toc = document.querySelector('[data-render="role-toc"]');
    if (toc) renderRoleToc(toc);

    var perks = document.querySelector('[data-render="perks"]');
    if (perks) renderPerks(perks);

    var rules = document.querySelector('[data-render="rules"]');
    if (rules) renderRules(rules);

    var rtoc = document.querySelector('[data-render="rule-toc"]');
    if (rtoc) renderRuleToc(rtoc);

    var rt = document.querySelector('[data-render="role-table"]');
    if (rt) renderRoleTable(rt);

    applyRegistrationUrl();
    initNav();
    initPlanner();
    markScrollables();

    var pending;
    window.addEventListener('resize', function () {
      clearTimeout(pending);
      pending = setTimeout(markScrollables, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
