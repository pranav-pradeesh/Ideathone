/* Ideathon 60 — single source of truth for event config, schedule and roles.
   Edit this file to re-brand or re-time the event; every page reads from it. */

window.IDEATHON = (function () {
  'use strict';

  /* ---- organiser settings ------------------------------------------------ */

  var config = {
    name: 'Ideathon 60',
    tagline: 'One hour. One idea. Three people.',
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
      what: 'Teams seated, roles confirmed, problem statement revealed. Timer starts and does not stop.',
      owner: 'Organisers'
    },
    {
      start: 5, minutes: 10, name: 'Discover',
      ai: 'yes',
      what: 'Understand the problem and who hurts from it. Gather facts, numbers and existing solutions. Breadth over depth — you get ten minutes, not ten hours.',
      owner: 'Researcher leads · Lead times the box'
    },
    {
      start: 15, minutes: 5, name: 'Decide',
      ai: 'no',
      what: 'Put the laptops down. Pick ONE idea out loud, as a team, and write it as a single sentence. This block is judged, so it has to be yours.',
      owner: 'Whole team · Lead writes the sentence'
    },
    {
      start: 20, minutes: 10, name: 'Design',
      ai: 'yes',
      what: 'Shape the solution: how it works, who pays, why it is feasible in the real world. Sketch the one diagram the deck will need.',
      owner: 'Researcher + Lead'
    },
    {
      start: 30, minutes: 15, name: 'Deck',
      ai: 'yes',
      what: 'Build exactly five slides: Problem · Idea · How it works · Impact · Ask. Storyteller drives the file while the Lead rehearses out loud.',
      owner: 'Storyteller owns the file'
    },
    {
      start: 45, minutes: 3, name: 'Submit',
      ai: 'n/a',
      what: 'Hard cutoff. Upload the deck and the AI disclosure line. Late files are not judged — no exceptions, the clock is the clock.',
      owner: 'Storyteller submits · Lead confirms'
    },
    {
      start: 48, minutes: 12, name: 'Pitch & Q&A',
      ai: 'no',
      what: '2 minutes to pitch, 1 minute of questions from the judges. Slides on screen, notes off. Answer from what you built, not from a model.',
      owner: 'Lead pitches · all three take questions'
    }
  ];

  /* ---- the role book ----------------------------------------------------- */

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
      how: 'One person per role, exactly as written in the role book.'
    },
    {
      size: 2,
      label: 'Two members',
      how: 'One takes Team Lead & Pitcher, the other takes Storyteller & Deck Builder. Split the Researcher duties: the Lead takes problem evidence, the Storyteller takes the how-it-works flow. Cut to four slides if you are behind at minute 40.'
    },
    {
      size: 1,
      label: 'Solo',
      how: 'You are the Lead. Run the same clock, but cut Design to five minutes and build three slides — Problem, Idea, Impact. Prioritise a clean pitch over a full deck.'
    }
  ];

  /* ---- AI policy --------------------------------------------------------- */

  var aiPolicy = {
    allowed: [
      'Research during Discover (05–15) and Design (20–30): background, prior art, definitions, summarising sources.',
      'Presentation-making during Deck (30–45): slide copy, layout, restructuring notes, generated or edited imagery.',
      'Spelling, grammar and translation at any point in the working phases.'
    ],
    notAllowed: [
      'The Decide block (15–20). Laptops down — idea selection is judged as the team\'s own work.',
      'The Pitch and Q&A (48–60). No live prompting, no reading generated answers, no earpieces.',
      'Submitting a slide containing a fact, figure or quote nobody on the team has verified.',
      'Presenting AI-generated work as a working prototype or as original research.'
    ],
    disclosure:
      'Every team names the AI tools they used on their last slide. Disclosure costs you nothing. An undisclosed tool discovered in Q&A disqualifies the pitch.'
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
    teamShapes: teamShapes,
    aiPolicy: aiPolicy,
    branches: branches,
    clock: clock,
    pitchCapacity: pitchCapacity
  };
})();
