/* Bridge Building Challenge — rule book content and rendering.
 *
 * A sibling event to the Ideathon: same site, same styles, its own rules.
 * Everything a rule refers to lives here, so the page is data with a
 * renderer rather than hand-written markup.
 */

window.BRIDGE = (function () {
  'use strict';

  var config = {
    name: 'Bridge Building Challenge',
    icon: '🏗️',
    date: 'Monday, 14 September 2026',
    timeRange: '1:30 – 2:30 pm',
    totalMinutes: 60,
    maxSticks: 50,
    minTeam: 2,
    maxTeam: 4
  };

  /* Section 4. Wall-clock times are the ones that matter on the day, so they
     lead; the minute counts are derived from them and must agree. */
  var phases = [
    { id: 'brief', from: '1:30', to: '1:35', minutes: 5, name: 'Rules briefing & material distribution',
      note: 'Rules read out, materials handed over. Check your kit now, not later.' },
    { id: 'build', from: '1:35', to: '2:15', minutes: 40, name: 'Bridge construction',
      note: 'The whole build. Forty minutes, no extensions.' },
    { id: 'submit', from: '2:15', to: '2:20', minutes: 5, name: 'Final submission & inspection',
      note: 'Hands off. Judges check materials and count sticks.' },
    { id: 'test', from: '2:20', to: '2:28', minutes: 8, name: 'Load testing',
      note: 'Each bridge tested individually, load added gradually.' },
    { id: 'results', from: '2:28', to: '2:30', minutes: 2, name: 'Results & announcement',
      note: 'Scores read out.' }
  ];

  var materials = [
    { item: 'Ice-cream sticks', qty: '50', note: 'The hard cap. Using more is a disqualification.' },
    { item: 'Glue', qty: '30–50 g', note: '' },
    { item: 'Paper tape', qty: '1 metre', note: '' },
    { item: 'Ruler', qty: '1', note: '' },
    { item: 'Pencil', qty: '1', note: '' },
    { item: 'Scissors', qty: '1 pair', note: '' }
  ];

  var criteria = [
    { name: 'Load-bearing capacity', marks: 20 },
    { name: 'Structural stability', marks: 10 },
    { name: 'Design & creativity', marks: 8 },
    { name: 'Efficient use of 50 sticks', marks: 5 },
    { name: 'Neatness & workmanship', marks: 4 },
    { name: 'Time management', marks: 3 }
  ];

  var sections = [
    {
      id: 'objective',
      title: 'Objective',
      lead: 'Each team designs and constructs a bridge from the materials provided. It is judged on strength, stability, creativity and efficient use of materials.'
    },
    {
      id: 'team',
      title: 'Team size',
      items: [
        'Each team must consist of 2 to 4 participants.',
        'Only registered team members may take part.',
        'A participant can be a member of only one team.'
      ]
    },
    {
      id: 'registration',
      title: 'Registration rules',
      items: [
        'All teams must complete registration before the event.',
        'Each team must give a team name and the names of all members.',
        'Changing team members after registration needs approval from the organising committee.',
        'Report to the venue before the starting time.',
        'Only registered participants may take part.'
      ]
    },
    {
      id: 'time',
      title: 'Event time',
      kind: 'phases',
      lead: 'One hour, 1:30 to 2:30 pm. Construction time is 40 minutes.',
      items: ['At 2:15 pm no further modifications are allowed — hands off the bridge.']
    },
    {
      id: 'materials',
      title: 'Materials per team',
      kind: 'materials',
      lead: 'Supplied by the organisers. Nothing else may be used.'
    },
    {
      id: 'construction',
      title: 'Construction rules',
      items: [
        'Use only the materials provided by the organisers.',
        'A maximum of 50 ice-cream sticks may be used.',
        'Complete the bridge within the 40-minute construction period.',
        'Materials cannot be exchanged or borrowed between teams.',
        'The bridge must be constructed at your designated workstation.',
        'The bridge must span the specified gap with no additional support in the middle.',
        'The bridge must be stable enough for load testing.',
        'When time is called, stop construction immediately.'
      ]
    },
    {
      id: 'requirements',
      title: 'Bridge requirements',
      items: [
        'Maximum sticks: 50.',
        'Stick length: approximately 11–12 cm.',
        'Bridge span: as specified by the organisers on the day.',
        'Bridge width: as specified by the organisers on the day.',
        'The bridge must remain standing during testing.'
      ]
    },
    {
      id: 'testing',
      title: 'Load testing',
      items: [
        'Bridges are tested individually.',
        'The load is added gradually.',
        'The maximum successfully supported load is recorded.',
        'Testing stops if the bridge collapses or becomes unsafe.',
        'The judges determine the final load score.'
      ]
    },
    {
      id: 'judging',
      title: 'Judging criteria',
      kind: 'criteria',
      lead: 'Fifty marks in total.'
    },
    {
      id: 'disqualification',
      title: 'Disqualification',
      lead: 'A team may be disqualified if:',
      items: [
        'Unauthorised materials are used.',
        'More than 50 ice-cream sticks are used.',
        'Materials are taken from another team.',
        'Outside assistance is received.',
        'Another team\'s bridge is intentionally damaged.',
        'Construction continues after 2:15 pm.',
        'Any competition rule is violated.'
      ]
    },
    {
      id: 'winner',
      title: 'Winner',
      items: [
        'The team with the highest total score out of 50 is declared the winner.',
        'In a tie, the team with the higher load-bearing score is given preference.'
      ]
    },
    {
      id: 'decision',
      title: "Judge's decision",
      lead: 'The decision of the judges on scoring, load testing, rule violations and the final result is final.'
    }
  ];

  function totalMarks() {
    return criteria.reduce(function (a, c) { return a + c.marks; }, 0);
  }

  function scheduledMinutes() {
    return phases.reduce(function (a, p) { return a + p.minutes; }, 0);
  }

  function phase(id) {
    for (var i = 0; i < phases.length; i++) if (phases[i].id === id) return phases[i];
    return null;
  }

  function buildMinutes() {
    var p = phase('build');
    return p ? p.minutes : 0;
  }

  return {
    config: config,
    phases: phases,
    materials: materials,
    criteria: criteria,
    sections: sections,
    totalMarks: totalMarks,
    scheduledMinutes: scheduledMinutes,
    phase: phase,
    buildMinutes: buildMinutes
  };
})();

