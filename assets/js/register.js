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
    ['teamName', 'members'].forEach(function (id) { setError(id, ''); });
    Array.prototype.slice.call(namesHost.querySelectorAll('.member-error'))
      .forEach(function (n) { n.textContent = ''; n.classList.remove('show'); });
    Array.prototype.slice.call(form.querySelectorAll('[aria-invalid="true"]'))
      .forEach(function (n) { n.setAttribute('aria-invalid', 'false'); });
    statusEl.textContent = '';
    statusEl.classList.remove('error');
  }

  /* ---- build the fields -------------------------------------------------- */

  function fillCounts() {
    for (var n = MIN; n <= MAX; n++) {
      var o = document.createElement('option');
      o.value = String(n);
      o.textContent = n + (n === 1 ? ' member' : ' members');
      countSel.appendChild(o);
    }
    countSel.value = String(MAX);
  }

  /* Keep the member blocks in step with the chosen count, preserving what has
     already been typed. */
  function syncNames() {
    var want = parseInt(countSel.value, 10) || MIN;

    for (var i = namesHost.children.length; i < want; i++) {
      namesHost.appendChild(memberBlock(i));
    }
    while (namesHost.children.length > want) {
      namesHost.removeChild(namesHost.lastChild);
    }
  }

  function memberBlock(i) {
    var n = i + 1;
    var block = el('div', 'member-block');

    var head = el('div', 'member-block-head');
    head.appendChild(el('span', 'name-num', String(n)));
    head.appendChild(el('span', 'member-block-title', i === 0 ? 'Team lead' : 'Member ' + n));
    block.appendChild(head);

    var grid = el('div', 'member-grid');
    grid.appendChild(memberInput({
      id: 'member' + n + 'Name',
      type: 'text',
      max: 60,
      label: 'Member ' + n + ' full name',
      placeholder: 'Full name',
      autocomplete: 'off'
    }));
    grid.appendChild(memberInput({
      id: 'member' + n + 'Phone',
      type: 'tel',
      max: 20,
      label: 'Member ' + n + ' mobile number',
      placeholder: 'Mobile number',
      autocomplete: 'off',
      inputmode: 'numeric'
    }));
    block.appendChild(grid);

    /* Each member carries their own branch — a team may mix them. */
    var sel = document.createElement('select');
    sel.id = 'member' + n + 'Branch';
    sel.className = 'member-branch';
    sel.setAttribute('aria-label', 'Member ' + n + ' branch of study');
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Branch of study…';
    sel.appendChild(blank);
    I.branches.forEach(function (b) {
      var o = document.createElement('option');
      o.value = b;
      o.textContent = b;
      sel.appendChild(o);
    });
    block.appendChild(sel);
    block.appendChild(el('div', 'error-text member-error'));
    return block;
  }

  function memberInput(opts) {
    var input = document.createElement('input');
    input.type = opts.type;
    input.id = opts.id;
    input.maxLength = opts.max;
    input.placeholder = opts.placeholder;
    input.autocomplete = opts.autocomplete;
    if (opts.inputmode) input.inputMode = opts.inputmode;
    input.setAttribute('aria-label', opts.label);
    return input;
  }

  function blocks() {
    return Array.prototype.slice.call(namesHost.children);
  }

  function blockError(block, msg) {
    var n = block.querySelector('.member-error');
    n.textContent = msg;
    n.classList.add('show');
  }

  /* ---- validation -------------------------------------------------------- */

  function collect() {
    var bad = [];

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

    var members = [];
    var seenName = {};
    var seenPhone = {};

    blocks().forEach(function (block, i) {
      var nameInput = block.querySelector('input[type="text"]');
      var phoneInput = block.querySelector('input[type="tel"]');
      var branchSel = block.querySelector('select.member-branch');
      var name = nameInput.value.trim().replace(/\s+/g, ' ');
      var phone = R.normalisePhone(phoneInput.value);
      var problem = '';

      if (!name) {
        problem = 'Name required.';
        nameInput.setAttribute('aria-invalid', 'true');
        bad.push(nameInput);
      } else if (seenName[name.toLowerCase()]) {
        problem = 'Member ' + seenName[name.toLowerCase()] + ' has the same name.';
        nameInput.setAttribute('aria-invalid', 'true');
        bad.push(nameInput);
      } else {
        seenName[name.toLowerCase()] = i + 1;
      }

      var phoneProblem = R.phoneProblem(phoneInput.value);
      if (phoneProblem) {
        problem = problem ? problem + ' ' + phoneProblem : phoneProblem;
        phoneInput.setAttribute('aria-invalid', 'true');
        bad.push(phoneInput);
      } else if (seenPhone[phone]) {
        problem = 'Member ' + seenPhone[phone] + ' already uses this number.';
        phoneInput.setAttribute('aria-invalid', 'true');
        bad.push(phoneInput);
      } else {
        seenPhone[phone] = i + 1;
      }

      if (!branchSel.value) {
        problem = problem ? problem + ' Branch required.' : 'Choose a branch of study.';
        branchSel.setAttribute('aria-invalid', 'true');
        bad.push(branchSel);
      }

      if (problem) {
        blockError(block, problem);
      } else {
        members.push({ name: name, branch: branchSel.value, phone: phone });
      }
    });

    return {
      bad: bad,
      entry: {
        ref: R.makeRef(teamName),
        registeredAt: R.stamp(),
        teamName: teamName,
        members: members,
        website: document.getElementById('website') ? document.getElementById('website').value : ''
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
    submitBtn.disabled = true;
    statusEl.textContent = 'Registering…';

    R.submit(entry).then(function (res) {
      entry.ref = res.ref || entry.ref;
      lastEntry = entry;
      statusEl.textContent = '';
      showSuccess(entry, res.mode);
    }).catch(function (err) {
      submitBtn.disabled = false;
      statusEl.textContent = err.message || 'Could not register. Try again.';
      statusEl.classList.add('error');

      if (err.field === 'teamName') {
        setError('teamName', err.message);
        teamNameInput.setAttribute('aria-invalid', 'true');
        teamNameInput.focus();
        teamNameInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }

  function fileBase() {
    return 'ideathon-' + R.safeName((lastEntry || {}).teamName || 'team');
  }

  function downloadXlsx() {
    if (lastEntry) R.downloadXlsx([lastEntry], fileBase() + '.xlsx');
  }

  function downloadCsv() {
    if (lastEntry) R.downloadCsv([lastEntry], fileBase() + '.csv');
  }

  function showSuccess(entry, mode) {
    form.hidden = true;
    successPanel.hidden = false;
    document.getElementById('refCode').textContent = entry.ref;

    var detail = document.getElementById('successDetail');
    detail.textContent = '';
    detail.appendChild(el('p', null, entry.teamName));

    var ul = el('ul', 'ticks');
    entry.members.forEach(function (m, i) {
      ul.appendChild(el('li', null,
        m.name + ' — ' + m.branch + ' — ' + m.phone +
        (i === 0 && entry.members.length > 1 ? ' (team lead)' : '')));
    });
    detail.appendChild(ul);

    var note = document.getElementById('successNote');
    if (mode === 'server') {
      note.textContent = 'The organisers have your registration. Keep the reference below ' +
        'for check-in — you do not need to send anything.';
    } else {
      note.textContent = 'Saved on this device only — the organisers do not have it yet. ' +
        'Download your entry below and send the file to them.';
      note.classList.add('warn-text');
      R.downloadXlsx([entry], fileBase() + '.xlsx');
    }

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
    teamNameInput.focus();
  }

  /* ---- boot -------------------------------------------------------------- */

  fillCounts();
  syncNames();

  countSel.addEventListener('change', syncNames);
  form.addEventListener('submit', submit);
  document.getElementById('xlsxBtn').addEventListener('click', downloadXlsx);
  document.getElementById('csvBtn').addEventListener('click', downloadCsv);
  document.getElementById('anotherBtn').addEventListener('click', reset);
})();
