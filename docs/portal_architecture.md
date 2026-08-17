# Ecology Consulting Staff Portal Architecture

## Access model

The portal uses the existing authenticated user identity with two database-backed roles. **Staff** can view published resources, manage their own request submissions and internal time records, work only within projects allocated to them, complete learning, use the BOSTA Stage 1 generator, and acknowledge published announcements. **Admin** can manage users and roles, create or allocate projects, upload documents and templates, publish training and announcements, review requests, and view all operational activity.

| Area | Staff access | Admin access |
|---|---|---|
| WHS and document library | View and download published materials | Upload, publish, organise, and manage all materials |
| EC Forms | Submit and track own requests | Review, annotate, and action all requests |
| Project tracker | Read allocated projects; add progress and notes | Create, update, allocate, and oversee all projects |
| Timesheet | Create and review own self-tracking entries | View all internal entries |
| Training | View resources, complete learning, and submit quizzes | Publish modules, resources, and quiz content; review completions |
| Communications | Read and acknowledge announcements | Publish and monitor acknowledgement status |
| BOSTA generator | Generate and save own Stage 1 memo drafts | View all generated memos and manage templates |

## Data and workflow conventions

File bytes are stored in managed object storage and only their secure storage identifiers and delivery URLs are retained in the database. Requests, project updates, training completions, timesheet entries, acknowledgements, and generated memos record their author or staff owner. Time-sensitive data is persisted in UTC and displayed in the visitor’s local time.

The portal uses a live-query pattern: after a user creates, updates, or actions a record, the affected data sets are refreshed immediately so staff dashboards and administrator oversight views stay current. The initial release intentionally does not seed fictional projects, staff activity, documents, reviews, or training results. Empty states direct the administrator to add authentic organisational content.

## BOSTA Stage 1 memo scope

The BOSTA tool will implement a guided Stage 1 input flow based on the supplied tool: project details, assessment basis, clearing threshold, Biodiversity Values Map review, potential significant impact, constraints, uncertainty, and recommendation. It calculates the clearing trigger using the supplied minimum-lot-size thresholds, shows pathway flags, and stores a review-ready branded memo record. Generated content remains a draft for professional review and approval.
