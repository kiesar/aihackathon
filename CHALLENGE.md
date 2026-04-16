# aihackathon
Hackathons on AI


# Challenge 1: From PDF to digital service

Think about the last time you needed to do something official — apply for a permit, report an incident, claim expenses. In many parts of government, that process still looks like this: find the right form on a website, download a PDF, print it, fill it in by hand, scan it, and post or email it back. Then wait. You receive no confirmation it arrived. You have no idea where your application is. If something is missing, you find out weeks later by letter.

This is not a niche edge case. PDF-based processes are one of the most widespread patterns across government, used for everything from DSA Allowance applications and regulatory reporting to internal HR requests and approval workflows.

## The experience today

A student needs to apply for a Disabled Students Allowance using the form sfe_dsa_slimline_form_2627_o.pdf also available from the gov.uk site
sfe_dsa_slimline_form_2627_o.pdf (SECURED)

They find a page on a government website that links to a PDF. They download it. They do not have a printer. They find one at a library. They complete the form in pen, not sure whether they have answered every section correctly — there is no validation, no guidance for edge cases, no way to save progress. They scan it on their phone. The scan is slightly blurry. They email it to an address listed on the form.

A week later they have heard nothing. There is no reference number, no acknowledgement, no way to check status. They call the department to ask. The person who answers has to find the form in an email inbox shared by the team.

Internally, the receiving team manually reviews each submission, re-enters information into a case management system, and follows up by phone or post when something is missing. Every step is manual. Every error or omission adds days.

## The users

**The applicant** — a student trying to complete a government process. They may be on a mobile device. They may have a visual impairment or use assistive technology. They may be under time pressure. They may be anxious about getting it right. They want confidence that their submission has been received and is being processed.

**The caseworker or processing officer** — receives submissions and has to act on them. They deal with incomplete forms, illegible handwriting, and missing documents. They spend time on data entry that adds no value to the decision they eventually need to make.

**The service owner or team manager** — responsible for a process that generates complaints, backlogs, and avoidable contact. They know the PDF approach is not working but do not have the technical capacity to change it without help.

## Why this matters

PDF forms create real barriers. They exclude users who do not have a printer, who struggle with handwriting, or who rely on assistive technology that cannot interact with a PDF. They generate avoidable errors because they cannot validate input. They create processing overhead because every submission has to be handled manually.

A well-designed digital service removes most of these barriers. It works on any device. It validates as you go. It gives the user a reference number and a confirmation. It sends the receiving team structured, complete data rather than a scanned image.

Replacing a single high-volume PDF form with a working digital service can have a measurable impact on processing time, error rates, and the experience of everyone who interacts with it.

## Provided sample form for this challenge

For Challenge 1, start with the sample file in this repository:

`challenge-1/sfe_dsa_slimline_form_2627_o.pdf`

Use this as your baseline input when analysing the current journey and generating a digital replacement.

## Finding a form to work with

You already have a starter file for this challenge (`challenge-1/sfe_dsa_slimline_form_2627_o.pdf`), but you can also use one of the approaches below.

**Use a form from your own work.** If you work with a PDF-based process in your department, that is an ideal starting point. You already understand the user and the problem.

**Search GOV.UK.** Search for terms like "DSA Allowance", "report an incident", "DSA Expenses Claim form", or "DSA Disability evidence form". Most policy areas have at least one PDF-based process still in use.

**Use one of the field descriptions below.** If you want to get straight into building, use your AI coding tool with one of these fictional form descriptions:

*DSA Allowance application* — fields: full name (required), date of birth (required, must be 18+), address (4 lines plus postcode, required), Allowance type (select one: personal, medical, mobility), declaration checkbox (required).
Customer Reference Number 
Forename(s) 
Surname 
Sex 
Date of birth (DDMMYYYY)

*DSA Assessment report* — fields: reporter name (required), date (required), location (required), DSA claim type (select: mobility car allowance), description (free text, required), severity (select: low, medium, high, critical), immediate action taken (free text), witnesses (optional).


*Expenses claim* — fields: claimant name (required), grade (required), claim period (date range, required), expense line items (up to 10 rows: date, description, category, amount), total (calculated), receipts attached (checkbox), manager approval name (required).
Customer Reference Number 
Forename(s) 
Surname 
Address Post Code
University
Course

Details of costs
Amount
Name of Supplier

