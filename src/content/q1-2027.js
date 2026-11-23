// Issue 01 — Q1 2027. Static edition content.
//
// Sections follow the editorial plan ("Planned Content – First Edition", Newsletter Editorial Hub).
// Each section notes its business owner and where the copy came from; see CONTENT-STATUS.md for
// what each owner still needs to confirm before publishing.
//
// Block shapes are documented in src/blocks/Blocks.jsx (BLOCK_TYPES).

const EDITION = 'q1-2027'

let seq = 0
const block = (type, col_span, content, row_span = 1) => ({ id: `${EDITION}-b${++seq}`, type, col_span, row_span, content })

const LINKS = {
  knowledgeBox: 'https://newgiza87182655gdevelopment.sharepoint.com/sites/KnowledgeBox',
  brandBox: 'https://newgiza87182655gdevelopment.sharepoint.com/sites/BrandBox',
  itSupport: 'https://itsupport.thegdevelopments.com/app/itdesk/ui/ssp/pages/home',
  hrPortal: 'https://hrp.thegdevelopments.com/',
  newkairo: 'https://www.newkairo.com/en',
  projects: 'https://www.thegdevelopments.com/community',
  careers: 'https://careers.thegdevelopments.com',
  gdGuidelines: 'https://newgiza87182655gdevelopment.sharepoint.com/sites/BrandBox/Shared%20Documents/Branding%20Elements/GuideLines/G%20DEVELOPMENTS%20Brand%20Guidelines%20Updated%20-%20Feb%202026.pdf',
}

const RESPONSIBLE_AI = 'Use company-approved tools. Never paste confidential, client or personal information into a prompt. Always read and check what AI gives you before you use it.'

