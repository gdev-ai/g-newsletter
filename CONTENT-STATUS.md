# Issue 01 (Q1 2027): content status

Content lives in `src/content/q1-2027.js`. Each section follows the editorial plan
("Planned Content – First Edition", Newsletter Editorial Hub) and is drafted from the sources below.
Corporate Excellence (CorpEx) reviews everything before publication.

Some copy is written by us from the sources (marked "drafted" below) and needs the owner's check. Placeholders
are never shown: a section or entry with nothing to say is hidden (`hidden: true`) and listed here.
Numbering, the home page directory and the "at a glance" strip adjust on their own.

## Sections

| # | Section | Status | Owner | Drafted from | Still needed from the owner |
|---|---|---|---|---|---|
| 01 | Transformation Office | Live | IT (Serafy), Applications (Amgad) | AI & Development Monthly Review, Nov 2026; ManageEngine go-live | Oracle ERP progress (in the plan, no source yet); confirm figures |
| 02 | Commercial Highlights | Live | Carma Sadek, Marketing | AI & Dev review (NEWKAIRO site, Playa/Seashell leasing); brand guidelines campaign line | New sales center locations, neighbourhood/project launches, outdoor campaigns, photos; OK to publish leasing figures (EGP totals deliberately left out) |
| 03 | Meet Corporate Excellence | Live | Inji | "Corpex Planned Content", used as written | Final sign-off; team photo |
| 04 | People & Culture | Live | Nihal | Photo Submission campaign and Gold Era offer (previous SharePoint newsletter); careers portal and HR AI tools (AI & Dev review) | L&D opportunities, performance management / KPIs, upcoming events; confirm Gold Era offer is still running |
| — | G Lifestyle | **Hidden** | Dina | G Lifestyle brand guidelines (Brand Box) | This quarter's partnerships, tie-ups, events and activations, with photos. The section has nothing to report until then. Also: the G Lifestyle website address (not found) |
| 05 | G Communities | Live | Maya | G Communities Brand Identity Guidelines 2026; delivery tracking and CX survey (AI & Dev review) | Expansion news and new resident services; community photos; the G Communities website address (gcommunities.com is a parked domain, not ours) |
| 06 | Wellness Corner | Live | Abby & Aya Ghobashy | "Alt+Ctrl+Breathe" by Aya Ghobashy (image-only deck, so the tips are drafted from its topics); Pink October | Aya to check the tips match her session; a shareable link to the deck so readers can open it in full |
| 07 | Brand Box | Live | Ahmad Taha | Brand Box guideline library; G Developments Brand Guidelines (Feb 2026); G Communities guidelines | Confirm brand facts used in the quizzes; confirm the G Communities guideline is in Brand Box (not found there) so it can be linked |
| 08 | AI Enablement | Live | Amr | AI Weekly Tip emails, Weeks 1–6 (sent Sundays 18 Oct – 22 Nov 2026; Week 3 was the OneDrive & SharePoint guide), used as sent | A link for "Access the full guide & session recording" from the OneDrive guide |
| 09 | Take a Break | Live | Transformation Office | G Challenge (Sudoku) | The prize, and the closing date |

## Written by us, to confirm

- Pull quotes in Transformation Office, People & Culture, Wellness Corner and Take a Break are our wording, not quotes from a person. Swap in a real quote (with name and title) if the owner has one.
- G Communities stats "5 steps at the gate" and "1 survey per resident" summarise the AI & Dev review; Maya to confirm.
- Take a Break prize line says the winner is "announced in the next edition"; confirm once the prize is decided.

## Links on the site

Section headers carry buttons (`links` in each section) and link cards open in a new tab. Checked and working:

| Link | Address | Where |
|---|---|---|
| IT service desk (ManageEngine) | itsupport.thegdevelopments.com | 01 |
| NEWKAIRO website | www.newkairo.com/en | 01, 02 |
| Our projects | www.thegdevelopments.com/community | 02 |
| Careers portal | careers.thegdevelopments.com | 04 |
| HR portal | hrp.thegdevelopments.com | 04 |
| Brand Box | SharePoint /sites/BrandBox (company sign-in) | 01, 07 |
| G Developments Brand Guidelines (Feb 2026, PDF) | Brand Box › Branding Elements › GuideLines | 07 |

Links still wanted:

- **AI & Development Monthly Review deck** ("open the full deck" in 01): it sits in a personal OneDrive. Move it to a shared site (or share with everyone) and send the link.
- **Alt+Ctrl+Breathe deck** (Wellness Corner): not found in SharePoint; add an "Open the full deck" button once there is a shareable link.
- **G Communities guideline PDF**: not found in Brand Box.
- **G Lifestyle and G Communities websites**: no public address found.

## Open decisions

- **Publication name**: Abada suggested a permanent name such as "G Journal". The header currently says "Quarterly Journal" (`src/content/index.js`, `brand.headerTag1`).
- **Brand Box access**: the newsletter only shows facts that are safe for every employee and links to Brand Box, which is behind Microsoft sign-in.
- **One vote per employee**: the poll allows one response per browser. True one-per-employee needs Microsoft sign-in on the site (a later step).
- **Photography**: the images in `public/images/` come from the design mock-up, not from G. Replace them with real G photos (projects, communities, people, events). People & Culture, G Communities, Wellness Corner, Brand Box and Take a Break have no photo yet.

## Running the G Challenge

1. In Supabase SQL Editor, run `supabase/engagement.sql` once. It creates the poll and challenge tables and functions, and installs the Q1 puzzle.
2. To set the prize text and deadline:
   ```sql
   update challenges set note = 'Fastest correct solve wins …', closes_at = '2027-01-31 23:59+02' where edition = 'q1-2027';
   ```
3. To see results with emails (as an admin, signed in to /admin, or in the SQL Editor):
   ```sql
   select * from challenge_attempts where edition = 'q1-2027' order by finished_at is null, duration_ms;
   ```
4. For the next edition, generate a new puzzle with `node scripts/new-sudoku.mjs q2-2027 medium` and run the SQL it prints.

To try the game locally before the SQL is installed, open any page with `?mock-challenge` while running `npm run dev`. The mock exists only in development builds.
