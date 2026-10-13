# Status badges and board moves

The [Status-Badge component](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=134-13529) uses 20px height, 4px/6px padding, 2px corners and Inter Regular 12/12 typography. Figma binds both themes to the same primitive colors: neutral/200, secondary/100, primary/200, success/50, danger/50 and warning/50 backgrounds, with neutral/900 foregrounds. The requested `--ds-badge-{tone}-bg/fg` contract is defined in shared tokens; shared `.nc-status-badge` classes consume it. Badges are noninteractive spans on cards, the editor’s saved status and status-history entries.

`tools/career-radar/prospect-status.js` owns the status-to-tone mapping:

| Tone | Status values |
| --- | --- |
| neutral | prospect, passed, withdrawn, closed |
| accent | interested, applied |
| active | recruiter, interviewing, legacy applying |
| positive | offer |
| negative | rejected |
| highlight | final (labelled Final round) |

No status values or history are renamed. Applying remains readable for old records and is not selectable. Badge geometry and all six resolved colors were checked in local Chrome in both themes against Figma’s theme bindings. The mapping coverage test, typecheck, lint and diff checks pass.
