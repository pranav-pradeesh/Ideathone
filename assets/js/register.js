/* Ideathon 60 — registration form: dynamic members, validation, submission. */

(function () {
  'use strict';

  var I = window.IDEATHON;
  if (!I) return;

  var cfg = I.config;
  var MAX = cfg.maxTeamSize;
  var MIN = cfg.minTeamSize;
  var STORE_KEY = 'ideathon60.registrations';

  var form = document.getElementById('regForm');
  if (!form) return;

  var membersHost = document.getElementById('members');
  var addBtn = document.getElementById('addMember');
  var countEl = document.getElementById('memberCount');
  var statusEl = document.getElementById('formStatus');
  var submitBtn = document.getElementById('submitBtn');
  var successPanel = document.getElementById('successPanel');

  var memberSeq = 0;
  var lastEntry = null;

  /* ---- helpers ----------------------------------------------------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function memberRows() {
    return Array.prototype.slice.call(membersHost.querySelectorAll('.member'));
  }

  function setError(id, msg) {
    var n = document.getElementById('err-' + id);
    if (!n) return;
    n.textContent = msg || '';
    n.classList.toggle('show', !!msg);
  }

  function markInvalid(input, invalid) {
    if (input) input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function fieldError(input, msg) {
    markInvalid(input, true);
    var holder = input.closest('.field');
    if (!holder) return;
    var n = holder.querySelector('.error-text');
    if (!n) {
      n = el('div', 'error-text');
      holder.appendChild(n);
    }
    n.textContent = msg;
    n.classList.add('show');
  }

  function clearFieldErrors() {
    Array.prototype.slice.call(form.querySelectorAll('.error-text')).forEach(function (n) {
      n.textContent = '';
      n.classList.remove('show');
    });
    Array.prototype.slice.call(form.querySelectorAll('[aria-invalid="true"]')).forEach(function (n) {
      n.setAttribute('aria-invalid', 'false');
    });
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function digits(s) { return (s || '').replace(/\D/g, ''); }

  /* ---- static option lists ----------------------------------------------- */

  function fillThemes() {
    var sel = document.getElementById('theme');
    if (!sel) return;
    I.themes.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      sel.appendChild(o);
    });
  }

  function fillAiTools() {
    var host = document.getElementById('aiTools');
    if (!host) return;
    I.aiTools.forEach(function (t, i) {
      var lab = el('label', 'check');
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.value = t;
      box.name = 'aiTool';
      box.id = 'aiTool' + i;
      lab.appendChild(box);
      lab.appendChild(el('span', null, t));
      host.appendChild(lab);
    });
  }

  /* ---- members ----------------------------------------------------------- */

  function addMember() {
    var rows = memberRows();
    if (rows.length >= MAX) return;

    var idx = rows.length;
    var uid = 'm' + (++memberSeq);

    var box = el('div', 'member');
    box.dataset.uid = uid;

    var head = el('div', 'member-head');
    head.appendChild(el('h4', null, 'Member ' + (idx + 1)));
    var pill = el('span', 'pill', 'Team lead');
    pill.hidden = idx !== 0;
    head.appendChild(pill);

    var rm = el('button', 'btn-link remove', 'Remove');
    rm.type = 'button';
    rm.addEventListener('click', function () {
      box.remove();
      renumber();
    });
    head.appendChild(rm);
    box.appendChild(head);

    box.appendChild(field(uid + '-name', 'Full name', 'text', true, { autocomplete: 'name', maxlength: 60 }));

    var row = el('div', 'row');
    row.appendChild(field(uid + '-email', 'Email', 'email', true, { autocomplete: 'email', maxlength: 90 }));
    row.appendChild(field(uid + '-phone', 'Phone', 'tel', idx === 0, {
      autocomplete: 'tel', maxlength: 20,
      hint: idx === 0 ? 'Required for the team lead — this is how we reach the team on the day.' : 'Optional.'
    }));
    box.appendChild(row);

    var row2 = el('div', 'row');
    row2.appendChild(field(uid + '-course', 'Course / department & year', 'text', false, { maxlength: 80 }));

    var roleField = el('div', 'field');
    var rl = el('label', null, 'Role ');
    rl.htmlFor = uid + '-role';
    rl.appendChild(el('span', 'req', '*'));
    roleField.appendChild(rl);

    var sel = document.createElement('select');
    sel.id = uid + '-role';
    sel.dataset.role = '1';
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Choose a role…';
    sel.appendChild(blank);
    I.roles.forEach(function (r) {
      var o = document.createElement('option');
      o.value = r.id;
      o.textContent = r.name;
      sel.appendChild(o);
    });
    sel.addEventListener('change', syncRoles);
    roleField.appendChild(sel);

    var hint = el('span', 'hint');
    hint.appendChild(document.createTextNode('One role per member, no duplicates. '));
    var a = el('a', null, 'What each role does →');
    a.href = 'rolebook.html';
    a.target = '_blank';
    a.rel = 'noopener';
    hint.appendChild(a);
    roleField.appendChild(hint);
    roleField.appendChild(el('div', 'error-text'));
    row2.appendChild(roleField);
    box.appendChild(row2);

    membersHost.appendChild(box);
    renumber();
  }

  function field(id, label, type, required, opts) {
    opts = opts || {};
    var f = el('div', 'field');
    var l = el('label', null, label + ' ');
    l.htmlFor = id;
    if (required) l.appendChild(el('span', 'req', '*'));
    f.appendChild(l);

    var input = document.createElement('input');
    input.type = type;
    input.id = id;
    if (opts.autocomplete) input.autocomplete = opts.autocomplete;
    if (opts.maxlength) input.maxLength = opts.maxlength;
    if (type === 'tel') input.inputMode = 'tel';
    f.appendChild(input);

    if (opts.hint) f.appendChild(el('span', 'hint', opts.hint));
    f.appendChild(el('div', 'error-text'));
    return f;
  }

  function renumber() {
    var rows = memberRows();
    rows.forEach(function (box, i) {
      box.querySelector('h4').textContent = 'Member ' + (i + 1);
      box.querySelector('.pill').hidden = i !== 0;
      var rm = box.querySelector('.remove');
      rm.hidden = rows.length <= MIN;

      // Phone is mandatory for whoever is currently member 1.
      var uid = box.dataset.uid;
      var phoneField = document.getElementById(uid + '-phone').closest('.field');
      var req = phoneField.querySelector('.req');
      var hint = phoneField.querySelector('.hint');
      if (i === 0 && !req) {
        phoneField.querySelector('label').appendChild(el('span', 'req', '*'));
      } else if (i !== 0 && req) {
        req.remove();
      }
      if (hint) {
        hint.textContent = i === 0
          ? 'Required for the team lead — this is how we reach the team on the day.'
          : 'Optional.';
      }
    });

    countEl.textContent = rows.length + ' of ' + MAX;
    addBtn.disabled = rows.length >= MAX;
    addBtn.textContent = rows.length >= MAX
      ? 'Maximum ' + MAX + ' members reached'
      : '+ Add member';
    syncRoles();
  }

  /* Disable roles already claimed by another member. */
  function syncRoles() {
    var selects = memberRows().map(function (b) { return b.querySelector('[data-role]'); });
    var taken = selects.map(function (s) { return s.value; }).filter(Boolean);

    selects.forEach(function (s) {
      Array.prototype.slice.call(s.options).forEach(function (o) {
        if (!o.value) return;
        o.disabled = o.value !== s.value && taken.indexOf(o.value) !== -1;
      });
    });
  }

  /* ---- validation -------------------------------------------------------- */

  function collect() {
    var errors = [];

    var teamName = document.getElementById('teamName');
    var institution = document.getElementById('institution');
    var theme = document.getElementById('theme');

    if (!teamName.value.trim()) {
      setError('teamName', 'Give your team a name.');
      markInvalid(teamName, true);
      errors.push(teamName);
    }
    if (!institution.value.trim()) {
      setError('institution', 'Tell us where you are from.');
      markInvalid(institution, true);
      errors.push(institution);
    }
    if (!theme.value) {
      setError('theme', 'Pick a preferred theme.');
      markInvalid(theme, true);
      errors.push(theme);
    }

    var rows = memberRows();
    if (rows.length < MIN) {
      setError('members', 'Add at least ' + MIN + ' member.');
      errors.push(addBtn);
    }
    if (rows.length > MAX) {
      setError('members', 'Teams are capped at ' + MAX + ' members.');
      errors.push(addBtn);
    }

    var members = [];
    var seenEmails = {};
    var seenRoles = {};

    rows.forEach(function (box, i) {
      var uid = box.dataset.uid;
      var name = document.getElementById(uid + '-name');
      var email = document.getElementById(uid + '-email');
      var phone = document.getElementById(uid + '-phone');
      var course = document.getElementById(uid + '-course');
      var role = box.querySelector('[data-role]');

      if (!name.value.trim()) {
        fieldError(name, 'Name required.');
        errors.push(name);
      }

      var mail = email.value.trim().toLowerCase();
      if (!mail) {
        fieldError(email, 'Email required.');
        errors.push(email);
      } else if (!EMAIL_RE.test(mail)) {
        fieldError(email, 'That does not look like an email address.');
        errors.push(email);
      } else if (seenEmails[mail]) {
        fieldError(email, 'Already used by member ' + seenEmails[mail] + '.');
        errors.push(email);
      } else {
        seenEmails[mail] = i + 1;
      }

      var tel = phone.value.trim();
      if (i === 0 && !tel) {
        fieldError(phone, 'The team lead needs a contactable number.');
        errors.push(phone);
      } else if (tel && digits(tel).length < 7) {
        fieldError(phone, 'That number looks too short.');
        errors.push(phone);
      }

      if (!role.value) {
        fieldError(role, 'Pick a role from the role book.');
        errors.push(role);
      } else if (seenRoles[role.value]) {
        fieldError(role, 'Member ' + seenRoles[role.value] + ' already has this role.');
        errors.push(role);
      } else {
        seenRoles[role.value] = i + 1;
      }

      members.push({
        position: i + 1,
        isLead: i === 0,
        name: name.value.trim(),
        email: mail,
        phone: tel,
        course: course.value.trim(),
        roleId: role.value,
        role: roleName(role.value)
      });
    });

    var agreeIds = ['agreeSize', 'agreeClock', 'agreeAI', 'agreeOriginal'];
    var unchecked = agreeIds.filter(function (id) { return !document.getElementById(id).checked; });
    if (unchecked.length) {
      setError('agree', 'All four agreements are required before you can register.');
      errors.push(document.getElementById(unchecked[0]));
    }

    var tools = Array.prototype.slice.call(document.querySelectorAll('input[name="aiTool"]:checked'))
      .map(function (b) { return b.value; });
    var other = document.getElementById('aiOther').value.trim();
    if (other) tools = tools.concat(other.split(',').map(function (s) { return s.trim(); }).filter(Boolean));

    return {
      errors: errors,
      entry: {
        ref: '',
        submittedAt: new Date().toISOString(),
        teamName: teamName.value.trim(),
        institution: institution.value.trim(),
        theme: theme.value,
        teamSize: members.length,
        members: members,
        aiTools: tools,
        agreements: {
          teamSize: document.getElementById('agreeSize').checked,
          clock: document.getElementById('agreeClock').checked,
          aiPolicy: document.getElementById('agreeAI').checked,
          noPriorWork: document.getElementById('agreeOriginal').checked
        }
      }
    };
  }

  function roleName(id) {
    for (var i = 0; i < I.roles.length; i++) {
      if (I.roles[i].id === id) return I.roles[i].name;
    }
    return '';
  }

  function makeRef(teamName) {
    var slug = (teamName.toUpperCase().replace(/[^A-Z0-9]/g, '') + 'XXX').slice(0, 3);
    var rand = Math.floor(Math.random() * 9000 + 1000);
    return 'ID60-' + slug + '-' + rand;
  }

  /* ---- storage ----------------------------------------------------------- */

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function writeStore(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function duplicateName(name) {
    var key = name.toLowerCase();
    return readStore().some(function (r) {
      return (r.teamName || '').toLowerCase() === key;
    });
  }

  /* ---- submit ------------------------------------------------------------ */

  function submit(e) {
    e.preventDefault();
    clearFieldErrors();
    statusEl.textContent = '';
    statusEl.classList.remove('error');

    var result = collect();
    if (result.errors.length) {
      statusEl.textContent = result.errors.length + ' field' +
        (result.errors.length > 1 ? 's need' : ' needs') + ' attention.';
      statusEl.classList.add('error');
      result.errors[0].focus();
      result.errors[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    var entry = result.entry;

    if (!cfg.endpoint && duplicateName(entry.teamName)) {
      setError('teamName', 'A team with this name is already registered from this device.');
      document.getElementById('teamName').focus();
      statusEl.textContent = 'Duplicate team name.';
      statusEl.classList.add('error');
      return;
    }

    entry.ref = makeRef(entry.teamName);
    submitBtn.disabled = true;
    statusEl.classList.remove('error');
    statusEl.textContent = 'Submitting…';

    send(entry).then(function () {
      lastEntry = entry;
      showSuccess(entry);
    }).catch(function (err) {
      submitBtn.disabled = false;
      statusEl.textContent = 'Could not submit: ' + err.message + ' Try again, or contact an organiser.';
      statusEl.classList.add('error');
    });
  }

  function send(entry) {
    if (!cfg.endpoint) {
      var list = readStore();
      list.push(entry);
      if (!writeStore(list)) {
        return Promise.reject(new Error('this browser refused to save the entry.'));
      }
      return Promise.resolve();
    }

    return fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(entry)
    }).then(function (res) {
      if (!res.ok) throw new Error('the server replied ' + res.status + '.');
      // Keep a local copy too, so the team can re-download their entry.
      var list = readStore();
      list.push(entry);
      writeStore(list);
    });
  }

  function showSuccess(entry) {
    form.hidden = true;
    successPanel.hidden = false;
    document.getElementById('refCode').textContent = entry.ref;

    var detail = document.getElementById('successDetail');
    detail.textContent = '';

    var p = el('p');
    p.appendChild(document.createTextNode(entry.teamName + ' · ' + entry.institution + ' · '));
    p.appendChild(document.createTextNode(entry.teamSize + (entry.teamSize === 1 ? ' member' : ' members')));
    detail.appendChild(p);

    var ul = el('ul', 'ticks');
    entry.members.forEach(function (m) {
      ul.appendChild(el('li', null, m.name + ' — ' + m.role + (m.isLead ? ' (team lead)' : '')));
    });
    detail.appendChild(ul);

    detail.appendChild(el('p', null,
      entry.aiTools.length
        ? 'AI tools declared: ' + entry.aiTools.join(', ') + '. Repeat this list on your final slide.'
        : 'No AI tools declared. If that changes on the day, say so on your final slide.'));

    if (!cfg.endpoint) {
      detail.appendChild(el('p', null,
        'This site is running without a submission endpoint, so your entry is saved in this ' +
        'browser only. Download it and send it to the organisers to be safe.'));
    }

    successPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function download() {
    if (!lastEntry) return;
    var blob = new Blob([JSON.stringify(lastEntry, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = lastEntry.ref + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function reset() {
    form.reset();
    membersHost.textContent = '';
    memberSeq = 0;
    addMember();
    clearFieldErrors();
    setError('members', '');
    setError('agree', '');
    statusEl.textContent = '';
    statusEl.classList.remove('error');
    submitBtn.disabled = false;
    successPanel.hidden = true;
    form.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---- organiser export (local mode) ------------------------------------- */

  window.IdeathonAdmin = {
    list: function () { return readStore(); },
    clear: function () { localStorage.removeItem(STORE_KEY); return 'cleared'; },
    csv: function () {
      var rows = readStore();
      var head = ['ref', 'submittedAt', 'teamName', 'institution', 'theme', 'teamSize',
        'memberPosition', 'memberName', 'memberEmail', 'memberPhone', 'memberCourse', 'memberRole', 'aiTools'];
      var lines = [head.join(',')];
      rows.forEach(function (r) {
        r.members.forEach(function (m) {
          lines.push([r.ref, r.submittedAt, r.teamName, r.institution, r.theme, r.teamSize,
            m.position, m.name, m.email, m.phone, m.course, m.role, r.aiTools.join(' | ')]
            .map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; })
            .join(','));
        });
      });
      return lines.join('\n');
    },
    downloadCsv: function () {
      var blob = new Blob([window.IdeathonAdmin.csv()], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'ideathon-registrations.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return 'downloading';
    }
  };

  /* ---- boot -------------------------------------------------------------- */

  fillThemes();
  fillAiTools();
  addMember();

  addBtn.addEventListener('click', addMember);
  form.addEventListener('submit', submit);
  document.getElementById('downloadBtn').addEventListener('click', download);
  document.getElementById('anotherBtn').addEventListener('click', reset);

  var note = document.getElementById('storageNote');
  if (note) {
    note.textContent = cfg.endpoint
      ? 'Your details are sent to the organisers and used only to run this event.'
      : 'No submission endpoint is configured, so entries are stored in this browser only. ' +
        'Organisers: see README.md to connect a form endpoint before the event opens.';
  }
})();
