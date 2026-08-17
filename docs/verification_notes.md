# Portal Verification Notes

The authenticated administrator dashboard was checked in the browser preview after the session and portal queries resolved. It rendered the Ecology Consulting identity consistently: forest-green navigation, sage operational accents, warm off-white surfaces, a serif display hierarchy, and clear dashboard metrics.

The WHS library, EC Forms, Project Tracker, Timesheets, Training, Noticeboard, BOSTA Stage 1 generator, and Admin Control Centre were each opened in the authenticated preview. The portal displayed correct branded page states and appropriate empty states where no authentic organisational content had yet been uploaded or created. The exact external timesheet destination was visible as `https://staff.ecologyconsulting.au/` through the displayed `staff.ecologyconsulting.au` links.

The BOSTA view includes all planned guided inputs, an on-page branded memo preview area, and an Approved Templates library. The administrator view includes incoming request actioning, document upload, project allocation, training-resource upload, announcements, user access control, project status, internal time activity, document oversight, and generated-memo oversight.

## WHS Draft Studio desktop review

The desktop WHS Draft Studio route was rendered after the authenticated portal queries settled. It provides visible document-type controls for risk assessments, pre-mobilisation checks, SWMS, and psychosocial risk assessments; a staff-supplied input form; a mandatory accuracy confirmation; a clearly labelled **Draft for competent review** warning; an in-page draft preview surface; and a retained draft-record section. The design preserves the Ecology Consulting visual system while separating source inputs from the generated working draft.

The Administrator Control Centre was also checked after its operational queries settled. It includes a dedicated **WHS draft review** queue. The queue displays draft author, document type, current status, and a controlled status selector for administrator review, while clearly distinguishing working documents from approved portal content.

## Portal separation review

The authenticated administrator was tested at both `/admin` and `/staff`. The `/admin` route presents a dedicated Administration sidebar with only the Admin Control Centre entry and governance copy. Navigating an authenticated administrator to `/staff` returns the administrator to `/admin`, confirming that staff route access is role-aware and that the administrator experience no longer exposes the mixed Staff workspace navigation.

The redirect check was repeated at `/staff` in the authenticated administrator session. The rendered result showed the isolated Administration sidebar and **Admin control centre**, confirming that the role-aware redirect remains active in the final route configuration.

Technical checks completed successfully: TypeScript compilation passed and all ten Vitest assertions passed. The suite covers BOSTA threshold/pathway logic, administrator procedure access control, session logout behaviour, WHS draft guardrail structure, and mocked WHS draft generation, persistence, review submission, and administrator review actioning.

## Mobile review

The portal was reviewed at a 390 × 844 mobile viewport. The EC Forms page remained readable and usable with a single-column request form and tracking card. The Timesheets page preserved the external formal-timesheet link, internal log form, and recent-entry area without horizontal overflow. The BOSTA Stage 1 workflow correctly collapses into a single column with a full-width guided form, memo-preview panel, and report-template library. The administrator control centre also reflows its oversight panels and content-management forms into a clear vertical sequence.
