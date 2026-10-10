/* ============================================================
   QUIZ FORUM — QUESTION BANK  (edit this file monthly)

   Each question:
     id          unique, never reuse within a month (q01, q02 ...)
     topic       short label shown on the question card
     statement   the True/False statement
     answer      "TRUE" or "FALSE"
     explanation shown on the results screen only
     source      URL for the administrator (also shown as a "Source" link in results)
     status      admin-only note on how well the item is verified (never shown to students)

   AFTER EDITING ANSWERS: open admin-key.html in your browser and paste the generated
   ANSWER_KEY block into apps-script/Code.gs, then redeploy (README, section 6).

   SECURITY NOTE: this file is public. A determined student can read the answers in
   the page source. The server re-checks every score, so nobody can fake a score,
   but nothing here can stop someone from reading answers. See README "Limitations".
   ============================================================ */
window.QF_QUESTIONS = [
  {
    id: "q01", topic: "Technology & Infrastructure",
    statement: "Kavach is India's indigenous Automatic Train Protection system designed to improve railway safety.",
    answer: "TRUE",
    explanation: "Kavach was developed by Indian Railways' RDSO with Indian industry. It automatically applies brakes to help prevent collisions, signal-passing and overspeeding on equipped routes.",
    source: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781101.pdf",
    status: "VERIFIED 2026-10-10 against a PIB document and several explainers."
  },
  {
    id: "q02", topic: "Nepal Flooding",
    statement: "The August 2026 flash flood in Nepal swept down the Bhote Koshi and Trishuli river corridor.",
    answer: "TRUE",
    explanation: "A flash flood on 26 August 2026 began in the Bhote Koshi valley (Rasuwa) and ran down into the Trishuli river, damaging bridges, homes and hydropower plants. Early scientific reports pointed to an ice-rock avalanche in the high Himalayas.",
    source: "https://global-flood.emergency.copernicus.eu/news/259-floods-in-nepal-and-tibet-august-2026/",
    status: "VERIFIED 2026-10-10 against Copernicus flood portal and several news reports. REWORDED from 'river basins' to 'river corridor' and made self-contained. Casualty figures were still changing, so none are used."
  },
  {
    id: "q03", topic: "International Chess",
    statement: "Samarkand, Uzbekistan, was selected to host the 2026 Chess Olympiad.",
    answer: "TRUE",
    explanation: "FIDE's 46th Chess Olympiad was held in Samarkand, Uzbekistan, from 15 to 27 September 2026.",
    source: "https://www.fide.com/invitation-46th-chess-olympiad-3rd-fide-chess-olympiad-for-people-with-disabilities-fide-congress-2026/",
    status: "VERIFIED 2026-10-10 against FIDE's invitation page."
  },
  {
    id: "q04", topic: "British Political History",
    statement: "Margaret Thatcher was the first woman to serve as Prime Minister of the United Kingdom, holding office from 1979 to 1990.",
    answer: "TRUE",
    explanation: "Thatcher became the UK's first female prime minister in May 1979 and left office in November 1990.",
    source: "https://www.britannica.com/biography/Margaret-Thatcher",
    status: "Stable historical fact. Link not opened during this session."
  },
  {
    id: "q05", topic: "BRICS Summit",
    statement: "India hosted the 2026 BRICS Summit at Bharat Mandapam in New Delhi.",
    answer: "TRUE",
    explanation: "India chaired BRICS in 2026 and hosted the 18th BRICS Summit at Bharat Mandapam, New Delhi, on 12-13 September 2026.",
    source: "https://en.wikipedia.org/wiki/18th_BRICS_summit",
    status: "VERIFIED 2026-10-10 against several post-event reports. Official BRICS/MEA page not opened; consider swapping in that link."
  },
  {
    id: "q06", topic: "Mixed Martial Arts",
    statement: "Suchika Tariyal won India's first-ever Asian Games medal in Mixed Martial Arts.",
    answer: "TRUE",
    explanation: "MMA made its Asian Games debut at Aichi-Nagoya 2026. Suchika Tariyal won bronze in the women's traditional 60 kg event on 21 September 2026, India's first Asian Games MMA medal.",
    source: "https://www.deccanchronicle.com/amp/sports/suchika-tariyal-wins-bronze-in-mma-at-asian-games-1989179",
    status: "VERIFIED 2026-10-10 against PTI/IANS-based reports from several outlets."
  },
  {
    id: "q07", topic: "Sustainable Agriculture",
    statement: "India's first soil-carbon payments to farmers were made to farmers in Punjab and Haryana.",
    answer: "TRUE",
    explanation: "In September 2026 over Rs 2.9 crore was paid to 2,550 farmers in Punjab and Haryana under 'Aadi', a Grow Indigo farmer carbon programme with ICAR technical guidance. It is a company programme, not a government scheme.",
    source: "https://telanganatoday.com/govt-announces-over-rs-2-9-crore-in-soil-carbon-payments-for-2550-farmers",
    status: "VERIFIED 2026-10-10 against Ministry of Agriculture statement coverage. REWORDED: the original 'initiative was launched in Punjab and Haryana' was misleading because Aadi began in 2019."
  },
  {
    id: "q08", topic: "Lunar Exploration",
    statement: "In September 2026, NASA announced that its Lunar Reconnaissance Orbiter had found a new Moon crater named McGetchin, formed by an impact in 2024.",
    answer: "TRUE",
    explanation: "NASA announced McGetchin on 16 September 2026. The crater is about 222 m wide and formed between 11 April and 22 May 2024. It was spotted by comparing before-and-after LRO images and named for lunar scientist Tom McGetchin.",
    source: "https://www.space.com/astronomy/moon/nasa-just-found-a-giant-new-crater-on-the-moon-heres-why-everyones-talking-the-once-in-a-century-discovery",
    status: "VERIFIED 2026-10-10 against Space.com, AFP and others. REWORDED: the original 'identified through mapping in September 2026' blurred the 2024 impact with the 2026 announcement. NASA's own page was not opened; consider adding it."
  },
  {
    id: "q09", topic: "Margaret Thatcher",
    statement: "Margaret Thatcher was widely known as the Iron Lady.",
    answer: "TRUE",
    explanation: "The nickname became attached to her uncompromising political style and firm anti-Soviet rhetoric.",
    source: "https://www.britannica.com/biography/Margaret-Thatcher",
    status: "Stable historical fact. Link not opened during this session."
  },
  {
    id: "q10", topic: "Chess History",
    statement: "The first official Chess Olympiad took place in London in 1927.",
    answer: "TRUE",
    explanation: "The first official Chess Olympiad was held in London in 1927 under FIDE.",
    source: "https://en.wikipedia.org/wiki/1st_Chess_Olympiad",
    status: "Stable historical fact. Link not opened during this session."
  },
  {
    id: "q11", topic: "BRIC Acronym",
    statement: "The acronym BRIC was popularized in a 2001 economic publication by Jim O'Neill.",
    answer: "TRUE",
    explanation: "Goldman Sachs economist Jim O'Neill coined BRIC in a 2001 research paper on Brazil, Russia, India and China.",
    source: "https://en.wikipedia.org/wiki/BRICS",
    status: "Stable fact. Link not opened during this session."
  },
  {
    id: "q12", topic: "Indian Railways",
    statement: "India's first passenger train ran in 1853 between Bori Bunder and Thane.",
    answer: "TRUE",
    explanation: "The first passenger train ran on 16 April 1853 between Bori Bunder (Bombay) and Thane, about 34 km.",
    source: "https://en.wikipedia.org/wiki/History_of_rail_transport_in_India",
    status: "Stable historical fact. Link not opened during this session."
  },
  {
    id: "q13", topic: "Green Revolution",
    statement: "Dr. M. S. Swaminathan is widely celebrated as the Father of the Green Revolution in India.",
    answer: "TRUE",
    explanation: "Swaminathan led India's agricultural transformation through high-yielding crop varieties and scientific farming.",
    source: "https://en.wikipedia.org/wiki/M._S._Swaminathan",
    status: "Stable fact. Link not opened during this session."
  },
  {
    id: "q14", topic: "Asian Games",
    statement: "The first Asian Games were held in New Delhi, India, in 1951.",
    answer: "TRUE",
    explanation: "New Delhi hosted the very first Asian Games in 1951.",
    source: "https://en.wikipedia.org/wiki/1951_Asian_Games",
    status: "Stable historical fact. Link not opened during this session."
  },
  {
    id: "q15", topic: "Himalayan Geography",
    statement: "Sagarmatha is the Nepali name for Mount Everest.",
    answer: "TRUE",
    explanation: "Sagarmatha is the Nepali name of Mount Everest; its Tibetan name is Chomolungma.",
    source: "https://en.wikipedia.org/wiki/Mount_Everest",
    status: "Stable fact. Link not opened during this session."
  }
];

/* ------------------------------------------------------------
   ADMIN NOTE — every answer above is TRUE, so a student who taps TRUE
   every time scores 15/15. Consider turning a few into FALSE statements
   next month. Ready-made suggestions (change answer to "FALSE" + explanation):
     q04  "...holding office from 1975 to 1985."          (really 1979-1990)
     q10  "The first official Chess Olympiad took place in Paris in 1927."  (London)
     q12  "India's first passenger train ran in 1853 between Delhi and Agra." (Bori Bunder-Thane)
     q14  "The first Asian Games were held in Tokyo in 1951."               (New Delhi)
     q15  "Chomolungma is the Nepali name for Mount Everest."                (it is Tibetan)
   ------------------------------------------------------------ */
