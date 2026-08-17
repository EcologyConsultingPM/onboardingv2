# AI-Assisted WHS Drafting Workflow

## Purpose and boundaries

The WHS Draft Studio will help Ecology Consulting staff prepare working drafts of risk assessments, pre-mobilisation checks, Safe Work Method Statements, and psychosocial risk assessments. It is a drafting tool only. A generated document remains clearly marked **Draft for competent review** until it is checked, completed, and approved through Ecology Consulting’s normal WHS process.

The assistant will not provide approval, confirm that work is safe to commence, invent site-specific controls, or replace field verification, consultation, inductions, permits, emergency planning, or professional judgment. Unknown matters will be identified as **[Confirm before approval]** items in the draft.

| Document type | Guided staff input | Draft outcome |
|---|---|---|
| Risk assessment | Activity, site, hazards, affected people, controls and residual risk | Risk register, control hierarchy prompts, review and sign-off points |
| Pre-mobilisation check | Scope, field team, travel, weather, access, vehicle, equipment and communications | Mandatory pre-field readiness checklist and unresolved item list |
| SWMS | Activity sequence, high-risk activities, people, plant, hazards, controls and emergency arrangements | Branded controlled-document outline, task steps, controls, PPE and approval prompts |
| Psychosocial risk assessment | Work context, consultation, psychosocial hazards, controls, support and review | Consultation-aware assessment draft, controls, monitoring and WHS Officer review prompts |

## Safety guardrails

Every AI request is made server-side and results are saved against the authenticated author. The assistant will be instructed to use only the information given, distinguish known information from assumptions, prioritise elimination and substitution controls before administrative controls and PPE, and produce a separate list of incomplete information. It will also remind users to stop, reassess, and follow organisation escalation processes where circumstances change or urgent risks are identified.

The portal will retain the source inputs, generated draft, author, document type, status, and timestamps. Staff can view their own drafts; administrators can oversee all drafts, but no generated content is treated as an approved operational document in the portal.
