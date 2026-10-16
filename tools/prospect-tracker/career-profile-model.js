/** Stable factor IDs let future assessments cite a profile revision and factor. */
export const PROFILE_FIELDS = [
  ['strengths', 'Experience & strengths', 'One strength or transferable experience per line.'],
  ['seniority', 'Seniority & target roles', 'For example: Staff, Principal, Lead.'],
  ['scope', 'IC, player-coach & management', 'Describe the balance of hands-on work, mentorship and people management.'],
  ['focus', 'Consumer & enterprise work', 'What kind of product work interests you?'],
  ['sectors', 'Sectors & products', 'Industries, missions or products you want to work on.'],
  ['work_style', 'Working style', 'Team environment, collaboration and ownership.'],
  ['location', 'Location & remote work', 'Where you can work; remote, hybrid or onsite requirements.'],
  ['time_zones', 'Time zones & overlap', 'Time zones or working-hour constraints.'],
  ['employment', 'Employment type', 'Full-time, contract or fractional work.'],
  ['dealbreakers', 'Dealbreakers', 'True exclusions. Leave blank if not decided.'],
  ['exploration', 'Open to surprise', 'Adjacent roles, sectors or work worth considering.']
];
export const IMPORTANCE = ['hard', 'strong', 'soft', 'explore'];
/** @typedef {'hard'|'strong'|'soft'|'explore'} Importance */
/** @typedef {{value:string, importance:Importance}} Factor */
/** @typedef {{schema_version:1, factors:Record<string,Factor>, compensation:{minimum:number|null,currency:string,period:'year'|'hour',importance:Importance,unknown:'review'|'exclude'}}} Profile */
/** @returns {Profile} */
export function emptyProfile() {
  return { schema_version: 1, factors: Object.fromEntries(PROFILE_FIELDS.map(([id]) => [id, { value: '', importance: id === 'dealbreakers' ? 'hard' : id === 'exploration' ? 'explore' : 'soft' }])),
    compensation: { minimum: null, currency: 'USD', period: 'year', importance: 'hard', unknown: 'review' } };
}
/** @param {unknown} input @returns {Profile} */
export function validateProfile(input) {
  const value = /** @type {Profile} */ (input);
  if (!value || value.schema_version !== 1 || !value.factors || !value.compensation) throw new Error('Unsupported career profile format.');
  if (Object.keys(value).some(key => !['schema_version', 'factors', 'compensation'].includes(key))) throw new Error('Unexpected profile field.');
  if (Object.keys(value.factors).length !== PROFILE_FIELDS.length) throw new Error('Profile factors are incomplete.');
  for (const [id] of PROFILE_FIELDS) {
    const factor = value.factors[id];
    if (!factor || typeof factor.value !== 'string' || factor.value.length > 4000 || !IMPORTANCE.includes(factor.importance) || Object.keys(factor).some(key => !['value', 'importance'].includes(key))) throw new Error(`Invalid profile factor: ${id}`);
  }
  const c = value.compensation;
  if ((c.minimum !== null && (typeof c.minimum !== 'number' || !Number.isFinite(c.minimum) || c.minimum < 0 || c.minimum > 100000000)) || !/^[A-Z]{3}$/.test(c.currency) || !['year', 'hour'].includes(c.period) || !IMPORTANCE.includes(c.importance) || !['review', 'exclude'].includes(c.unknown) || Object.keys(c).some(key => !['minimum', 'currency', 'period', 'importance', 'unknown'].includes(key))) throw new Error('Invalid compensation settings.');
  return structuredClone(value);
}
/** Seed facts only from the canonical public source, without treating them as approved preferences.
 * @param {string} markdown @returns {Profile} */
export function careerContextDraft(markdown) {
  const draft = emptyProfile();
  const section = markdown.split('# Core Strengths\n')[1]?.split('\n---')[0] || '';
  draft.factors.strengths.value = section.split('\n').filter(line => line.startsWith('- ')).map(line => line.slice(2)).join('\n');
  const roles = markdown.split('# Target Roles\n')[1]?.split('\n---')[0] || '';
  draft.factors.seniority.value = [...new Set(roles.split('## Specialized Focus Areas')[0].split('\n').filter(line => /^[-–] /.test(line)).map(line => line.slice(2)))].join('\n');
  draft.factors.scope.value = 'Hands-on design leadership, strategy, mentorship and execution (player-coach).';
  draft.factors.scope.importance = 'strong';
  return draft;
}
/** Future consumers may use only explicitly reviewed profiles, never pending drafts or signals.
 * @param {{explicit_profile:unknown,reviewed_at:string|null,revision:number}} row */
export function reviewedFactors(row) {
  if (!row.reviewed_at) throw new Error('Review the career profile before using it.');
  const profile = validateProfile(row.explicit_profile);
  return { revision: row.revision, factors: profile.factors, compensation: profile.compensation };
}
