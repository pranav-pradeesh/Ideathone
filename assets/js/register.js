/* Ideathon 60 — registration form.
 *
 * Four fields: branch, team name, member count, member names. On submit the
 * team is stored on this device and a spreadsheet of the entry downloads.
 */

(function () {
  'use strict';

  var I = window.IDEATHON;
  var R = window.Registry;
  if (!I || !R) return;

  var MAX = I.config.maxTeamSize;
  var MIN = I.config.minTeamSize;

  var form = document.getElementById('regForm');
  if (!form) return;

  var branchSel = document.getElementById('branch');
  var teamNameInput = document.getElementById('teamName');
  var countSel = document.getElementById('memberCount');
  var namesHost = document.getElementById('memberNames');
  var statusEl = document.getElementById('formStatus');
  var submitBtn = document.getElementById('submitBtn');
  var successPanel = document.getElementById('successPanel');

  var lastEntry = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function setError(id, msg) {
    var n = document.getElementById('err-' + id);
    if (!n) return;
    n.textContent = msg || '';
    n.classList.toggle('show', !!msg);
  }

  function clearErrors() {
    ['branch', 'teamName', 'members'].forEach(function (id) { setError(id, ''); });
    Array.prototype.slice.call(form.querySelectorAll('[aria-invalid="true"]'))
      .forEach(function (n) { n.setAttribute('aria-invalid', 'false'); });
    statusEl.textContent = '';
    statusEl.classList.remove('error');
  }

  /* ---- build the fields -------------------------------------------------- */

  function fillBranches() {
    I.branches.forEach(function (b) {
      var o = document.createElement('option');
      o.value = b;
      o.textContent = b;
      branchSel.appendChild(o);
    });
  }

  function fillCounts() {
    for (var n = MIN; n <= MAX; n++) {
      var o = document.createElement('option');
      o.value = String(n);
      o.textContent = n + (n === 1 ? ' member' : ' members');
      countSel.appendChild(o);
    }
    countSel.value = String(MAX);
  }

  /* Keep the name boxes in step with the chosen count, preserving what has
     already been typed. */
  function syncNames() {
    var want = parseInt(countSel.value, 10) || MIN;
    var boxes = namesHost.querySelectorAll('input');

    for (var i = boxes.length; i < want; i++) {
      var row = el('div', 'name-row');

      var num = el('span', 'name-num', String(i + 1));
      num.setAttribute('aria-hidden', 'true');
      row.appendChild(num);

      var input = document.createElement('input');
      input.type = 'text';
      input.id = 'member' + (i + 1);
      input.maxLength = 60;
      input.autocomplete = 'off';
      input.placeholder = i === 0 ? 'Team lead — full name' : 'Full name';
      input.setAttribute('aria-label', 'Member ' + (i + 1) + ' full name');
      row.appendChild(input);

      namesHost.appendChild(row);
    }

    while (namesHost.children.length > want) {
      namesHost.removeChild(namesHost.lastChild);
    }
  }

  /* ---- validation -------------------------------------------------------- */

  function collect() {
    var bad = [];

    if (!branchSel.value) {
      setError('branch', 'Choose your branch of study.');
      branchSel.setAttribute('aria-invalid', 'true');
      bad.push(branchSel);
    }

    var teamName = teamNameInput.value.trim();
    if (!teamName) {
      setError('teamName', 'Give your team a name.');
      teamNameInput.setAttribute('aria-invalid', 'true');
      bad.push(teamNameInput);
    } else if (R.hasTeamName(teamName)) {
      setError('teamName', 'A team with this name is already registered on this device.');
      teamNameInput.setAttribute('aria-invalid', 'true');
      bad.push(teamNameInput);
    }

    var inputs = Array.prototype.slice.call(namesHost.querySelectorAll('input'));
    var names = [];
    var seen = {};
    var blank = false;
    var dupe = false;

    inputs.forEach(function (input) {
      var v = input.value.trim();
      if (!v) {
        blank = true;
        input.setAttribute('aria-invalid', 'true');
        bad.push(input);
        return;
      }
      var key = v.toLowerCase();
      if (seen[key]) {
        dupe = true;
        input.setAttribute('aria-invalid', 'true');
        bad.push(input);
        return;
      }
      seen[key] = true;
      names.push(v);
    });

    if (blank) {
      setError('members', 'Fill in a name for every member, or lower the member count.');
    } else if (dupe) {
      setError('members', 'Two members have the same name — check the spelling.');
    }

    if (names.length > MAX) {
      setError('members', 'Teams are capped at ' + MAX + ' members.');
      bad.push(countSel);
    }

    return {
      bad: bad,
      entry: {
        ref: R.makeRef(teamName),
        registeredAt: R.stamp(),
        branch: branchSel.value,
        teamName: teamName,
        members: names
      }
    };
  }

  /* ---- submit ------------------------------------------------------------ */

  function submit(e) {
    e.preventDefault();
    clearErrors();

    var result = collect();
    if (result.bad.length) {
      statusEl.textContent = 'Check the highlighted field' + (result.bad.length > 1 ? 's' : '') + '.';
      statusEl.classList.add('error');
      result.bad[0].focus();
      result.bad[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    var entry = result.entry;
    if (!R.add(entry)) {
      statusEl.textContent = 'This browser refused to save the entry. Try a normal (non-private) window.';
      statusEl.classList.add('error');
      return;
    }

    lastEntry = entry;
    submitBtn.disabled = true;
    downloadXlsx();
    showSuccess(entry);
  }

  function fileBase() {
    return 'ideathon-' + R.safeName(lastEntry.teamName);
  }

  function downloadXlsx() {
    if (lastEntry) R.downloadXlsx([lastEntry], fileBase() + '.xlsx');
  }

  function downloadCsv() {
    if (lastEntry) R.downloadCsv([lastEntry], fileBase() + '.csv');
  }

  function showSuccess(entry) {
    form.hidden = true;
    successPanel.hidden = false;
    document.getElementById('refCode').textContent = entry.ref;

    var detail = document.getElementById('successDetail');
    detail.textContent = '';
    detail.appendChild(el('p', null, entry.teamName + ' · ' + entry.branch));

    var ul = el('ul', 'ticks');
    entry.members.forEach(function (m, i) {
      ul.appendChild(el('li', null, m + (i === 0 && entry.members.length > 1 ? ' (team lead)' : '')));
    });
    detail.appendChild(ul);

    successPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function reset() {
    form.reset();
    namesHost.textContent = '';
    countSel.value = String(MAX);
    syncNames();
    clearErrors();
    submitBtn.disabled = false;
    successPanel.hidden = true;
    form.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    branchSel.focus();
  }

  /* ---- boot -------------------------------------------------------------- */

  fillBranches();
  fillCounts();
  syncNames();

  countSel.addEventListener('change', syncNames);
  form.addEventListener('submit', submit);
  document.getElementById('xlsxBtn').addEventListener('click', downloadXlsx);
  document.getElementById('csvBtn').addEventListener('click', downloadCsv);
  document.getElementById('anotherBtn').addEventListener('click', reset);
})();
