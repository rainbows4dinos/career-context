/** @typedef {'neutral'|'accent'|'active'|'positive'|'negative'|'highlight'} BadgeTone */

/** Presentation only; persisted values and labels are unchanged.
 * @type {Readonly<Record<import('./model.js').ProspectStatus, BadgeTone>>} */
export const STATUS_BADGE_TONES = Object.freeze({
  prospect: 'neutral', interested: 'accent', applying: 'active', applied: 'accent',
  recruiter: 'active', interviewing: 'active', final: 'highlight', offer: 'positive',
  passed: 'neutral', rejected: 'negative', withdrawn: 'neutral', closed: 'neutral'
});
