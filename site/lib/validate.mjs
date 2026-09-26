// The publication seed deliberately registers only this case. Expanding it requires review.
const fail = message => { throw new Error(message); };
const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) fail(`Missing or invalid ${label}`);
};
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Invalid calendar date');
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) fail('Invalid calendar date');
  return value;
}
export function safeUrl(value) {
  text(value, 'URL');
  if (/[\s\x00-\x1f\x7f\\]/.test(value)) fail('Invalid URL');
  if (value.startsWith('#') && /^#[a-z0-9-]+$/.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) {
    const parsed = new URL(value, 'https://local.invalid');
    if (parsed.origin !== 'https://local.invalid' || /%(?:2f|5c|00|0a|0d)/i.test(value)) fail('Invalid local URL');
    return value;
  }
  let parsed;
  try { parsed = new URL(value); } catch { fail('Invalid URL'); }
  if (!value.startsWith('https://') || parsed.protocol !== 'https:' || parsed.username || parsed.password) fail('URL must use HTTPS without credentials');
  return value;
}
export function siteOrigin(value = '') {
  if (value === '') return '';
  text(value, 'SITE_URL');
  // Reject URL-parser repairs (whitespace, backslashes, dot segments, empty ?/#).
  if (/[\x00-\x1f\x7f]/.test(value) || !/^https:\/\/[^/?#\s\\]+\/?$/.test(value)) fail('SITE_URL must be an HTTPS origin without a path, query, credentials or fragment');
  let parsed;
  try { parsed = new URL(value); } catch { fail('Invalid SITE_URL origin'); }
  if (parsed.username || parsed.password || !parsed.hostname) fail('SITE_URL must not contain credentials');
  return parsed.origin;
}
export function validateContent(publication, data) {
  if (!publication || !data || data.schema !== 'new-orleans-crime-case-v1') fail('Invalid case schema');
  for (const key of ['name', 'author', 'tagline']) text(publication[key], `publication ${key}`);
  siteOrigin(publication.preferredOrigin);
  if (!Array.isArray(publication.stories) || publication.stories.length !== 1) fail('Register exactly one case');
  const story = publication.stories[0];
  if (!story || story.slug !== 'jaren-lockhart' || data.slug !== story.slug) fail('Unregistered case slug');
  for (const key of ['title', 'subtitle', 'jurisdiction', 'summary']) text(story[key], `story ${key}`);
  validDate(story.reviewedDate); validDate(data.reviewedDate);
  if (story.reviewedDate !== data.reviewedDate) fail('Case and publication review dates differ');
  text(data.reviewScope, 'review scope');
  if (!Array.isArray(data.sources) || !data.sources.length || !Array.isArray(data.timeline) || !data.timeline.length) fail('Sources and timeline must be nonempty arrays');
  const sourceIds = new Set();
  const eventIds = new Set();
  const id = (value, seen) => {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value) || value === 'main' || seen.has(value)) fail('Invalid or duplicate content ID');
    seen.add(value);
  };
  for (const source of data.sources) {
    if (!source || typeof source !== 'object') fail('Invalid source');
    id(source.id, sourceIds);
    if (!['Court record', 'Official account', 'Reporting', 'Archive'].includes(source.type)) fail('Invalid source type');
    for (const key of ['title', 'publisher', 'format', 'description', 'limit']) text(source[key], `source ${key}`);
    safeUrl(source.url);
    if (!source.url.startsWith('https://') && source.url !== '/stories/jaren-lockhart/archive/') fail('Unregistered local source URL');
    validDate(source.checkedDate);
    if (source.checkedDate !== data.reviewedDate) fail('Source and case review dates differ');
    if (source.date !== null) {
      validDate(source.date);
      if (source.date > source.checkedDate) fail('Source date follows its review');
    }
  }
  // The hand-written account cites these records; dangling citations must fail the build.
  for (const required of ['appeal-2016', 'plea-2016', 'supreme-report-2017', 'original-archive']) {
    if (!sourceIds.has(required)) fail('Missing source used by the case account');
  }
  let previous = '';
  for (const event of data.timeline) {
    if (!event || typeof event !== 'object') fail('Invalid timeline event');
    id(event.id, eventIds); validDate(event.date);
    if (event.date < previous || event.date > data.reviewedDate) fail('Timeline dates must be ordered and no later than review');
    previous = event.date;
    if (!['Background', 'Court proceedings', 'Archive updates'].includes(event.category)) fail('Invalid event category');
    for (const key of ['title', 'text', 'locator']) text(event[key], `event ${key}`);
    if (!sourceIds.has(event.source)) fail('Unknown event source');
  }
}