**Generate your own.** Use your AI coding tool to create a fictional form in a policy area that interests you or relates to your work:

```
Generate a realistic government PDF form description for a
[type of application] process. Include: a list of all fields
with their types (text, date, dropdown, checkbox), which fields
are required, any validation rules (character limits, age checks,
format requirements), and any conditional logic (e.g. field X
only appears if field Y is answered a certain way).
```

---

<details>
<summary><strong>Hint 1 — Explore the problem: who uses this form and what goes wrong?</strong></summary>

Before writing any code, use your AI coding tool to map out the current experience for both the person submitting and the person receiving.

```
I am designing a digital replacement for a government PDF form
for a DSA Allowance application. Walk me through every step a user
takes today, from finding the form to receiving a response.
Where are the friction points? Where might someone give up?
```

```
What types of users might find this PDF form particularly
difficult to complete? Consider: people on mobile devices,
people with visual impairments, people whose first language is
not English, people without a printer. What specific barriers
does each face?
```

```
What does the experience look like for the person or team
receiving this form? What information do they need to process
it? What typically goes wrong with manual submissions?
```

</details>

<details>
<summary><strong>Hint 2 — Possible directions and design questions</strong></summary>

Once you understand the problem, you will have a better sense of what to build. Some directions teams have taken with this type of challenge:

**Make it work end to end.** The most important thing is that a user can start, complete, and submit the form — and receive meaningful confirmation that it has been received. A form that works end to end for a single journey is more valuable than one that partially covers several.

**Design for the user who will find it hardest.** If your form works well for a user with a visual impairment using a screen reader, it will work well for everyone. Accessibility is not a finishing step — it shapes how you structure the form from the start.

**Follow GOV.UK patterns.** The GOV.UK Design System has established patterns for every common form component: text inputs, dates, radios, checkboxes, error messages, confirmation pages. These patterns exist because they have been tested extensively with real users. Use them rather than inventing your own.

**Think about the "one thing per page" principle.** GOV.UK services typically ask one question per page. This makes it easier for users to focus, easier to handle errors, and easier to navigate back and change answers. It also makes the service easier to iterate on later.

**Consider what happens after submission.** Even a simple confirmation page with a reference number transforms the experience for the user. If you have time, think about what an acknowledgement email would say.

</details>

<details>
<summary><strong>Hint 3 — A starting point with specific prompts</strong></summary>

If your team wants a concrete direction to begin from, here is one approach.

Open `challenge-1/ sfe_dsa_slimline_form_2627_o.pdf` and note the fields, their types, and any validation rules (required fields, age checks, format constraints).

Give your AI coding tool the form details and ask it to generate a starting point:

```
I have a sfe_dsa_slimline_form_2627_o.pdf form for the application. It has
these fields that are required to be filled

Build a web-based form that follows the GOV.UK Design System.
Use the GOV.UK Frontend toolkit or replicate the styling. Include
client-side validation with GOV.UK-style error messages, and a
confirmation page at the end. Make it keyboard navigable.
```

From there, you might focus on:

- Making the error messages specific and helpful ("Enter your date of birth" not "This field is required")
- Converting to a multi-page flow with one question per page
- Adding a "check your answers" page before the confirmation
- Running an accessibility audit and documenting what you find

```
Audit this HTML form for WCAG 2.2 compliance. Check: all fields
have visible labels linked with for/id, error messages use
aria-describedby, the error summary is focused on submission,
colour contrast meets AA standards, and the form is fully
keyboard navigable. List any issues found.
```

The GOV.UK Prototype Kit is also available if your team would prefer a rapid prototyping environment over a custom build.

</details>



# Challenge 3: Supporting DSA Allowance decisions

A caseworker receives a new DSA Allowance Form. To understand it, they open a case management system, a policy guidance document stored on a shared drive, and an email thread from the previous officer who handled it. They read through weeks of notes to understand where the case has got to. They look up which policy applies and what evidence is needed. They check whether any deadlines are approaching. Then they decide what action to take.

This pattern repeats, case after case, throughout the day. Across government, thousands of caseworkers spend a significant proportion of their time on these information-gathering tasks — rather than on the judgement and human decision-making that only a person can provide.

## The experience today

A caseworker opens a case that was assigned to them yesterday. The previous officer has left notes but they are spread across three different fields in the case management system. There is a timeline of events but it does not explain why certain decisions were made. The caseworker needs to know which policy applies — but the policy guidance is a 40-page document and they are not sure which version is current.

