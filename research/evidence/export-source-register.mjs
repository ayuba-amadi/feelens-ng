import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(new URL('../..', import.meta.url).pathname);
const evidenceRoot = path.join(repositoryRoot, 'research', 'evidence');
const archiveRoot = path.join(evidenceRoot, 'archive');
const frontendDataRoot = path.join(repositoryRoot, 'frontend', 'src', 'data');
const apiBase = (process.env.FEELENS_API_BASE_URL || 'https://feelens.ng/api').replace(/\/$/, '');
const downloadedAt = process.env.FEELENS_EXPORT_DATE || '2026-10-25';

const archiveSlugs = {
  'FCT Internal Revenue Service': 'fct-irs',
  'National Identity Management Commission': 'nimc',
  'Nigeria Immigration Service': 'nis',
  'Federal Road Safety Corps': 'frsc',
  'Corporate Affairs Commission': 'cac',
  'Abuja Geographic Information Systems': 'agis',
  'High Court of the Federal Capital Territory': 'fct-high-court',
  'National Population Commission': 'npc',
  'Joint Admissions and Matriculation Board': 'jamb',
  'Nigerian Export Promotion Council': 'nepc',
  'National Agency for Food and Drug Administration and Control': 'nafdac',
  'Standards Organisation of Nigeria': 'son',
  'Federal Ministry of Interior': 'ministry-interior-marriage-registry',
  'Nigerian Copyright Commission': 'nigerian-copyright-commission',
  'Nigerian Communications Commission': 'ncc'
};