const sections = [
  // ---------------------------------------------------------------- 01
  {
    id: `${EDITION}-s1`,
    slug: 'transformation-office',
    n: '01',
    position: 1,
    title: 'Transformation Office',
    short: 'What’s new',
    descr: 'New digital launches, platforms and automation: the systems that make everyday work clearer, faster and more connected.',
    headline: 'Building the systems behind what comes next.',
    quote: 'A text change on our website no longer needs a vendor. That is what building in-house buys us.',
    photo_url: '/images/transform.png',
    read_min: 5,
    links: [
      { label: 'Open Knowledge Box', url: LINKS.knowledgeBox },
      { label: 'IT service desk', url: LINKS.itSupport },
    ],
    // Owner: IT (Serafy) & Business Applications (Amgad). Source: AI & Development Monthly Review, Nov 2026; ManageEngine go-live.
    body: [
      'This quarter, a lot of what used to live in inboxes, spreadsheets and vendor tickets moved onto platforms we own.',
      'Knowledge Box and Brand Box went live: two assistants that answer from our own documents. Ask Knowledge Box about a policy, or Brand Box for the latest logo and guidelines, and you get an answer in seconds. Both open with your company Microsoft account, so there is no separate password, and access ends automatically when someone leaves.',
      'Behind the scenes, our HR system (MenaITech) now keeps Active Directory up to date on its own. Every six hours, changes HR makes reach your company account: 4,095 active employees across nine group companies are read, and 169 out-of-date fields were corrected along the way. Next, HR-approved employee photos will flow to Outlook and Teams the same way.',
      'ManageEngine is now our single front door for support. IT, Transformation and Business Applications requests all go through one portal, so every request is tracked and nothing gets lost in email.',
      'The NEWKAIRO website launched on our own platform and is the first result on Google for “newkairo”, straight after the sponsored results. Enquiries from the site arrive in Salesforce as verified leads, and the content is edited in-house.',
      'Still in motion: a unified WhatsApp platform for the group (built, waiting on a company number), direct SMS through Orange (waiting on approvals), the new contracts cycle (second round of user testing), and a delivery-tracking app built by our interns that gives security a live record of couriers inside the compounds.',
    ],
    points: [
      ['Knowledge Box', 'Ask about any policy or procedure and get an answer from our own documents.'],
      ['ManageEngine', 'One portal for every IT, Transformation and Business Applications request.'],
      ['NEWKAIRO online', 'Built in-house, first on Google, leads straight into Salesforce.'],
    ],
    blocks: [
      block('stat', 3, { value: '4,095', label: 'Employees synced', note: 'Read from MenaITech across 9 group companies.' }, 2),
      block('stat', 3, { value: '169', label: 'Records corrected', note: 'Out-of-date Active Directory fields fixed for active employees.' }, 2),
      block('stat', 3, { value: '6h', label: 'Sync cycle', note: 'HR changes reach your company account every six hours.' }, 2),
      block('stat', 3, { value: '#1', label: 'On Google', note: 'NEWKAIRO.com for “newkairo”, after sponsored results.' }, 2),
      block('steps', 12, {
        title: 'Live since last quarter',
        items: [
          ['Knowledge Box', 'Policies and know-how, answered for any employee from our own documents. Company sign-in only.'],
          ['Brand Box', 'Brand assets and guidelines on request, so teams stop asking around for the latest logo.'],
          ['MenaITech → Active Directory', 'Your account details follow HR’s records automatically, every six hours.'],
          ['NEWKAIRO website', 'Launched on our own platform with verified lead capture into Salesforce.'],
          ['ManageEngine', 'The central IT service desk for support, enhancement and application requests.'],
        ],
      }),
      block('link', 4, { tag: 'Platform', title: 'Knowledge Box', desc: 'Ask a question about any company policy.', url: LINKS.knowledgeBox, cta: 'Open Knowledge Box' }, 2),
      block('link', 4, { tag: 'Support', title: 'ManageEngine', desc: 'Raise and track IT and application requests.', url: LINKS.itSupport, cta: 'Open the service desk' }, 2),
      block('link', 4, { tag: 'Launch', title: 'NEWKAIRO.com', desc: 'See the new site, built and run in-house.', url: LINKS.newkairo, cta: 'Visit the site' }, 2),
    ],
  },

  // ---------------------------------------------------------------- 02
  {
    id: `${EDITION}-s2`,
    slug: 'commercial-highlights',
    n: '02',
    position: 2,
    title: 'Commercial Highlights',
    short: 'Across G',
    descr: 'Launches, campaigns and commercial milestones from across the portfolio.',
    headline: 'New spaces. New conversations.',
    quote: 'A well-curated variety of distinguished projects.',
    photo_url: '/images/walkway.png',
    read_min: 3,
    links: [
      { label: 'Visit NEWKAIRO.com', url: LINKS.newkairo },
      { label: 'Our projects', url: LINKS.projects },
    ],
    // Owner: Carma Sadek, Marketing. Source: AI & Development Monthly Review, Nov 2026 (NEWKAIRO, leasing); G Developments brand guidelines (campaign line).
    // TODO(Marketing): add new sales center locations, neighbourhood/project launches and outdoor campaigns for the quarter.
    body: [
      'From the North Coast to our newest destination, the quarter brought new ways for customers to find us, and a clearer view of how our destinations perform.',
      'NEWKAIRO now has a home online that we run ourselves. The new website launched in-house and quickly became the top result on Google for its name. Every brochure request and register-interest form lands in Salesforce as a verified lead, so the sales team follows up on real enquiries.',
      'On the North Coast, the summer season at Playa Ghazala and Seashell Ras El Hekma closed with tenant revenue recorded in Salesforce for 94 of 108 stores across both projects, through more than 2,200 revenue records. For the first time, leasing has one consistent view of how each outlet performed over the season.',
      'Our campaigns continue to carry one idea: a well-curated variety of distinguished projects, delivered with integrated excellence.',
    ],
    points: [
      ['NEWKAIRO', 'New website live, first on Google, verified leads into Salesforce.'],
      ['94 / 108', 'Stores at Playa and Seashell with season revenue in Salesforce.'],
      ['One view', 'Leasing performance across both coastal destinations, in one place.'],
    ],
    blocks: [
      block('stat', 4, { value: '94/108', label: 'Stores reporting', note: 'Playa Ghazala and Seashell Ras El Hekma, summer season.' }, 2),
      block('stat', 4, { value: '2,222', label: 'Revenue records', note: 'Posted against leases in Salesforce, May to September.' }, 2),
      block('stat', 4, { value: '#1', label: 'NEWKAIRO on Google', note: 'Straight after the sponsored results.' }, 2),
      block('link', 6, { tag: 'Launch', title: 'Explore NEWKAIRO.com', desc: 'The new website, built and edited in-house.', url: LINKS.newkairo, cta: 'Visit' }, 2),
      block('quote', 6, { text: 'The byword for integrated excellence.', by: 'G Developments campaign line' }, 2),
    ],
  },

  // ---------------------------------------------------------------- 03
  {
    id: `${EDITION}-s3`,
    slug: 'corporate-excellence',
    n: '03',
    position: 3,
    title: 'Meet Corporate Excellence',
    short: 'Corporate Excellence',
    descr: 'Clearer responsibilities. Smarter processes. Stronger performance.',
    headline: 'Making the way we work better.',
    quote: 'Corporate Excellence isn’t about adding complexity. It’s about making excellence part of how we work, every day.',
    photo_url: '/images/blocks.png',
    read_min: 3,
    // Owner: Inji, Corporate Excellence. Source: "Corpex Planned Content" (CorpEx channel), used as written.
    body: [
      'Corporate Excellence is here to help G Developments work in a more structured, consistent and efficient way.',
      'By establishing clear responsibilities, streamlined processes, measurable objectives and strong governance, we are building a better way of working together.',
      'Why does it matter to you? Because when responsibilities are clear, processes are simpler and expectations are aligned, we spend less time navigating confusion and more time delivering results.',
    ],
    points: [
      ['Clearer responsibilities', 'Everyone knows what they own and who decides.'],
      ['Smarter processes', 'Everyday work that is simpler and better coordinated.'],
      ['Stronger performance', 'Objectives and KPIs that show what success looks like.'],
    ],
    blocks: [
      block('steps', 12, {
        title: 'Five questions that drive Corporate Excellence',
        items: [
          ['Who does what?', 'Making sure everyone understands their responsibilities, who owns each process, and who makes decisions.'],
          ['How do we work?', 'Creating clear, consistent processes that make everyday work simpler, more efficient, and better coordinated.'],
          ['How do we measure success?', 'Setting meaningful objectives and KPIs so teams know what success looks like and how progress is measured.'],
          ['Are we working the right way?', 'Establishing clear policies, standards, and controls that promote accountability, consistency, and good governance.'],
          ['How can we do better?', 'Identifying gaps, removing inefficiencies, and continuously improving the way we operate.'],
        ],
      }),
      block('quote', 12, { text: 'One Company. Clear Standards. Better Ways of Working.', by: 'Corporate Excellence' }, 2),
    ],
  },

  // ---------------------------------------------------------------- 04
  {
    id: `${EDITION}-s4`,
    slug: 'people-and-culture',
    n: '04',
    position: 4,
    title: 'People & Culture',
    short: 'HR Corner',
    descr: 'Announcements, benefits, hiring and what is coming up for our people.',
    headline: 'Better tools for the people who make G.',
    quote: 'From here on, the numbers we report are the same numbers HR keeps.',
    photo_url: '',
    read_min: 4,
    links: [
      { label: 'Careers portal', url: LINKS.careers },
      { label: 'HR portal', url: LINKS.hrPortal },
    ],
    // Owner: Nihal, HR. Sources: Employee Photo Submission and Gold Era offer (previous SharePoint newsletter);
    // Careers portal and HR AI tools (AI & Development Monthly Review, Nov 2026).
    // TODO(HR): add L&D opportunities, performance management cycle / KPIs, and upcoming events.
    body: [
      'A quarter of practical improvements: easier hiring, a refreshed company directory, and benefits worth knowing about.',
      'Your photo, everywhere it matters. The annual Employee Photo Submission campaign is open. A professional headshot (smiling encouraged) refreshes your ID badge and your profile across Outlook, Teams and MenaITech, and once HR approves it, it will reach Outlook and Teams automatically. Submit yours through the HR portal.',
      'Hiring, done properly. The careers portal and AI Candidates tool now match HR’s own interview records one to one. When the two first disagreed, the team went back to HR, took their feedback and changed how interviews are recorded, so every hiring number we report is one HR recognises.',
      'Tools that earn their place. HR’s AI tools were reviewed against HR’s own survey answers: the tools people use were kept, the ones they didn’t were cancelled, and renewals now follow real use.',
      'A benefit worth a look. Through an exclusive offer with Gold Era, employees get 15% off the manufacturing fee on gold bars (from 0.25 g) and coins (¼, ½ and 1 pound), with free delivery and payment by bank transfer or InstaPay. Show your company ID at any Gold Era branch.',
    ],
    points: [
      ['Photo submission', 'Refresh your badge and your Outlook and Teams profile.'],
      ['Careers portal', 'Hiring records now match HR’s own, one to one.'],
      ['Gold Era offer', '15% off manufacturing fees, free delivery, staff ID at any branch.'],
    ],
    blocks: [
      block('link', 6, { tag: 'Action', title: 'Submit your employee photo', desc: 'Refresh your ID badge and your profile across Outlook, Teams and MenaITech.', url: LINKS.hrPortal, cta: 'Submit it now' }, 2),
      block('note', 6, { title: 'Gold Era staff offer', text: '15% off the manufacturing fee on gold purchases\nBars from 0.25 g · coins in ¼, ½ and 1 pound\nFree delivery · bank transfer or InstaPay\nPresent a valid company ID at any branch' }, 2),
    ],
  },

  // ---------------------------------------------------------------- 05
  {
    id: `${EDITION}-s5`,
    slug: 'g-lifestyle',
    hidden: true, // Waiting on this quarter's partnerships and activations (CONTENT-STATUS.md).
    n: '05',
    position: 5,
    title: 'G Lifestyle',
    short: 'Experiences',
    descr: 'Partnerships, activations and experiences across our destinations.',
    headline: 'Experiences that bring our places to life.',
    quote: '',
    photo_url: '',
    read_min: 2,
    // Owner: Dina, G Lifestyle. Sources: G Lifestyle brand guidelines (Brand Box, June 2026); in-house platform (AI & Dev review, Nov 2026).
    // TODO(G Lifestyle): add the quarter's new partnerships, tie-ups, events and activations, with photos.
    body: [
      'G Lifestyle is where our destinations become experiences: the partnerships, events and activations that give people a reason to visit, stay and come back.',
      'This year G Lifestyle stepped out with its own brand identity, set out in new brand guidelines available in Brand Box, and its website now runs on the same in-house platform as our other digital properties, so new experiences can be published as soon as they are confirmed.',
      'Look out for the season’s partnerships and activations here each quarter.',
    ],
    points: [
      ['New identity', 'G Lifestyle brand guidelines, now in Brand Box.'],
      ['Our platform', 'The G Lifestyle website runs in-house.'],
      ['Every quarter', 'New partnerships and activations, featured here first.'],
    ],
    blocks: [
      block('link', 12, { tag: 'Brand Box', title: 'G Lifestyle brand guidelines', desc: 'Logo, colours and the look of every G Lifestyle communication.', url: LINKS.brandBox, cta: 'Open in Brand Box' }, 2),
    ],
  },

  // ---------------------------------------------------------------- 06
  {
    id: `${EDITION}-s6`,
    slug: 'g-communities',
    n: '06',
    position: 6,
    title: 'G Communities',
    short: 'Growing together',
    descr: 'A new identity, new services and a better resident experience.',
    headline: 'Building communities where people thrive.',
    quote: 'Distinct communities. One standard of excellence.',
    photo_url: '',
    read_min: 3,
    // Owner: Maya, G Communities. Sources: G Communities Brand Identity Guidelines 2026; AI & Dev review, Nov 2026
    // (delivery tracking, customer survey, AD sync for G Communities staff).
    // TODO(G Communities): confirm expansion news and new resident services for the quarter.
    body: [
      'G Communities has a new face. The 2026 brand identity brings a confident new blue, a dynamic brandmark and a clean, modern system that runs from the website and mobile app to the business card in your pocket.',
      'The idea behind it is simple: distinct communities, one standard of excellence. Every compound keeps its character; residents get the same quality of service wherever they live.',
      'That standard is showing up at the gates, too. A new delivery-tracking app, built in-house, lets security photograph a courier’s ID, have it read automatically, and keep a live record of who is inside and for how long, flagging anyone who overstays even when the app is closed. It moves to a pilot at the gates next.',
      'And we are listening. The 2026 customer experience survey is built and ready: each resident sees only the questions that match their units and handover stage. It launches as soon as the final questions are approved.',
    ],
    points: [
      ['New identity', 'A new blue, a dynamic brandmark and one system across every touchpoint.'],
      ['Safer gates', 'Live courier tracking, with overdue visits flagged automatically.'],
      ['Resident voice', 'A tailored experience survey, ready to launch.'],
    ],
    blocks: [
      block('stat', 4, { value: '#334DD2', label: 'G Communities Blue', note: 'Pantone 2728 C/U, the new signature colour.' }, 2),
      block('stat', 4, { value: '5 steps', label: 'At the gate', note: 'Log, photograph ID, AI reads, guard confirms, timed exit.' }, 2),
      block('stat', 4, { value: '1 survey', label: 'Per resident', note: 'Only the questions that apply to their units.' }, 2),
      block('quote', 12, { text: 'Building communities where people thrive.', by: 'G Communities' }, 2),
    ],
  },

  // ---------------------------------------------------------------- 07
  {
    id: `${EDITION}-s7`,
    slug: 'wellness-corner',
    n: '07',
    position: 7,
    title: 'Wellness Corner',
    short: 'Your wellbeing matters',
    descr: 'Recognising stress, knowing your triggers, and simple ways to reset during the day.',
    headline: 'Alt + Ctrl + Breathe.',
    quote: 'You can’t pour from an empty cup. Taking a minute is part of doing the work well.',
    photo_url: '',
    read_min: 4,
    // Owners: Abby & Aya Ghobashy. Sources: "Alt+Ctrl+Breathe" presentation by Aya Ghobashy (Oct 2026);
    // Pink October (previous SharePoint newsletter). TODO(Aya): check the tips against the presentation.
    body: [
      'Stress is not a weakness; it is a signal. The trick is noticing it early, before it decides how your day goes.',
      'Know the signs. Stress shows up in the body (tight shoulders, headaches, shallow breathing, poor sleep), in the mind (racing thoughts, trouble focusing, forgetting small things) and in behaviour (snapping at people, skipping breaks, working later and getting less done).',
      'Know your triggers. For most of us they are predictable: deadlines stacking up, unclear expectations, constant notifications, back-to-back meetings with no gap. Write yours down. Seeing them on paper turns a vague feeling into something you can plan around.',
      'Then press Alt + Ctrl + Breathe. Alt: step away, even for two minutes. Ctrl: take back one thing you can control, such as the order of your tasks or a meeting that can be an email. Breathe: slow your breathing down, because your body follows your breath.',
      'In October we marked Pink October with NEWGIZA University Hospital, which offered female colleagues a free medical consultation and breast ultrasound, with a mammogram where medically indicated. Early detection saves lives; looking after yourself is never time wasted.',
    ],
    points: [
      ['Alt', 'Step away for two minutes. A short walk counts.'],
      ['Ctrl', 'Take back one thing you can control today.'],
      ['Breathe', 'Slow breathing tells your body it is safe.'],
    ],
    blocks: [
      block('steps', 7, {
        title: 'Box breathing, in one minute',
        items: [
          ['Breathe in', 'Through your nose, slowly, for a count of four.'],
          ['Hold', 'Keep the breath in for a count of four.'],
          ['Breathe out', 'Gently through your mouth for a count of four.'],
          ['Hold', 'Wait for a count of four, then repeat four times.'],
        ],
      }),
      block('note', 5, { title: 'The 5-4-3-2-1 reset', text: 'When your mind is racing, name:\n5 things you can see\n4 things you can touch\n3 things you can hear\n2 things you can smell\n1 thing you can taste' }, 3),
      block('quiz', 6, {
        question: 'Which of these is a common early sign of stress?',
        options: ['Sleeping more soundly than usual', 'Trouble focusing on simple tasks', 'Feeling more patient than usual'],
        answer: 1,
        explain: 'Difficulty concentrating is one of the first signs. Noticing it early is your cue to take a break.',
      }, 3),
      block('note', 6, { title: 'Pink October', text: 'NEWGIZA University Hospital offered female colleagues a complimentary consultation and breast ultrasound, with a mammogram when medically indicated.\nEarly detection supports timely diagnosis and treatment.' }, 3),
    ],
  },

  // ---------------------------------------------------------------- 08
  {
    id: `${EDITION}-s8`,
    slug: 'brand-box',
    n: '08',
    position: 8,
    title: 'Brand Box',
    short: 'Know our brand',
    descr: 'Everything you need to use our brand well, now one question away.',
    headline: 'Get to know our brand.',
    quote: 'The byword for integrated excellence.',
    photo_url: '',
    read_min: 3,
    links: [
      { label: 'Open Brand Box', url: LINKS.brandBox },
      { label: 'G Developments brand guidelines', url: LINKS.gdGuidelines },
    ],
    // Owner: Ahmad Taha. Sources: Brand Box site (guidelines library); G Developments Brand Guidelines (Feb 2026);
    // G Communities Brand Identity Guidelines 2026. Brand assets stay behind company sign-in in Brand Box itself;
    // this page only shares facts that are safe for every employee.
    body: [
      'A brand is a promise you keep every time someone sees your name. Brand Box makes keeping it easy.',
      'Brand Box is our home for brand assets and guidelines, and it now has an assistant: ask for the latest logo, the right colour code or a template, and get it from the official source instead of an old email attachment. It opens with your company Microsoft account, so the assets stay with the people who should have them.',
      'Inside you’ll find the guidelines for every brand in the family: G Developments, G Communities, G Lifestyle, NEWGIZA, NEWKAIRO, Seashell Ras El Hekma, Playa Ghazala, IVY, Artlife and more.',
      'Test yourself on a few things the guidelines say.',
    ],
    points: [
      ['Official source', 'Logos, colours and templates, always the latest version.'],
      ['Ask the assistant', 'Find the right asset by asking for it.'],
      ['Company sign-in', 'Assets stay with the people who should have them.'],
    ],
    blocks: [
      block('quiz', 4, {
        question: 'How is the clear space around the G Developments brandmark measured?',
        options: ['In centimetres', 'Using the letter “G” from the logo', 'Half the logo’s width'],
        answer: 1,
        explain: 'The letter G from the logo is the unit placed on all four sides, so the space scales with the mark.',
      }, 4),
      block('quiz', 4, {
        question: 'What is the new signature colour of G Communities?',
        options: ['Forest green', 'A confident blue, #334DD2', 'Sand beige'],
        answer: 1,
        explain: 'G Communities Blue is Pantone 2728, HEX #334DD2, alongside near-black and a soft light grey.',
      }, 4),
      block('quiz', 4, {
        question: 'Which typeface family is used across G Developments communication?',
        options: ['Times New Roman', 'Helvetica Now Display', 'Comic Sans'],
        answer: 1,
        explain: 'Helvetica Now Display, in weights from Thin to Extra Bold. Arabic uses DIN Next LT Arabic.',
      }, 4),
      block('link', 12, { tag: 'Company sign-in', title: 'Open Brand Box', desc: 'Logos, guidelines and templates for every brand in the G family.', url: LINKS.brandBox, cta: 'Go to Brand Box' }, 2),
    ],
  },

  // ---------------------------------------------------------------- 09
  {
    id: `${EDITION}-s9`,
    slug: 'ai-corner',
    n: '09',
    position: 9,
    title: 'AI Corner',
    short: 'Work smarter with AI',
    descr: 'The best of the Transformation Office’s AI Weekly Tips: prompts you can copy and use today.',
    headline: 'Small prompts. Real time back.',
    quote: 'Start small: one routine task, one good prompt. Confidence follows.',
    photo_url: '/images/ai.png',
    read_min: 4,
    // Owner: Amr, Transformation Office. Sources: AI Weekly Tips initiative; AI & Development Monthly Review, Nov 2026.
    body: [
      'Every week the Transformation Office shares an AI tip: one use case, one technique, something you can try in five minutes. Here are the ones that saved people the most time this quarter.',
      'The pattern behind every good prompt is the same: say who the answer is for, give the context, ask for a format, and set the length. The prompts below follow it, so copy one, paste your own material where it says, and adjust.',
      'Our own AI is growing too. Knowledge Box answers policy questions from our documents, and the team is now testing a new kind of small, fast model that checks and routes routine decisions so a person only looks at the ones that need judgement.',
    ],
    points: [
      ['Who', 'Tell AI who the answer is for.'],
      ['What', 'Give it the context and the material.'],
      ['How', 'Ask for a format and a length.'],
    ],
    blocks: [
      block('prompt', 6, {
        title: 'Turn a long email thread into actions',
        prompt: 'You are my assistant. Read the email thread below and give me:\n1. A two-sentence summary of what was decided.\n2. A table of action items with owner and due date.\n3. Any open questions nobody answered.\n\nThread:\n[paste the thread here]',
        note: 'Remove client and personal details before pasting.',
      }, 4),
      block('prompt', 6, {
        title: 'Meeting notes to a clean recap',
        prompt: 'Turn these rough meeting notes into a short recap email for the attendees. Use three headings: Decisions, Actions (with owners), Next meeting. Keep it under 150 words and use a friendly, professional tone.\n\nNotes:\n[paste your notes here]',
        note: 'Works well with Teams meeting notes.',
      }, 4),
      block('prompt', 6, {
        title: 'Explain an Excel formula',
        prompt: 'Explain what this Excel formula does in plain English, step by step, as if to someone new to Excel. Then suggest a simpler version if there is one.\n\nFormula:\n[paste the formula here]',
        note: '',
      }, 4),
      block('prompt', 6, {
        title: 'Make it clearer',
        prompt: 'Rewrite the text below so it is clear and concise for a busy reader. Keep the meaning and every fact. Use short sentences, put the main point first, and list any requests as bullets.\n\nText:\n[paste your text here]',
        note: '',
      }, 4),
      block('note', 8, { title: 'Use AI responsibly', text: RESPONSIBLE_AI }, 2),
      block('link', 4, { tag: 'More tips', title: 'Ask Knowledge Box', desc: 'Find policies and know-how from our own documents.', url: LINKS.knowledgeBox, cta: 'Open' }, 2),
    ],
  },

  // ---------------------------------------------------------------- 10
  {
    id: `${EDITION}-s10`,
    slug: 'take-a-break',
    n: '10',
    position: 10,
    title: 'Take a Break',
    short: 'The G Challenge',
    descr: 'This quarter’s G Challenge: one Sudoku, one leaderboard. The fastest correct solve wins.',
    headline: 'The G Challenge.',
    quote: '',
    photo_url: '',
    read_min: 10,
    // Owner: Transformation Office. Game: supabase/engagement.sql (puzzle generated with scripts/new-sudoku.mjs).
    body: [
      'Step away from the inbox for ten minutes. This quarter’s challenge is a Sudoku, and everyone gets the same puzzle.',
      'Enter your name and company email to start the clock. Fill every row, column and 3×3 box with the numbers 1 to 9. The moment your grid is complete and correct, the clock stops and you take your place on the leaderboard.',
      'One official attempt per person. If you leave the page, your progress is saved in this browser and the clock keeps running, so finish what you start.',
    ],
    points: [],
    blocks: [
      block('challenge', 12, {
        edition: EDITION,
        title: 'The G Challenge · Issue 01',
        intro: 'Same puzzle for everyone. The clock runs on our server and stops the moment your grid is correct.',
        prize: 'The fastest correct solve wins a prize, announced in the next edition.',
      }),
      block('quiz', 6, {
        question: 'How many givens does a Sudoku need, at minimum, to have only one solution?',
        options: ['9', '17', '30'],
        answer: 1,
        explain: 'Mathematicians proved in 2012 that no Sudoku with fewer than 17 givens has a unique solution. Ours has 30.',
      }, 3),
      block('quote', 6, { text: 'Rest is not idleness. A short pause often gets you further than another hour of pushing.', by: 'Take a Break' }, 3),
    ],
  },
]

