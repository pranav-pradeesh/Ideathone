/* Ideathon 60 — single source of truth for event config, schedule and roles.
   Edit this file to re-brand or re-time the event; every page reads from it. */

window.IDEATHON = (function () {
  'use strict';

  /* ---- organiser settings ------------------------------------------------ */

  var config = {
    name: 'Ideathon 60',
    tagline: 'One hour. One idea. Three people.',
    host: 'Nehru College of Engineering and Research Centre',
    hostShort: 'NCERC',
    hostGroup: 'Nehru Group of Institutions',
    date: 'TBA',            // e.g. '12 October 2026'
    venue: 'TBA',           // e.g. 'Seminar Hall, Block C'
    contactEmail: '',       // shown in the footer when set
    maxTeamSize: 3,
    minTeamSize: 1,
    totalMinutes: 60,

    // Pitch block maths — used by the pod planner on the schedule.
    pitchBlockMinutes: 12,
    pitchMinutesPerTeam: 2,
    qaMinutesPerTeam: 1
  };

  /* ---- the 60 minutes ---------------------------------------------------- */
  /* ai: 'yes'  -> AI tools permitted in this phase
     ai: 'no'   -> AI tools must be closed
     ai: 'n/a'  -> nothing to police                                          */

  var schedule = [
    {
      start: 0, minutes: 5, name: 'Check-in & Brief',
      ai: 'n/a',
      what: 'Problem statement revealed. The timer starts and does not stop.',
      owner: 'Organisers'
    },
    {
      start: 5, minutes: 10, name: 'Discover',
      ai: 'yes',
      what: 'Understand the problem and who it hurts. Facts, numbers, prior art. Breadth over depth.',
      owner: 'Researcher leads · Lead times the box'
    },
    {
      start: 15, minutes: 5, name: 'Decide',
      ai: 'no',
      what: 'Laptops down. Pick one idea out loud and write it as a single sentence.',
      owner: 'Whole team · Lead writes the sentence'
    },
    {
      start: 20, minutes: 10, name: 'Design',
      ai: 'yes',
      what: 'How it works, who pays, why it is feasible. Sketch the one diagram the deck needs.',
      owner: 'Researcher + Lead'
    },
    {
      start: 30, minutes: 15, name: 'Deck',
      ai: 'yes',
      what: 'Five slides: Problem · Idea · How it works · Impact · Ask. The Lead rehearses out loud.',
      owner: 'Storyteller owns the file'
    },
    {
      start: 45, minutes: 3, name: 'Submit',
      ai: 'n/a',
      what: 'Hard cutoff. Upload the deck. Late files are not judged.',
      owner: 'Storyteller submits · Lead confirms'
    },
    {
      start: 48, minutes: 12, name: 'Pitch & Q&A',
      ai: 'no',
      what: '2 minutes to pitch, 1 minute of questions. Notes off.',
      owner: 'Lead pitches · all three take questions'
    }
  ];

  /* ---- team roles (rule 1.5) --------------------------------------------- */

  var roles = [
    {
      id: 'lead',
      name: 'Team Lead & Pitcher',
      short: 'Owns the clock and the last 3 minutes.',
      summary:
        'The Lead makes sure the team ships something. They keep every phase inside its box, force the decision at minute 15, and deliver the pitch at the end. This is the role that fails the team most easily, because a team that overruns Discover has already lost.',
      owns: [
        'The running clock — calls each phase change out loud',
        'The one-sentence idea statement written at minute 20',
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
        { t: '05–15', do: 'Keep Discover on the problem, not on solutions. Call time at 14:00.' },
        { t: '15–20', do: 'Run the decision. Take one vote, break ties yourself, write the sentence.' },
        { t: '20–30', do: 'Pressure-test feasibility with the Researcher. Kill anything unbuildable.' },
        { t: '30–45', do: 'Rehearse out loud twice while the deck is built. Do not touch the file.' },
        { t: '45–48', do: 'Confirm the submission actually went through before you sit down.' },
        { t: '48–60', do: 'Pitch. Answer first, then hand technical questions to the Researcher.' }
      ],
      ai: 'May use AI during Discover and Design for background, never to write the pitch. The words in the room have to be yours — judges will ask a follow-up and a memorised paragraph collapses.',
      avoid: [
        'Building slides yourself — that is not your job and the clock will eat you',
        'Letting Discover run past 15:00 "because we are nearly there"',
        'Reading the pitch off a screen'
      ]
    },
    {
      id: 'researcher',
      name: 'Researcher & Solution Architect',
      short: 'Owns the facts and the "how".',
      summary:
        'The Researcher supplies the evidence that makes the idea credible and the architecture that makes it buildable. They are the team\'s AI power user during the permitted phases — and the person accountable for every number that ends up on a slide.',
      owns: [
        'Problem evidence: who is affected, how many, what it costs today',
        'Existing solutions and why they fall short',
        'The how-it-works explanation and the one diagram',
        'Feasibility: tech, cost and time honesty'
      ],
      delivers: [
        'Three to five hard facts with sources named',
        'The "how it works" flow for slide 3',
        'A one-line answer to "why has nobody done this?"'
      ],
      minutes: [
        { t: '00–05', do: 'Open your research tools. Have them ready before the timer starts.' },
        { t: '05–15', do: 'Hunt facts and prior art. Timebox each search to 2 minutes. Note sources as you go.' },
        { t: '15–20', do: 'Tools closed. Argue for the strongest idea, then commit to the team\'s choice.' },
        { t: '20–30', do: 'Draw the flow. Name the tech. Be honest about what would take longer than a week.' },
        { t: '30–45', do: 'Hand facts and the diagram to the Storyteller. Verify every number that goes on a slide.' },
        { t: '45–48', do: 'Check the deck states sources correctly.' },
        { t: '48–60', do: 'Take the feasibility and technical questions in Q&A.' }
      ],
      ai: 'AI is permitted for research in Discover and Design. Verify anything you put on a slide against a real source — a fabricated statistic in Q&A ends the pitch. Record which tools you used for the disclosure.',
      avoid: [
        'Pasting AI output onto a slide unread',
        'Quoting a number you cannot name a source for',
        'Still researching at minute 35'
      ]
    },
    {
      id: 'storyteller',
      name: 'Storyteller & Deck Builder',
      short: 'Owns the five slides and the submission.',
      summary:
        'The Storyteller turns a decided idea into five slides that a judge can read from the back row. They are the only person with the file open after minute 30, and they are the one who presses submit before the cutoff at 48.',
      owns: [
        'The deck file and its structure',
        'Visual clarity: one message per slide, readable from 6 metres',
        'Submission before the hard cutoff',
        'The AI disclosure line in the deck'
      ],
      delivers: [
        'Five slides: Problem · Idea · How it works · Impact · Ask',
        'The deck submitted before 48:00',
        'A disclosure line naming every AI tool the team used'
      ],
      minutes: [
        { t: '00–05', do: 'Open a blank five-slide skeleton before the brief ends. Title the slides now.' },
        { t: '05–15', do: 'Listen and capture. Drop raw notes straight into speaker notes.' },
        { t: '15–20', do: 'Tools closed. Take part in the decision — you have to be able to tell the story.' },
        { t: '20–30', do: 'Draft slide 1 and 2 while Design is still running. Do not wait for a finished idea.' },
        { t: '30–45', do: 'Build. AI is permitted for layout, wording and imagery. Stop building at 43:00.' },
        { t: '45–48', do: 'Submit. Then confirm the upload with the Lead.' },
        { t: '48–60', do: 'Drive the slides during the pitch. Take design and impact questions.' }
      ],
      ai: 'AI is permitted for presentation-making: drafting slide copy, layout, summarising notes and generating imagery. Everything on the slide must be checked by you — and every tool used goes in the disclosure line.',
      avoid: [
        'More than five slides, or a wall of text on any of them',
        'Restyling the deck after 43:00 instead of submitting',
        'Using an image you cannot explain the origin of'
      ]
    }
  ];

  /* ---- fallbacks for short teams ----------------------------------------- */

  var teamShapes = [
    {
      size: 3,
      label: 'Three members (recommended)',
      how: 'One person per role.'
    },
    {
      size: 2,
      label: 'Two members',
      how: 'Lead and Storyteller. Split the Researcher\'s job between you: Lead takes the evidence, Storyteller takes the how.'
    },
    {
      size: 1,
      label: 'Solo',
      how: 'Run the same clock. Cut Design to five minutes and build three slides: Problem, Idea, Impact.'
    }
  ];

  /* ---- the rule book ----------------------------------------------------- */
  /* Numbered so an organiser can point at one during a dispute: "rule 5.2". */

  var rules = [
    {
      id: 'teams',
      title: 'Teams and entry',
      items: [
        'A team is one to three people. Three is the maximum and it is not negotiable.',
        'One person belongs to exactly one team. You cannot move between teams once registered.',
        'Register before the deadline. Walk-ins are admitted only if slots remain.',
        'Bring at least one working laptop per team, charged. There is no guarantee of a power socket.',
        'Every member takes one of the three roles below, and no two members of a team take the same one.'
      ]
    },
    {
      id: 'clock',
      title: 'The clock',
      items: [
        'The hour starts when the problem statement is read out and does not stop for anything.',
        'The seven phases are fixed. You may work ahead inside your own team, but no phase is extended.',
        'Submission closes at minute 48. A deck that arrives at 48:01 is not judged.',
        'The pitch is 2 minutes with a hard stop, followed by 1 minute of questions.',
        'If your team is not present when called to pitch, your slot is forfeited.'
      ]
    },
    {
      id: 'prep',
      title: 'Preparation',
      items: [
        'The problem statement is revealed at minute zero. Nobody sees it in advance.',
        'No pre-built decks, no pre-chosen ideas, no work started before the timer. This is the one rule that removes a team rather than costing it marks.',
        'An empty slide template is fine. A template with your content already in it is not.',
        'You may use any tool you already have installed. Setting it up is your own time.'
      ]
    },
    {
      id: 'ai',
      title: 'Using AI',
      items: [
        'AI is permitted in Discover (05–15), Design (20–30) and Deck (30–45): research, background, slide copy, layout and imagery.',
        'AI is closed during Decide (15–20). Laptops down — the idea has to be the team\'s own choice.',
        'AI is closed during the pitch and Q&A (48–60). No live prompting, no reading generated answers, no earpieces.',
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
        'Submit as PDF or PPTX, named with your team name.',
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
      'Research during Discover and Design — background, prior art, summarising sources.',
      'Presentation-making during Deck — slide copy, layout, imagery.',
      'Spelling, grammar and translation, any working phase.'
    ],
    notAllowed: [
      'Decide (15–20). Laptops down — choosing the idea is judged as your own work.',
      'Pitch and Q&A (48–60). No live prompting, no generated answers, no earpieces.',
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
    'EEE',
    'ECE'
  ];

  /* ---- helpers ----------------------------------------------------------- */

  function clock(mins) {
    var m = Math.floor(mins);
    return (m < 10 ? '0' : '') + m + ':00';
  }

  function pitchCapacity() {
    var per = config.pitchMinutesPerTeam + config.qaMinutesPerTeam;
    return Math.floor(config.pitchBlockMinutes / per);
  }

  return {
    config: config,
    schedule: schedule,
    roles: roles,
    rules: rules,
    teamShapes: teamShapes,
    aiPolicy: aiPolicy,
    branches: branches,
    clock: clock,
    pitchCapacity: pitchCapacity
  };
})();
