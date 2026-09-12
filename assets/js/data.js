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

    startsAt: '14:30',      // 24-hour; the wall clock shown on the timeline
    endsAt: '16:00',
    timeRange: '2:30 – 4:00 pm',
    contactEmail: '',       // shown in the footer when set
    maxTeamSize: 4,
    minTeamSize: 3,
    totalMinutes: 90,

    // Pitch block maths — used by the pod planner on the schedule.
    pitchBlockMinutes: 24,
    pitchMinutesPerTeam: 2,
    qaMinutesPerTeam: 1
  };

  /* ---- the 90 minutes ---------------------------------------------------- */
  /* ai: 'yes'  -> AI tools permitted in this phase
     ai: 'no'   -> AI tools must be closed
     ai: 'n/a'  -> nothing to police                                          */

  var schedule = [
    {
      start: 0, minutes: 5, name: 'Check-in & Brief',
      ai: 'n/a',
      what: 'The challenges are revealed. Pick one. The timer starts and does not stop.',
      owner: 'Organisers'
    },
    {
      start: 5, minutes: 15, name: 'Discover',
      ai: 'yes',
      what: 'Understand the problem and who it hurts. Facts, numbers, prior art. Breadth over depth.',
      owner: 'Researcher leads · Lead times the box'
    },
    {
      start: 20, minutes: 8, name: 'Decide',
      ai: 'no',
      what: 'Screens down. Pick one idea out loud and write it as a single sentence.',
      owner: 'Whole team · Lead writes the sentence'
    },
    {
      start: 28, minutes: 15, name: 'Design',
      ai: 'yes',
      what: 'How it works, who pays, why it is feasible. Sketch the one diagram the deck needs.',
      owner: 'Researcher · Problem Analyst · Lead'
    },
    {
      start: 43, minutes: 20, name: 'Deck',
      ai: 'yes',
      what: 'Five slides: Problem · Idea · How it works · Impact · Ask. The Lead rehearses out loud.',
      owner: 'Presentation Maker owns the file'
    },
    {
      start: 63, minutes: 3, name: 'Submit',
      ai: 'n/a',
      what: 'Hard cutoff. Upload the deck. Late files are not judged.',
      owner: 'Presentation Maker submits · Lead confirms'
    },
    {
      start: 66, minutes: 24, name: 'Pitch & Q&A',
      ai: 'no',
      what: '2 minutes to pitch, 1 minute of questions. Notes off.',
      owner: 'Lead pitches · the whole team takes questions'
    }
  ];

  /* ---- team roles (rule 1.5) --------------------------------------------- */

  /* Five roles. Every member takes exactly one; a team must cover Team Lead,
     Presentation Maker and Researcher. Two members may share a role. */

  var roles = [
    {
      id: 'lead',
      name: 'Team Lead',
      required: true,
      short: 'Owns the clock and the pitch.',
      summary:
        'The Lead makes sure the team ships something. They keep every phase inside its box, force the decision at minute 20, and deliver the pitch at the end. This is the role that fails a team most easily, because a team that overruns Discover has already lost.',
      owns: [
        'The running clock — calls each phase change out loud',
        'The one-sentence idea statement',
        'The 2-minute pitch and the first answer in Q&A',
        'The final call when the team is split'
      ],
      delivers: [
        'Idea statement (one sentence, written down)',
        'Pitch delivered in 2:00 or under',
        'AI disclosure line agreed with the team'
      ],
      minutes: [
        { t: '00–05', do: 'Confirm roles aloud. Set a visible timer for all seven phases.' },
        { t: '05–20', do: 'Keep Discover on the problem, not on solutions. Call time at 19:00.' },
        { t: '20–28', do: 'Run the decision. Take one vote, break ties yourself, write the sentence.' },
        { t: '28–43', do: 'Pressure-test feasibility. Kill anything unbuildable.' },
        { t: '43–63', do: 'Rehearse out loud twice while the deck is built. Do not touch the file.' },
        { t: '63–66', do: 'Confirm the submission actually went through before you sit down.' },
        { t: '66–90', do: 'Pitch. Answer first, then hand technical questions to the Researcher.' }
      ],
      ai: 'May use AI during Discover and Design for background, never to write the pitch. The words in the room have to be yours — judges will ask a follow-up and a memorised paragraph collapses.',
      avoid: [
        'Building slides yourself — that is not your job and the clock will eat you',
        'Letting Discover run past 20:00 "because we are nearly there"',
        'Reading the pitch off a screen'
      ]
    },
    {
      id: 'presenter',
      name: 'Presentation Maker',
      required: true,
      short: 'Owns the five slides and the submission.',
      summary:
        'The Presentation Maker turns a decided idea into five slides a judge can read from the back row. They are the only person with the file open after minute 43, and the one who presses submit before the cutoff at 3:36 pm.',
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
        { t: '00–05', do: 'Open a blank five-slide skeleton before the brief ends. Title the slides now.' },
        { t: '05–20', do: 'Listen and capture. Drop raw notes straight into speaker notes.' },
        { t: '20–28', do: 'Screen down. Take part in the decision — you have to be able to tell the story.' },
        { t: '28–43', do: 'Draft slides 1 and 2 while Design is still running. Do not wait for a finished idea.' },
        { t: '43–63', do: 'Build. AI is permitted for layout, wording and imagery. Stop building at 61:00.' },
        { t: '63–66', do: 'Submit. Then confirm the upload with the Lead.' },
        { t: '66–90', do: 'Drive the slides during the pitch. Take design and impact questions.' }
      ],
      ai: 'AI is permitted for presentation-making: slide copy, layout, summarising notes and generating imagery — any app you like, on either device. Everything on the slide must be checked by you, and every tool used goes in the disclosure line.',
      avoid: [
        'More than five slides, or a wall of text on any of them',
        'Restyling the deck after 61:00 instead of submitting',
        'Using an image you cannot explain the origin of'
      ]
    },
    {
      id: 'researcher',
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
        { t: '00–05', do: 'Open your research apps and sign in. Have them ready before the timer starts.' },
        { t: '05–20', do: 'Hunt facts and prior art. Timebox each search to 2 minutes. Note sources as you go.' },
        { t: '20–28', do: 'Apps closed. Argue for the strongest idea, then commit to the team\'s choice.' },
        { t: '28–43', do: 'Name the tech. Be honest about what would take longer than a week.' },
        { t: '43–63', do: 'Hand facts to the Presentation Maker. Verify every number that goes on a slide.' },
        { t: '63–66', do: 'Check the deck states sources correctly.' },
        { t: '66–90', do: 'Take the feasibility and technical questions in Q&A.' }
      ],
      ai: 'AI is permitted for research in Discover and Design. Verify anything you put on a slide against a real source — a fabricated statistic in Q&A ends the pitch. Record which apps you used for the disclosure.',
      avoid: [
        'Pasting AI output onto a slide unread',
        'Quoting a number you cannot name a source for',
        'Still researching at minute 50'
      ]
    },
    {
      id: 'innovation',
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
        'Three or more real alternatives on the table by minute 20',
        'A one-line answer to "why is this different?"',
        'One deliberate stress-test of the chosen idea'
      ],
      minutes: [
        { t: '00–05', do: 'Read the challenges for angles nobody else will take.' },
        { t: '05–20', do: 'Generate options while the Researcher gathers evidence. Quantity first.' },
        { t: '20–28', do: 'Put the alternatives up. Argue hardest for the least obvious one, then back the team\'s call.' },
        { t: '28–43', do: 'Attack your own idea. Find the failure mode before a judge does.' },
        { t: '43–63', do: 'Write the originality line for the deck. Help the Lead rehearse the hard questions.' },
        { t: '63–66', do: 'Quiet. The deck is the Presentation Maker\'s to submit.' },
        { t: '66–90', do: 'Take "why not just use X?" questions in Q&A.' }
      ],
      ai: 'AI is useful in Discover for surveying what already exists, so you know what "different" means. It is closed during Decide — that block is exactly the one you are here to run well, and it has to be the team\'s own thinking.',
      avoid: [
        'Falling in love with your own alternative after the team has decided',
        'Being different for its own sake — originality without feasibility scores nothing',
        'Reopening the decision after minute 28'
      ]
    },
    {
      id: 'analyst',
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
        { t: '00–05', do: 'Write down the challenge in your own words before anyone proposes a solution.' },
        { t: '05–20', do: 'Work with the Researcher: who is affected, how many, how badly.' },
        { t: '20–28', do: 'Hold the team to the problem. Reject ideas that solve a symptom.' },
        { t: '28–43', do: 'Define what is in scope and what is not. Shape the impact claim.' },
        { t: '43–63', do: 'Own slides 1 and 4 with the Presentation Maker. Keep the impact number defensible.' },
        { t: '63–66', do: 'Last read of the problem slide. Would a stranger understand it?' },
        { t: '66–90', do: 'Take "how big is this problem really?" questions in Q&A.' }
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
      how: 'One Team Lead, one Presentation Maker, one Researcher. All three must be filled.'
    },
    {
      size: 4,
      label: 'Four members (maximum)',
      how: 'The same three, plus an Innovation Lead or a Problem Analyst — or a second person in any role you want doubled.'
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
        'Every member takes one of the five roles below, named at registration. A team must include a Team Lead, a Presentation Maker and a Researcher; beyond that choose freely, and two members may share a role.'
      ]
    },
    {
      id: 'clock',
      title: 'The clock',
      items: [
        'The ninety minutes start at 2:30 pm when the challenges are read out, and do not stop for anything.',
        'The seven phases are fixed. You may work ahead inside your own team, but no phase is extended.',
        'Submission closes at minute 66 — 3:36 pm. A deck that arrives a minute later is not judged.',
        'The pitch is 2 minutes with a hard stop, followed by 1 minute of questions.',
        'If your team is not present when called to pitch, your slot is forfeited.'
      ]
    },
    {
      id: 'prep',
      title: 'Preparation',
      items: [
        'The challenges are revealed at minute zero and your team picks one. Nobody sees them in advance.',
        'No pre-built decks, no pre-chosen ideas, no work started before the timer. This is the one rule that removes a team rather than costing it marks.',
        'An empty slide template is fine. A template with your content already in it is not.',
        'A phone is enough for all of it — research, slides and submission. A laptop is allowed, not required; bring whichever you work faster on.',
        'Install and sign in to the apps you plan to use before you arrive — AI tools, slide apps, whatever you like. Downloading and logging in on the day comes out of your hour.'
      ]
    },
    {
      id: 'ai',
      title: 'Using AI',
      items: [
        'Any AI app you like, in Discover (05–20), Design (28–43) and Deck (43–63): research, background, slide copy, layout and imagery. Build the deck on whichever device you brought.',
        'AI is closed during Decide (20–28). Screens down — phones face down, laptop lids shut. The idea has to be the team\'s own choice.',
        'AI is closed during the pitch and Q&A (66–90). No live prompting, no reading generated answers, no earpieces.',
        'Name every AI tool you used on your final slide. Disclosure costs nothing; an undisclosed tool found in Q&A disqualifies the pitch.',
        'Verify anything you put on a slide. A fabricated statistic ends the pitch at the moment it is caught.',
        'AI output presented as a working prototype or as your own original research is treated as cheating, not as a shortcut.'
      ]
    },
    {
      id: 'submission',
      title: 'Submission',
      items: [
        'Exactly five slides: Problem · Idea · How it works · Impact · Ask. A sixth slide is not read.',
        'Submit as PDF or PPTX, named with your team name. Phone or laptop, whichever you built it on.',
        'One submission per team. If you upload twice, the last file before the cutoff is the one judged.',
        'Check your upload went through before you sit down. "It did not upload" is not an appeal.'
      ]
    },
    {
      id: 'judging',
      title: 'Judging',
      items: [
        'Problem clarity — 20 marks. Do you understand who hurts, and how much?',
        'Originality — 25 marks. Is this more than the first idea anyone would have?',
        'Feasibility — 25 marks. Could this actually be built, by someone, for a plausible cost?',
        'Pitch and Q&A — 30 marks. Can you explain it and defend it under questioning?',
        'Slide design earns nothing on its own. An unreadable slide loses marks under clarity.',
        'Ties are broken by the Pitch and Q&A score. The judges\' decision is final.'
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
      'Research during Discover and Design — any AI app, for background, prior art and summarising sources.',
      'Presentation-making during Deck — any AI slide tool, for copy, layout and imagery.',
      'Spelling, grammar and translation, any working phase.'
    ],
    notAllowed: [
      'Decide (20–28). Screens down, phones face down — choosing the idea is judged as your own work.',
      'Pitch and Q&A (66–90). No live prompting, no generated answers, no earpieces.',
      'Any fact, figure or quote nobody on the team has verified.',
      'AI output presented as a working prototype or original research.'
    ],
    disclosure:
      'Name every AI tool you used on your last slide. Disclosure costs nothing. An undisclosed tool found in Q&A disqualifies the pitch.'
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

  /* "2:30 – 2:35 pm" rather than "2:30 pm – 2:35 pm": drop the meridiem from the
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
    pitchCapacity: pitchCapacity
  };
})();