export default {
  id: EDITION,
  slug: EDITION,
  label: 'Q1 2027',
  title: 'The Foundation Issue',
  issue_no: 1,
  sort: 1,
  is_published: true,
  publish_at: null,
  sections,
  content: {
    images: { hero: '/images/hero.png', transform: '/images/transform.png', ai: '/images/ai.png', challenge: '' },
    imageAlts: { hero: '', transform: '', ai: '' },
    hero: {
      topLeft: 'G / {issue}',
      topRight: 'Inside the quarter',
      eyebrow: 'Quarterly Journal / Issue {issue}',
      title: 'A Quarter\nof Progress.',
      sub: 'The people, ideas and milestones\nshaping our next chapter.',
      cta: 'Explore the edition',
      link: 'View quarterly highlights',
    },
    intro: {
      label: 'A note from the editor',
      quote: 'Progress is more than a set of milestones. It is the shared momentum created by people who question, build and move with purpose.',
      note: 'Welcome to the first edition of our quarterly journal: a curated view of the work, ideas and human stories moving G forward. Explore at your own pace, vote on what we cover next, and take on the G Challenge before you go.',
    },
    glance: {
      label: 'This quarter, try this',
      items: [
        { value: 'Ask', label: 'Knowledge Box', note: 'Get answers on any policy from our own documents.', url: LINKS.knowledgeBox },
        { value: 'Submit', label: 'Your employee photo', note: 'Refresh your badge and your Outlook and Teams profile.', url: LINKS.hrPortal },
        { value: 'Raise', label: 'Any IT request', note: 'One portal for IT, Transformation and Business Applications.', url: LINKS.itSupport },
        { value: 'Try', label: 'An AI prompt', note: 'Copy, paste your material, and save time today.', slug: 'ai-corner' },
        { value: 'Vote', label: 'On our next issue', note: 'Pick what we cover next quarter.', url: '#poll' },
        { value: 'Play', label: 'The G Challenge', note: 'One Sudoku. The fastest correct solve wins.', slug: 'take-a-break' },
      ],
    },
    stories: {
      label: 'Quarterly highlights',
      meta: '{stories} stories',
      feature: {
        tag: 'Transformation Office',
        title: 'Building the systems behind what comes next.',
        desc: 'A look inside the digital foundations designed to make everyday work clearer, faster and more connected.',
        slug: 'transformation-office',
        cta: 'Read the story',
      },
      cards: [
        { tag: 'Commercial Highlights', title: 'New spaces. New conversations.', desc: 'A closer look at launches and commercial momentum across G.', imageUrl: '/images/walkway.png', imageAlt: '', slug: 'commercial-highlights', cta: 'Read the story' },
        { tag: 'Corporate Excellence', title: 'Making the way we work better.', desc: 'Clearer responsibilities. Smarter processes. Stronger performance.', imageUrl: '', imageAlt: '', slug: 'corporate-excellence', cta: 'Meet the team' },
        { tag: 'G Communities', title: 'Building communities where people thrive.', desc: 'A new identity, safer gates and a survey built around residents.', imageUrl: '/images/blocks.png', imageAlt: '', slug: 'g-communities', cta: 'Read the story' },
      ],
    },
    directory: { label: 'In this issue', title: '{count} perspectives\non the quarter' },
    ai: {
      label: 'AI Corner',
      title: 'Idea of the quarter',
      desc: 'Turn a long email thread into decisions and actions in seconds. Copy the prompt, paste your thread where it says, and check the result before you send it on.',
      promptLabel: 'Try this prompt',
      prompt: 'You are my assistant. Read the email thread below and give me:\n1. A two-sentence summary of what was decided.\n2. A table of action items with owner and due date.\n3. Any open questions nobody answered.\n\nThread:\n[paste the thread here]',
      responsible: RESPONSIBLE_AI,
      moreLabel: 'More prompts in AI Corner',
      moreSlug: 'ai-corner',
    },
    poll: {
      label: 'Your voice matters',
      question: 'What should we feature next quarter?',
      options: ['Leadership Spotlight', 'Employee Spotlight', 'What’s Next: upcoming launches', 'More AI tips and tools'],
      suggestLabel: 'Suggest a topic (optional)',
      submit: 'Send my vote',
      thanks: 'Thank you.',
      thanksNote: 'Here is how colleagues have voted so far.',
    },
    challenge: {
      label: 'Take a break',
      number: '10',
      title: 'The G Challenge',
      desc: 'One Sudoku, one leaderboard. The fastest correct solve wins a prize.',
      slug: 'take-a-break',
      cta: 'Play now',
    },
    archive: { label: 'Archive', title: 'Past editions', desc: 'Every issue, in one place.', cardLabel: 'Past edition' },
  },
}
