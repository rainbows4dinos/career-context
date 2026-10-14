import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseResumeContext, applyCanonicalExperience } from '../../shared/resume-context.mjs';

const master = await readFile(new URL('../../../resume-master.md', import.meta.url), 'utf8');

test('Builder contains no literal fixed résumé facts from the current master', async () => {
  const builder = await readFile(new URL('../../resume-tailor.html', import.meta.url), 'utf8');
  const context = parseResumeContext(master);
  const facts = [context.name, context.headline, context.location, context.email, context.phone, context.website, context.linkedin,
    ...[...context.education,...context.certifications].flatMap(entry => [entry.title,entry.detail]),
    ...context.roles.flatMap(role => [role.company,role.title,role.dates])];
  for (const fact of facts.filter(Boolean)) assert.ok(!builder.includes(fact), `Hardcoded résumé fact: ${fact}`);
});

test('all fixed facts follow changed master context, including every certification', () => {
  const original = parseResumeContext(master);
  const changed = master.replaceAll(original.name, 'Synthetic Applicant')
    .replace(original.headline, 'Synthetic Headline').replace(original.location, 'Synthetic City')
    .replace(original.email, 'changed@example.test').replace(original.phone, '555-111-2222')
    .replace(original.website, 'https://example.test/portfolio')
    .replace(original.linkedin, 'https://www.linkedin.com/in/synthetic-profile')
    .replace('Bachelor of Science, Interactive Media Design', 'Bachelor of Science, Changed Degree')
    .replace('Design Thinking Certificate', 'Changed Certificate').replace('IDEO U', 'Changed Institution')
    .replace(original.roles[0].title, 'Changed Role Title').replace('Jun 2026 – Sep 2026', 'May 2026 – Aug 2026');
  const parsed = parseResumeContext(changed);
  assert.deepEqual([parsed.name, parsed.headline, parsed.location, parsed.email, parsed.phone, parsed.website, parsed.linkedin],
    ['Synthetic Applicant', 'Synthetic Headline', 'Synthetic City', 'changed@example.test', '555-111-2222', 'https://example.test/portfolio', 'https://www.linkedin.com/in/synthetic-profile']);
  assert.equal(parsed.education[0].title, 'BS, Changed Degree');
  assert.deepEqual(parsed.certifications[0], { title:'Changed Certificate', detail:'Changed Institution' });
  assert.equal(parsed.certifications.length, 2);
  assert.equal(parsed.roles[0].title, 'Changed Role Title');
  assert.equal(parsed.roles[0].dates, 'May 2026 to Aug 2026');
  assert.deepEqual(parseResumeContext(changed.replaceAll('\n','\r\n')), parsed);
});

test('missing required contact or experience facts fail instead of using stale defaults', () => {
  assert.throws(() => parseResumeContext(master.replace(/503-475-7438/, '')), /Contact/);
  assert.throws(() => parseResumeContext(master.replace('# Experience', '# Missing')), /Experience/);
});

test('canonical work metadata survives altered model titles/dates, ordering and company aliases', () => {
  const context = parseResumeContext(master);
  const resume = { summary:'Tailored summary', experience:context.roles.map(role => ({ company:role.company, title:'Incorrect model title', dates:'Incorrect dates', bullets:['Tailored bullet'] })).reverse() };
  resume.experience.find(job => job.company === 'Wisdom Panel').company += ' (by Mars Petcare)';
  const normalized = applyCanonicalExperience(resume, context);
  assert.equal(normalized.summary, resume.summary);
  assert.deepEqual(normalized.experience.map(({company,title,dates}) => ({company,title,dates})), context.roles);
  assert.ok(normalized.experience.every(job => job.bullets[0] === 'Tailored bullet'));
  assert.equal(resume.experience[0].title, 'Incorrect model title');
});

test('unknown, duplicated or omitted employers fail without inventing work history', () => {
  const context = parseResumeContext(master);
  const experience = context.roles.map(role => ({...role, bullets:[]}));
  assert.throws(() => applyCanonicalExperience({experience:experience.slice(1)},context), /missing work experience/);
  assert.throws(() => applyCanonicalExperience({experience:[...experience, experience[0]]},context), /duplicate employer/);
  assert.throws(() => applyCanonicalExperience({experience:[...experience, {company:'Invented Employer'}]},context), /unknown/);
});