They establish that evidence was requested six weeks ago. They are not sure whether it arrived. They check the notes again. It is unclear. They send a chasing email. Later that day they find out the evidence was actually received three weeks ago but logged in a different system.

The applicant, meanwhile, has heard nothing for six weeks. They do not know whether their case is progressing or whether something has gone wrong.

## The users

**The caseworker** — managing 20 to 40 active cases at any given time. They need to understand a new case quickly, know what action is required, and be confident they are applying the correct policy. They are not a technical user. Opening multiple systems and reading through lengthy notes to get to a decision is a normal part of their day — but it is time that could be spent on cases that genuinely need careful human consideration.

**The team leader** — responsible for a caseload of perhaps 200 to 300 active cases across their team. They need to know which cases are at risk of breaching a deadline, which need escalating, and where their team's capacity is under pressure. They currently get this picture by asking their caseworkers, not from a system.

**The applicant** — a citizen or organisation waiting for a decision. They submitted their application weeks ago. They do not know where their case is in the process. They do not know whether the right evidence has been received. They cannot get a meaningful update without calling a helpline.

## Why this matters

Caseworking is one of the largest categories of work in the civil service. Departments across government — in areas covering employment support, tax, immigration, student loans, and many others — each run caseworking operations at significant scale. The systems they use are different, but the underlying patterns are the same: receive a case, gather evidence, apply policy, make a decision, communicate the outcome.

Supporting caseworkers to do this work more effectively — by surfacing the right information at the right moment — has the potential to reduce processing times, improve consistency, and free up caseworkers to focus on the decisions that require genuine human judgement.

## A note on AI model access

The event does not provide access to AI models (such as large language model APIs) for use within your application. This is relevant to this challenge because capabilities like case summarisation would typically involve a language model.

You have three options:

- if your team has access to AI models through your department, personal accounts, or locally hosted models, you can integrate them
- you can mock AI endpoints — build the system as if a model were available and return realistic pre-written responses
- you can build the non-AI parts of the system (case display, policy matching, workflow tracking) and demonstrate clearly where a model would plug in

The judging focuses on the quality of the prototype and the approach, not on whether you have a live model behind it. A well-architected system with mocked AI endpoints scores just as well as one with a live model.

To make this concrete: a tool that displays a case clearly, surfaces the relevant policy matched by case type, shows where the case sits in its workflow and what action is required next, and flags evidence that has been outstanding beyond the policy threshold — built entirely without a language model — is a complete and impressive prototype.

## Data provided

A starter dataset is available in the hackathon repository at `challenge-3/`:

| File | Description |
|------|-------------|
| `cases.json` | 10 synthetic cases covering three case types (allowance review, DSA Application, compliance check), with varied statuses, timelines, and case notes |
| `policy-extracts.json` | 10 policy extracts covering the three case types, including evidence requirements, escalation thresholds, and decision rules |
| `workflow-states.json` | A state machine definition for all three case types, with states, allowed transitions, required actions, and escalation thresholds |

The starter data is enough to build and demo against. If your team wants more cases, use your AI coding tool to generate them — the structure is fully defined in the sample records below. See Hint 3 for a generation prompt.

### Sample case record structure

Each case in `cases.json` follows this structure:

```json
{
  "case_id": "CASE-2026-00042",
  "case_type": "allowance_review",
  "status": "awaiting_evidence",
  "applicant": {
    "name": "Jordan Smith",
    "reference": "REF-77291",
    "date_of_birth": "1985-03-14"
  },
  "assigned_to": "team_b",
  "created_date": "2026-01-10",
  "last_updated": "2026-03-28",
  "timeline": [
    {
      "date": "2026-01-10",
      "event": "case_created",
      "note": "Initial application received via online portal."
    },
    {
      "date": "2026-01-15",
      "event": "evidence_requested",
      "note": "Requested proof of address and income statement."
    },
    {
      "date": "2026-02-02",
      "event": "evidence_received",
      "note": "Proof of address received. Income statement still outstanding."
    }
  ],
  "case_notes": "Applicant relocated from Birmingham to Manchester in December 2025. Previous claim under reference REF-55102 was closed in November 2025. New claim opened due to change of circumstances. Awaiting income statement — applicant stated employer has been contacted."
}
```

### Sample policy extract structure

