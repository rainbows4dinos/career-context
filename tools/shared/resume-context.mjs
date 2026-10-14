/** Parse fixed résumé facts from the master Markdown, never from model output. */
export function parseResumeContext(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const sections = [];
  for (const line of lines) {
    const heading = line.match(/^(#{1,2})\s+(.+?)\s*$/);
    if (heading) sections.push({ level: heading[1].length, title: heading[2], lines: [] });
    else sections.at(-1)?.lines.push(line.trim());
  }
  const plain = section => (section?.lines || []).filter(line => line && line !== '---' && !line.startsWith('- '));
  const contact = plain(sections.find(section => section.level === 2 && section.title === 'Contact'));
  const urls = contact.filter(line => /^https:\/\//.test(line));
  const linkedin = urls.find(url => new URL(url).hostname.replace(/^www\./, '') === 'linkedin.com') || '';
  const website = urls.find(url => url !== linkedin) || '';
  const email = contact.find(line => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line)) || '';
  const phone = contact.find(line => /^\+?[\d () .-]{7,}$/.test(line)) || '';
  const identity = contact.filter(line => !urls.includes(line) && line !== email && line !== phone);
  const [name, headline, location] = identity;
  if (identity.length !== 3 || !name || !headline || !location || !email || !phone || !website) {
    throw new Error('resume-master.md Contact must contain name, headline, location, website, email and phone.');
  }
  const entries = heading => {
    const start = sections.findIndex(section => section.level === 1 && section.title === heading);
    if (start < 0) throw new Error(`resume-master.md is missing ${heading}.`);
    const result = [];
    for (const section of sections.slice(start + 1)) {
      if (section.level === 1) break;
      result.push({ title: section.title.replace(/^Bachelor of Science,\s*/, 'BS, '), detail: plain(section).join(', ') });
    }
    return result;
  };
  const start = sections.findIndex(section => section.level === 1 && section.title === 'Experience');
  const end = sections.findIndex((section, index) => index > start && section.level === 1 && section.title === 'Additional Experience');
  if (start < 0 || end < 0) throw new Error('resume-master.md is missing the Experience or Additional Experience boundary.');
  const roles = sections.slice(start + 1, end).filter(section => section.level === 1).map(section => {
    const [title, dates] = plain(section);
    if (!title || !dates) throw new Error(`resume-master.md is missing title or dates for ${section.title}.`);
    return { company: section.title, title, dates: dates.replace(/\s*[–—]\s*/g, ' to ') };
  });
  if (!roles.length) throw new Error('resume-master.md has no work experience.');
  return { name, headline, location, email, phone, website, linkedin, education: entries('Education'), certifications: entries('Certifications'), roles };
}

/** Preserve tailored bullets while enforcing canonical employers, titles and dates. */
export function applyCanonicalExperience(resume, context) {
  const key = value => String(value || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
  const jobs = resume.experience || [];
  const selected = new Map();
  for (const job of jobs) {
    const role = context.roles.find(candidate => key(candidate.company) === key(job.company));
    if (!role || selected.has(role.company)) throw new Error(`Generated résumé contains an unknown or duplicate employer: ${job.company}.`);
    selected.set(role.company, { ...job, ...role });
  }
  const missing = context.roles.filter(role => !selected.has(role.company));
  if (missing.length) throw new Error(`Generated résumé is missing work experience: ${missing.map(role => role.company).join(', ')}.`);
  return { ...resume, experience: context.roles.map(role => selected.get(role.company)) };
}