/* ---- rendering ---------------------------------------------------------- */

(function () {
  'use strict';

  var B = window.BRIDGE;
  var host = document.querySelector('[data-render="bridge-rules"]');
  if (!B || !host) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function phaseList() {
    var wrap = el('div', 'timeline');
    B.phases.forEach(function (p) {
      var row = el('div', 'phase');
      row.setAttribute('data-ai', 'n/a');

      var time = el('div', 'clock');
      time.appendChild(document.createTextNode(p.from + ' – ' + p.to));
      time.appendChild(el('span', 'dur', p.minutes + ' min'));
      row.appendChild(time);

      var body = el('div');
      body.appendChild(el('h3', null, p.name));
      if (p.note) body.appendChild(el('p', null, p.note));
      row.appendChild(body);

      wrap.appendChild(row);
    });
    return wrap;
  }

  function materialsTable() {
    var scroll = el('div', 'table-scroll');
    var table = el('table', 'stack-table');
    var thead = el('thead');
    var hr = el('tr');
    ['Material', 'Quantity', 'Note'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = el('tbody');
    B.materials.forEach(function (m) {
      var tr = el('tr');
      var td1 = el('td');
      td1.setAttribute('data-label', 'Material');
      td1.appendChild(el('span', 'role-name', m.item));
      tr.appendChild(td1);
      var td2 = el('td', null, m.qty);
      td2.setAttribute('data-label', 'Quantity');
      tr.appendChild(td2);
      var td3 = el('td', null, m.note);
      td3.setAttribute('data-label', 'Note');
      tr.appendChild(td3);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    return scroll;
  }

  function criteriaTable() {
    var scroll = el('div', 'table-scroll');
    var table = el('table', 'stack-table');
    var thead = el('thead');
    var hr = el('tr');
    ['Criterion', 'Marks'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = el('tbody');
    B.criteria.forEach(function (c) {
      var tr = el('tr');
      var td1 = el('td');
      td1.setAttribute('data-label', 'Criterion');
      td1.appendChild(el('span', 'role-name', c.name));
      tr.appendChild(td1);
      var td2 = el('td', null, String(c.marks));
      td2.setAttribute('data-label', 'Marks');
      tr.appendChild(td2);
      tbody.appendChild(tr);
    });

    var total = el('tr', 'total-row');
    var t1 = el('td');
    t1.setAttribute('data-label', 'Criterion');
    t1.appendChild(el('strong', null, 'Total'));
    total.appendChild(t1);
    var t2 = el('td');
    t2.setAttribute('data-label', 'Marks');
    t2.appendChild(el('strong', null, String(B.totalMarks())));
    total.appendChild(t2);
    tbody.appendChild(total);

    table.appendChild(tbody);
    scroll.appendChild(table);
    return scroll;
  }

  B.sections.forEach(function (sec, si) {
    var block = el('section', 'rule-section');
    block.id = sec.id;

    var head = el('header', 'rule-head');
    head.appendChild(el('span', 'rule-no', String(si + 1)));
    head.appendChild(el('h2', null, sec.title));
    block.appendChild(head);

    if (sec.lead) block.appendChild(el('p', null, sec.lead));
    if (sec.kind === 'phases') block.appendChild(phaseList());
    if (sec.kind === 'materials') block.appendChild(materialsTable());
    if (sec.kind === 'criteria') block.appendChild(criteriaTable());

    if (sec.items && sec.items.length) {
      var ol = el('ol', 'rule-list');
      sec.items.forEach(function (text, ii) {
        var li = el('li');
        li.appendChild(el('span', 'rule-ref', (si + 1) + '.' + (ii + 1)));
        li.appendChild(el('span', 'rule-text', text));
        ol.appendChild(li);
      });
      block.appendChild(ol);
    }

    host.appendChild(block);
  });

  /* table of contents */
  var toc = document.querySelector('[data-render="bridge-toc"]');
  if (toc) {
    B.sections.forEach(function (sec, i) {
      var a = el('a', null, (i + 1) + '. ' + sec.title);
      a.href = '#' + sec.id;
      toc.appendChild(a);
    });
  }

  /* live figures, so the page cannot drift from the data */
  var marks = document.querySelector('[data-bind="bridge-marks"]');
  if (marks) marks.textContent = String(B.totalMarks());
  var sticks = document.querySelector('[data-bind="bridge-sticks"]');
  if (sticks) sticks.textContent = String(B.config.maxSticks);
  var build = document.querySelector('[data-bind="bridge-build"]');
  if (build) build.textContent = B.buildMinutes() + ' min';
  var date = document.querySelector('[data-bind="bridge-date"]');
  if (date) date.textContent = B.config.date;
  var time = document.querySelector('[data-bind="bridge-time"]');
  if (time) time.textContent = B.config.timeRange;
  var team = document.querySelector('[data-bind="bridge-team"]');
  if (team) team.textContent = B.config.minTeam + ' – ' + B.config.maxTeam;

  /* the stated total and the listed blocks disagree — say so rather than hide it */
  var gap = document.querySelector('[data-render="bridge-gap"]');
  if (gap) {
    var missing = B.config.totalMinutes - B.scheduledMinutes();
    if (missing === 0) {
      gap.hidden = true;
    } else {
      gap.textContent = '';
      gap.appendChild(el('h3', null, 'Organisers: ' + missing + ' minutes are unassigned'));
      gap.appendChild(el('p', null,
        'The blocks above come to ' + B.scheduledMinutes() + ' minutes against a stated total of ' +
        B.config.totalMinutes + '. Decide what the remaining ' + missing +
        ' minutes are for — briefing, setup and settling teams at workstations is the usual answer — and add it here before the day.'));
    }
  }
})();