```json
{
  "policy_id": "POL-BR-003",
  "title": "Evidence requirements for allowance reviews",
  "applicable_case_types": ["allowance_review"],
  "body": "When a allowance review is triggered by a change of circumstances, the caseworker must obtain: (1) proof of the new address, (2) an income statement covering the 3 months prior to the change, and (3) a signed declaration confirming the change. If any evidence is outstanding after 28 days, the caseworker should issue a reminder. If outstanding after 56 days, the case should be escalated to a team leader."
}
```

---

<details>
<summary><strong>Hint 1 — Explore the problem: what does a caseworker actually need?</strong></summary>

Before writing any code, use your AI coding tool to understand what the caseworker and applicant experience actually looks like.

```
I am designing a tool to support government caseworkers. A
caseworker processes allowance review cases. Walk me through
their working day — what information do they need, where do
they get it, what decisions do they make, and where is time
spent on tasks that follow predictable patterns?
```

```
Here is a sample case record: [paste a record from cases.json].
What does a caseworker need to know in the first two minutes of
opening this case? What is present? What is missing or unclear?
What could go wrong without the right information to hand?
```

```
From the perspective of the applicant — the person whose case
this is — what is the experience like? What do they know about
the status of their case? What would good communication look
like?
```

</details>

<details>
<summary><strong>Hint 2 — Possible directions and design questions</strong></summary>

Once you understand the problem, you will have a clearer sense of which part of the caseworker experience to focus on. The data provided covers three areas — cases, policy, and workflow — and they connect in interesting ways.

**The information problem.** A caseworker needs to understand a case quickly. The case notes, timeline, and applicant details tell a story — but that story is currently scattered. Presenting it in a clear, structured way, with the most important information prominent, is a real improvement even without any AI involved.

**The policy problem.** Knowing which policy applies to a case is a matching problem — if you know the case type, you can identify the relevant policies. Surfacing those policies alongside the case, rather than making the caseworker look them up separately, removes a repeated task. The interesting design question is: which part of the policy does this caseworker need right now?

**The workflow problem.** The workflow state machine in the data tells you exactly where a case should be and what should happen next. Making that visible — and flagging cases where something is overdue or where a deadline is approaching — is a concrete, achievable capability that does not require a language model.

**The AI layer.** If you want to add summarisation or more intelligent matching, you can mock an endpoint that returns a pre-written summary for now. The important thing is to design the interface so the mock can be replaced by a real model call later without changing anything else.

</details>

<details>
<summary><strong>Hint 3 — A starting point with specific prompts</strong></summary>

If your team wants a concrete direction, here is one approach.

To generate more cases if you need them:

```
Here is the structure of a case record: [paste one record from
cases.json]. Generate 20 more synthetic cases with varied case
types (allowance_review, dsa_application, compliance_check),
different statuses, realistic timelines, and detailed case
notes. Include some with complications — missing evidence,
approaching deadlines, escalated cases.
```

Start with the data. Load `cases.json` and display a single case clearly:

```
I have a JSON file of casework records. Each case has a case_id,
case_type, status, applicant details, a timeline of events, and
free-text case notes. Build a simple web interface that loads
the JSON and displays a single case: applicant details at the
top, the timeline as a vertical list showing dates and events,
and the case notes below. Make it readable and well-structured.
```

Then add policy matching:

```
I have a JSON file of policy extracts, each with a policy_id,
title, applicable_case_types, and body text. Given a case with
case_type "allowance_review", find all matching policies and
display them alongside the case. Show the policy title and the
relevant body text.
```

Then use the workflow data to show case status and required actions:

```
I have a workflow state machine in JSON with states, allowed
transitions, and required actions at each stage. Given a case
with status "awaiting_evidence", show: the current state, what
action is required, and whether any deadlines have been missed
based on the timeline of events and the policy thresholds.
```

From there, you might explore: what happens if evidence has been outstanding for more than 28 days? What does the team leader's view look like across multiple cases? What would you need to add for this to be useful to a real caseworker?

</details>

## What does a good outcome look like?

By the end of the day, you should be able to show a tool that makes a caseworker's job meaningfully easier — not by making decisions for them, but by surfacing the right information at the right moment. If you can demo a case, show the relevant policy alongside it, show where it sits in its workflow and what action is required, and explain honestly what is mocked and what would need a real model — that is a complete and credible prototype.



