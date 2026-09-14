/* Ideathon 2026 — single source of truth for event config, schedule and roles.
   Edit this file to re-brand or re-time the event; every page reads from it. */

window.IDEATHON = (function () {
  'use strict';

  /* ---- organiser settings ------------------------------------------------ */

  var config = {
    name: 'Ideathon 2026',
    fullName: 'Engineering Day 2026 — Ideathon',
    tagline: 'Think. Innovate. Solve. Pitch.',
    host: 'Nehru College of Engineering and Research Centre',
    hostShort: 'NCERC',
    hostGroup: 'Nehru Group of Institutions',
    date: 'Monday, 14 September 2026',
    dateShort: 'Mon 14 Sep 2026',
    /* Registration is collected by a Google Form. Empty this string to fall
       back to the built-in form at register.html. */
    registrationUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeY4YYJUSAiQGr3_nyuRsarTzhUD1V4W2BIgDprQHytgmF_pg/viewform',

    minSlides: 3,
    maxSlides: 4,

    startsAt: '15:00',      // 24-hour; the wall clock shown on the timeline
    endsAt: '16:00',
    timeRange: '3:00 – 4:00 pm',
    contactEmail: '',       // shown in the footer when set
    maxTeamSize: 4,
    minTeamSize: 3,
    totalMinutes: 60,

    // Pitch block maths — used by the group planner on the schedule.
    // 13 teams x 2 minutes is 26 minutes of pitching against a 16-minute
    // block, so the teams pitch in parallel groups. See groupPlan() below.
    teamCount: 13,
    pitchBlockMinutes: 16,
    pitchMinutesPerTeam: 2,
    qaMinutesPerTeam: 0
  };

  /* ---- the 60 minutes ---------------------------------------------------- */
  /* ai: 'yes'  -> AI tools permitted in this phase
     ai: 'no'   -> AI tools must be closed
     ai: 'n/a'  -> nothing to police

     The split protects the two blocks that cannot compress. Presentations are
     2 minutes a team, so every minute cut there is half a team that does not
     get to pitch. Submission is a cutoff, not work. Everything else absorbs
     the shorter hour: the briefing is short because the rules are published
     in advance, and discovery takes the biggest proportional cut because
     teams arrive with candidate problems and discovery is where they
     overrun.                                                                */

  var schedule = [
    {
      start: 0, minutes: 3, name: 'Challenge briefing',
      ai: 'n/a',
      what: 'Format, rules and timing — a reminder, not a first read. The timer starts and does not stop.',
      owner: 'Organisers'
    },
    {
      start: 3, minutes: 12, name: 'Problem discovery & validation',
      ai: 'yes',
      what: 'Pick a real-world problem of your own. Establish who it affects and why it matters. Come with candidates; this block is for choosing, not searching.',
      owner: 'Problem Analyst leads · Researcher gathers evidence'
    },
    {
      start: 15, minutes: 15, name: 'Solution development',
      ai: 'yes',
      what: 'Build the idea: how it works, what makes it innovative, whether it is feasible.',
      owner: 'Whole team · Innovation Lead pushes past the obvious'
    },
    {
      start: 30, minutes: 12, name: 'Pitch preparation',
      ai: 'yes',
      what: 'Three or four slides, and a 2-minute pitch rehearsed out loud. Start the deck during development, not here.',
      owner: 'Presentation Maker owns the deck · Lead rehearses'
    },
    {
      start: 42, minutes: 2, name: 'Submission',
      ai: 'n/a',
      what: 'Hard cutoff. Upload the deck so every file is on the podium machine before pitching starts. Late files are not judged.',
      owner: 'Presentation Maker submits · Lead confirms'
    },
    {
      start: 44, minutes: 16, name: 'Presentations',
      ai: 'no',
      what: '2 minutes per team. The room splits into two groups presenting at the same time, each with its own judges. Notes off, no live prompting.',
      owner: 'Lead pitches · whole team on stage'
    }
  ];

  /* ---- team roles (rule 1.5) --------------------------------------------- */

  /* Five roles, fixed by position. Member 1 is the Team Lead, member 2 the
     Presentation Maker, member 3 the Researcher. A fourth member, if there is
     one, picks Innovation Lead or Problem Analyst. Nobody chooses the first
     three, so the three compulsory roles cannot be missing. */

  var roles = [
    {
      id: 'lead',
      position: 1,
      name: 'Team Lead',
      required: true,
      short: 'Owns the clock and the pitch.',
      summary:
        'The Lead makes sure the team ships something. They keep every phase inside its box, force the decision by minute 22, and deliver the pitch at the end. This is the role that fails a team most easily, because a team that overruns problem discovery has already lost.',
      owns: [
        'The running clock — calls each phase change out loud',
        'The one-sentence idea statement',
        'The 2-minute pitch, delivered inside the hard stop',
        'The final call when the team is split'
      ],
      delivers: [
        'Idea statement (one sentence, written down)',
        'Pitch delivered in 2:00 or under',
        'AI disclosure line agreed with the team'
      ],
      minutes: [
        { t: '00–03', do: 'Confirm the running order. Set a visible timer for all six phases.' },
        { t: '03–15', do: 'Keep the team on the problem, not on solutions. Call time at 14:00.' },
        { t: '15–30', do: 'Force a decision by 22:00, then defend it. Kill anything unbuildable.' },
        { t: '30–42', do: 'Rehearse the 2 minutes out loud, twice. Do not touch the deck file.' },
        { t: '42–44', do: 'Confirm the submission actually went through before you sit down.' },
        { t: '44–60', do: 'Pitch. Two minutes, hard stop — finish the sentence you are on.' }
      ],
      ai: 'May use AI during Discover and Design for background, never to write the pitch. The words in the room have to be yours — judges will ask a follow-up and a memorised paragraph collapses.',
      avoid: [
        'Building slides yourself — that is not your job and the clock will eat you',
        'Letting problem discovery run past 25:00 "because we are nearly there"',
        'Reading the pitch off a screen'
      ]
    },
    {
      id: 'presenter',
      position: 2,
      name: 'Presentation Maker',
      required: true,
      short: 'Owns the slides and the submission.',
      summary:
        'The Presentation Maker turns a decided idea into three or four slides a judge can read from the back row. They are the only person with the file open after minute 30, and the one who presses submit before the cutoff at 3:44 pm.',
      owns: [
        'The deck file and its structure',
        'Visual clarity: one message per slide, readable from 6 metres',
        'Submission before the hard cutoff',
        'The AI disclosure line in the deck'
      ],
      delivers: [
        'Five slides: Problem · Idea · How it works · Impact · Ask',
        'The deck submitted before 66:00',
        'A disclosure line naming every AI tool the team used'
      ],
      minutes: [
        { t: '00–03', do: 'Open a blank three-slide skeleton before the briefing ends. Title them now.' },
        { t: '03–15', do: 'Listen and capture. Drop raw notes straight into speaker notes.' },
        { t: '15–30', do: 'Draft the problem slide while the solution is still being argued.' },
        { t: '30–42', do: 'Build. Three or four slides, nothing more. Stop building at 41:00.' },
        { t: '42–44', do: 'Submit. Then confirm the upload with the Lead.' },
        { t: '44–60', do: 'Drive the slides during the pitch.' }
      ],
      ai: 'AI is permitted for presentation-making: slide copy, layout, summarising notes and generating imagery — any app you like, on either device. Everything on the slide must be checked by you, and every tool used goes in the disclosure line.',
      avoid: [
        'A fifth slide, or a wall of text on any of the four',
        'Restyling the deck after 68:00 instead of submitting',
        'Using an image you cannot explain the origin of'
      ]
    },
    {
      id: 'researcher',
      position: 3,
      name: 'Researcher',
      required: true,
      short: 'Owns the facts and the sources.',
      summary:
        'The Researcher supplies the evidence that makes the idea credible. They are the team\'s AI power user during the permitted phases — and the person accountable for every number that ends up on a slide.',
      owns: [
        'Evidence: who is affected, how many, what it costs today',
        'Existing solutions and why they fall short',
        'Feasibility: tech, cost and time honesty',
        'Sources for everything quoted'
      ],
      delivers: [
        'Three to five hard facts with sources named',
        'A one-line answer to "why has nobody done this?"',
        'Verification of every number on the deck'
      ],
      minutes: [
        { t: '00–03', do: 'Open your research apps and sign in before the timer starts.' },
        { t: '03–15', do: 'Evidence for the problem: who is affected, how many, what it costs today.' },
        { t: '15–30', do: 'Check the solution is feasible. Be honest about what would take longer than a week.' },
        { t: '30–42', do: 'Verify every number that goes on a slide. Name the source.' },
        { t: '42–44', do: 'Last check that the deck states its sources correctly.' },
        { t: '44–60', do: 'Be ready if a judge asks where a figure came from.' }
      ],
      ai: 'AI is permitted for research throughout the working phases. Verify anything you put on a slide against a real source — a fabricated statistic ends the entry the moment it is caught. Record which apps you used for the disclosure.',
      avoid: [
        'Pasting AI output onto a slide unread',
        'Quoting a number you cannot name a source for',
        'Still researching at minute 30'
      ]
    },
    {
      id: 'innovation',
      position: 4,
      name: 'Innovation Lead',
      required: false,
      short: 'Pushes the team past its first idea.',
      summary:
        'The first idea a team has is usually the obvious one, and obvious ideas score badly on originality — a quarter of the marks. The Innovation Lead generates alternatives on purpose, argues for the uncomfortable one, and owns the answer to "why is this different from what already exists?"',
      owns: [
        'Generating at least three distinct options before the team decides',
        'The case against the obvious first idea',
        'Originality: what makes this different from existing solutions',
        'The "what would make this fail?" question during Design'
      ],
      delivers: [
        'Three or more real alternatives on the table by minute 22',
        'A one-line answer to "why is this different?"',
        'One deliberate stress-test of the chosen idea'
      ],
      minutes: [
        { t: '00–03', do: 'Think about which problems the room will overlook.' },
        { t: '03–15', do: 'Generate problem candidates while the Analyst frames them. Quantity first.' },
        { t: '15–30', do: 'Put up three real alternatives, argue for the least obvious, then back the call.' },
        { t: '30–42', do: 'Write the innovation line for the deck — what makes this different.' },
        { t: '42–44', do: 'Quiet. The deck is the Presentation Maker\'s to submit.' },
        { t: '44–60', do: 'Listen to the other pitches. Note what scored well.' }
      ],
      ai: 'AI is useful in Discover for surveying what already exists, so you know what "different" means. It is closed during Decide — that block is exactly the one you are here to run well, and it has to be the team\'s own thinking.',
      avoid: [
        'Falling in love with your own alternative after the team has decided',
        'Being different for its own sake — originality without feasibility scores nothing',
        'Reopening the decision after minute 30'
      ]
    },
    {
      id: 'analyst',
      position: 4,
      name: 'Problem Analyst',
      required: false,
      short: 'Owns who hurts, and how much.',
      summary:
        'Problem clarity is twenty marks, and most teams lose them by describing a solution before they have described a problem. The Problem Analyst keeps the team honest about who is actually affected, how badly, and what the root cause is rather than the symptom.',
      owns: [
        'Who is affected, and how badly',
        'Root cause versus symptom',
        'Scoping: what this idea deliberately does not solve',
        'The impact claim on slide 4'
      ],
      delivers: [
        'A one-sentence problem statement naming a specific person or group',
        'The root cause, stated separately from the symptom',
        'An impact number the team can defend'
      ],
      minutes: [
        { t: '00–03', do: 'Have a way to write the problem down in one sentence.' },
        { t: '03–15', do: 'Own this block. Who is affected, how badly, root cause rather than symptom.' },
        { t: '15–30', do: 'Hold the team to the problem. Reject solutions that address a symptom.' },
        { t: '30–42', do: 'Own the problem and impact slides. Keep the impact number defensible.' },
        { t: '42–44', do: 'Last read of the problem slide. Would a stranger understand it?' },
        { t: '44–60', do: 'Be ready if a judge asks how big the problem really is.' }
      ],
      ai: 'AI is permitted in Discover and Design for framing and for finding who is affected. Any figure it gives you is unverified until the Researcher has a source for it.',
      avoid: [
        'A problem statement that could describe any college in the country',
        'An impact number nobody can explain the arithmetic behind',
        'Letting the team jump to a solution in the first five minutes'
      ]
    }
  ];

  /* ---- fallbacks for short teams ----------------------------------------- */

  /* ---- fallbacks for short teams ----------------------------------------- */

  var teamShapes = [
    {
      size: 3,
      label: 'Three members (minimum)',
      how: 'Team Lead, Presentation Maker, Researcher — in that order.'
    },
    {
      size: 4,
      label: 'Four members (maximum)',
      how: 'The same three, plus a fourth who is either the Innovation Lead or the Problem Analyst.'
    }
  ];

  /* ---- what participants get --------------------------------------------- */

  var perks = [
    { icon: '🏆', title: 'Prizes for winners', note: 'Awarded on the day.' },
    { icon: '📜', title: 'E-certificate', note: 'For every participant.' },
    { icon: '🤝', title: 'Team participation', note: 'One to three per team.' }
  ];

  /* ---- the rule book ----------------------------------------------------- */
  /* Numbered so an organiser can point at one during a dispute: "rule 5.2". */

  var rules = [
    {
      id: 'teams',
      title: 'Teams and entry',
      items: [
        'A team is three or four people. Three is the minimum, four the maximum; the fourth member is optional.',
        'One person belongs to exactly one team. You cannot move between teams once registered.',
        'Register before the deadline. Walk-ins are admitted only if slots remain.',
        'Bring a laptop or a mobile phone — whichever you prefer. At least one working device per team, ideally one each. There is no guarantee of a power socket, so arrive charged.',
        'Roles are fixed by position. Member 1 is the Team Lead, member 2 the Presentation Maker, member 3 the Researcher. A fourth member chooses Innovation Lead or Problem Analyst. Decide who sits where before you register.'
      ]
    },
    {
      id: 'clock',
      title: 'The clock',
      items: [
        'The hour starts at 3:00 pm, when the briefing begins, and does not stop for anything.',
        'The six phases are fixed. You may work ahead inside your own team, but no phase is extended.',
        'Submission closes at minute 44 — 3:44 pm. A deck that arrives a minute later is not judged.',
        'Each team presents for 2 minutes, with a hard stop. The judges score after each pitch.',
        'All thirteen teams pitch inside the same sixteen minutes, so the room splits into two groups that present at the same time in different corners. Each group has its own judges marking the same sheet. Your group and your slot are announced at the briefing.',
        'If your team is not present when called to pitch, your slot is forfeited.'
      ]
    },
    {
      id: 'prep',
      title: 'Preparation',
      items: [
        'You choose your own problem. Any real-world problem, picked on the day — there is no list to choose from and no theme to fit.',
        'No pre-built decks, no pre-chosen problems, no work started before the timer. This is the one rule that removes a team rather than costing it marks.',
        'An empty slide template is fine. A template with your content already in it is not.',
        'A phone is enough for all of it — research, slides and submission. A laptop is allowed, not required; bring whichever you work faster on.',
        'Install and sign in to the apps you plan to use before you arrive — AI tools, slide apps, whatever you like. Downloading and logging in on the day comes out of your sixty minutes.'
      ]
    },
    {
      id: 'ai',
      title: 'Using AI',
      items: [
        'Any AI app you like, throughout problem discovery, solution development and pitch preparation (03–42): research, background, slide copy, layout and imagery.',
        'AI is closed during the presentations (44–60). Screens down except the deck on the projector — no live prompting, no generated answers, no earpieces.',
        'The problem is yours to choose. A model may help you research it, but a team that cannot say why it picked its problem has not done the thinking the marks are for.',
        'Name every AI tool you used on your last slide. Disclosure costs nothing; an undisclosed tool found afterwards disqualifies the entry.',
        'Verify anything you put on a slide. A fabricated statistic ends the entry at the moment it is caught.',
        'AI output presented as a working prototype or as your own original research is treated as cheating, not as a shortcut.'
      ]
    },
    {
      id: 'submission',
      title: 'Submission',
      items: [
        'A PowerPoint of three or four slides — no fewer, no more. Between them cover the problem, your solution, what makes it innovative, its impact and its feasibility.',
        'Five things in four slides means combining them. A split that works: 1 Problem · 2 Solution · 3 Innovation and feasibility · 4 Impact. On three slides, fold impact into the solution.',
        'Submit the PowerPoint named with your team name. Phone or laptop, whichever you built it on.',
        'One submission per team. If you upload twice, the last file before the cutoff is the one judged.',
        'Check your upload went through before you sit down. "It did not upload" is not an appeal.'
      ]
    },
    {
      id: 'judging',
      title: 'Judging',
      items: [
        'Problem relevance — 20 marks. Is this a real problem, and does it matter to someone specific?',
        'Innovation — 20 marks. Is this more than the first idea anyone would have had?',
        'Effectiveness of the solution — 20 marks. Does it actually solve the problem you described?',
        'Feasibility — 15 marks. Could this be built, by someone, for a plausible cost?',
        'Impact — 15 marks. How much changes, and for how many people?',
        'Presentation — 10 marks. Clear, within 2 minutes, and understood by the room.',
        'Ties are broken by the Problem relevance score. The judges\' decision is final.'
      ]
    },
    {
      id: 'conduct',
      title: 'Conduct',
      items: [
        'Nobody outside your team contributes to your work — not a friend, not a senior, not a mentor.',
        'Do not disrupt another team. Curiosity is fine; leaning over their screen is not.',
        'Leave the room as you found it.',
        'Organisers may adjust timings for a genuine technical failure. That decision is theirs and applies to the whole room.'
      ]
    },
    {
      id: 'disqualification',
      title: 'What gets a team removed',
      items: [
        'Work prepared before the event.',
        'An AI tool used and not disclosed.',
        'Help from anyone outside the team.',
        'Presenting fabricated data or a fake prototype as real.',
        'Abusive or discriminatory content in a deck or a pitch.'
      ]
    }
  ];

  /* ---- AI policy --------------------------------------------------------- */

  var aiPolicy = {
    allowed: [
      'Research during problem discovery and solution development — any AI app, for background, prior art and summarising sources.',
      'Presentation-making during pitch preparation — any AI slide tool, for copy, layout and imagery.',
      'Spelling, grammar and translation, any working phase.'
    ],
    notAllowed: [
      'The presentations (44–60). No live prompting, no generated answers, no earpieces.',
      'Choosing the problem for you. A model may help you research it; the choice is the team\'s.',
      'Any fact, figure or quote nobody on the team has verified.',
      'AI output presented as a working prototype or original research.'
    ],
    disclosure:
      'Name every AI tool you used on your last slide. Disclosure costs nothing. An undisclosed tool found afterwards disqualifies the entry.'
  };

  /* Branches of study offered in the registration dropdown.
     Add or rename freely — the form rebuilds itself from this list. */

  var branches = [
    'Mechatronics',
    'Mechanical Engineering',
    'CSE A',
    'CSE B',
    'CSE AI/ML',
    'EEE',
    'ECE'
  ];

  /* ---- helpers ----------------------------------------------------------- */

  function clock(mins) {
    var m = Math.floor(mins);
    return (m < 10 ? '0' : '') + m + ':00';
  }

  /* The event runs at a fixed time, so the timeline shows the real clock as
     well as minutes elapsed. */
  function wallClock(mins) {
    var parts = String(config.startsAt || '00:00').split(':');
    var total = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0) + Math.floor(mins);
    var h24 = Math.floor(total / 60) % 24;
    var m = total % 60;
    var h = h24 % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + (h24 < 12 ? ' am' : ' pm');
  }

  function pitchCapacity() {
    var per = config.pitchMinutesPerTeam + config.qaMinutesPerTeam;
    return Math.floor(config.pitchBlockMinutes / per);
  }

  /* How the registered teams have to be split to fit the pitch block, and what
     that costs in judges and space. Single track if they fit; otherwise the
     smallest number of simultaneous groups that does. */
  function groupPlan(teams) {
    if (teams == null) teams = config.teamCount;
    var cap = pitchCapacity();
    var groups = Math.max(1, Math.ceil(teams / cap));
    var perGroup = Math.ceil(teams / groups);
    var per = config.pitchMinutesPerTeam + config.qaMinutesPerTeam;
    return {
      teams: teams,
      groups: groups,
      perGroup: perGroup,
      capacity: cap,
      groupMinutes: perGroup * per,
      singleTrackMinutes: teams * per,
      fitsSingleTrack: teams <= cap
    };
  }

  /* "3:00 – 3:03 pm" rather than "3:00 pm – 3:03 pm": drop the meridiem from the
     start when both ends share it. */
  function wallRange(start, end) {
    var a = wallClock(start), b = wallClock(end);
    var am = a.slice(-2), bm = b.slice(-2);
    return (am === bm ? a.slice(0, -3) : a) + ' – ' + b;
  }

  return {
    config: config,
    schedule: schedule,
    roles: roles,
    perks: perks,
    rules: rules,
    teamShapes: teamShapes,
    aiPolicy: aiPolicy,
    branches: branches,
    clock: clock,
    wallClock: wallClock,
    wallRange: wallRange,
    pitchCapacity: pitchCapacity,
    groupPlan: groupPlan
  };
})();