const archiveDirectories = [
  'fct-irs', 'nimc', 'nis', 'frsc', 'cac', 'agis', 'fct-high-court', 'npc', 'jamb',
  'nepc', 'nafdac', 'son', 'ministry-interior-marriage-registry',
  'nigerian-copyright-commission', 'ncc'
];

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function curlJson(endpoint) {
  const { stdout } = await execFileAsync('curl', [
    '--fail', '--silent', '--show-error', '--retry', '5', '--retry-all-errors', '--retry-delay', '1',
    '--connect-timeout', '20', '--max-time', '60', `${apiBase}${endpoint}`
  ], { maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function mapWithConcurrency(items, limit, callback) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await callback(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function sourceRecord(source, service) {
  const mda = service.mda?.name || service.mdaName || source.publisher || 'Unknown MDA';
  const noteParts = [];
  if (source.isPrimary === true) noteParts.push('Primary evidence link for this service record.');
  if (source.pageOrSection) noteParts.push(`Reference: ${source.pageOrSection}.`);
  if (source.excerpt) noteParts.push(`Excerpt retained in the public evidence link: ${source.excerpt}`);
  noteParts.push('Verification status is the linked service-level public status; source-level status is not exposed by the public API.');
  return {
    source_id: `source-${source.id}`,
    mda,
    service: service.name,
    source_title: source.title,
    source_type: source.sourceType,
    evidence_tier: source.evidenceTier,
    publisher: source.publisher,
    source_url: source.url,
    publication_date: dateOnly(source.publicationDate),
    effective_date: dateOnly(source.effectiveDate),
    last_checked: dateOnly(source.accessedAt || source.retrievedDate),
    verification_status: service.verificationStatus || 'unknown',
    notes: noteParts.join(' ')
  };
}

async function downloadOfficialDocuments(uniqueSources) {
  const documentSources = [...uniqueSources.values()].filter((source) => /\.pdf(?:$|[?#])/i.test(source.url));
  const manifest = [];
  for (const source of documentSources) {
    const archiveSlug = archiveSlugs[source.publisher] || archiveSlugs[Object.keys(archiveSlugs).find((name) => source.publisher?.includes(name))];
    if (!archiveSlug) throw new Error(`No archive directory mapping for ${source.publisher}`);
    const url = new URL(source.url);
    const filename = decodeURIComponent(path.basename(url.pathname)) || `${source.source_id}.pdf`;
    const localDirectory = path.join(archiveRoot, archiveSlug);
    const localPath = path.join(localDirectory, filename);
    await mkdir(localDirectory, { recursive: true });
    await execFileAsync('curl', [
      '--fail', '--silent', '--show-error', '--location', '--retry', '5', '--retry-all-errors', '--retry-delay', '1',
      '--connect-timeout', '20', '--max-time', '120', '--output', localPath, source.source_url
    ], { maxBuffer: 2 * 1024 * 1024 });
    const fileStats = await stat(localPath);
    if (!fileStats.size) throw new Error(`Downloaded empty file: ${source.source_url}`);
    const content = await readFile(localPath);
    const sha256 = createHash('sha256').update(content).digest('hex');
    const fileType = (await execFileAsync('file', ['--brief', '--mime-type', localPath])).stdout.trim();
    manifest.push({
      MDA: source.publisher,
      source_title: source.title,
      source_url: source.source_url,
      local_file: path.relative(repositoryRoot, localPath),
      file_type: fileType,
      sha256,
      downloaded_at: downloadedAt,
      notes: 'Downloaded directly from the official source URL; dates remain blank when the source record does not provide them.'
    });
  }
  return manifest;
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(frontendDataRoot, { recursive: true });
  for (const slug of archiveDirectories) await mkdir(path.join(archiveRoot, slug), { recursive: true });

  const mdaPayload = await curlJson('/public/mdas?pageSize=100');
  const mdas = mdaPayload.items || [];
  const servicePayloads = await mapWithConcurrency(mdas, 4, (mda) => curlJson(`/public/mdas/${encodeURIComponent(mda.slug)}/services?pageSize=100`));
  const services = servicePayloads.flatMap((payload) => payload.items || []);
  const detailPayloads = await mapWithConcurrency(services, 4, (service) => curlJson(`/public/services/${encodeURIComponent(service.slug)}`));
  const records = detailPayloads.flatMap((payload) => {
    const service = payload.service || {};
    return (service.sources || []).map((source) => sourceRecord(source, service));
  });
  const uniqueSources = new Map(records.map((record) => [record.source_id, record]));
  const linkedServiceCounts = records.reduce((counts, record) => counts.set(record.source_id, (counts.get(record.source_id) || 0) + 1), new Map());
  const sourceRegister = {
    generated_at: downloadedAt,
    source_count: uniqueSources.size,
    evidence_link_count: records.length,
    records: records.map((record) => ({ ...record, linked_service_count: linkedServiceCounts.get(record.source_id) }))
  };

  await writeFile(path.join(evidenceRoot, 'feelens-source-register.json'), `${JSON.stringify(sourceRegister, null, 2)}\n`);
  const columns = ['source_id', 'mda', 'service', 'source_title', 'source_type', 'evidence_tier', 'publisher', 'source_url', 'publication_date', 'effective_date', 'last_checked', 'verification_status', 'notes'];
  const csv = [columns.join(','), ...records.map((record) => columns.map((column) => csvValue(record[column])).join(','))].join('\n') + '\n';
  await writeFile(path.join(evidenceRoot, 'feelens-source-register.csv'), csv);
  await writeFile(path.join(frontendDataRoot, 'source-register.json'), `${JSON.stringify(sourceRegister, null, 2)}\n`);

  const archiveManifest = await downloadOfficialDocuments(uniqueSources);
  const archiveColumns = ['MDA', 'source_title', 'source_url', 'local_file', 'file_type', 'sha256', 'downloaded_at', 'notes'];
  const archiveCsv = [archiveColumns.join(','), ...archiveManifest.map((row) => archiveColumns.map((column) => csvValue(row[column])).join(','))].join('\n') + '\n';
  await writeFile(path.join(evidenceRoot, 'archive-manifest.csv'), archiveCsv);
  console.log(JSON.stringify({ mdas: mdas.length, services: services.length, uniqueSources: uniqueSources.size, evidenceLinks: records.length, archivedDocuments: archiveManifest.length }, null, 2));
}

await main();
