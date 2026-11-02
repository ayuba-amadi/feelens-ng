import { CalendarDays, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, formatSourceType, valueOf } from '../../lib/format';
import { nimcPdfPage, nimcPrintedPage, nimcSectionLabel, nimcViewerHref, nisViewerHref } from '../../lib/nimc';
import { ExternalLink } from '../common/ExternalLink';

export function EvidenceCard({ source }) {
  const url = valueOf(source, 'url', 'officialUrl', 'official_url');
  const title = valueOf(source, 'title', 'name') || 'Untitled source';
  const viewerHref = nimcViewerHref(source) || nisViewerHref(source);
  const excerpt = valueOf(source, 'excerpt');
  const rawReference = valueOf(source, 'pageOrSection', 'page_or_section', 'documentReference', 'document_reference');
  const nipcSection = String(rawReference || '').match(/Section\s+(6\.[123])/i)?.[1] || null;
  const nipcPrintedPage = String(rawReference || '').match(/Printed page\s+(\d+)/i)?.[1] || null;
  const nipcPdfPages = String(rawReference || '').match(/PDF pages?\s+([\d–-]+)/i)?.[1] || null;
  const nipcPdfPage = nipcPdfPages?.match(/\d+/)?.[0] || null;
  const sectionLabel = nipcSection || nimcSectionLabel(source);
  const printedPage = nipcPrintedPage ? Number(nipcPrintedPage) : nimcPrintedPage(source);
  const pdfPage = nipcPdfPage ? Number(nipcPdfPage) : nimcPdfPage(source);
  const pubDate = valueOf(source, 'publicationDate', 'publication_date', 'effectiveDate');
  const accessedAt = valueOf(source, 'accessedAt', 'accessed_at', 'retrievedAt', 'checkedAt');
  const pdfPageSuffix = pdfPage ? `#page=${pdfPage}` : '';
  const sourceHref = url ? (url.includes('#page=') ? url : `${url}${pdfPageSuffix}`) : null;
  const rawSourceType = valueOf(source, 'sourceType', 'source_type', 'type');
  const sourceTypeText = String(rawSourceType || '').toLowerCase() === 'service_level_agreement'
    ? 'Official Document · Service Level Agreement'
    : (formatSourceType(rawSourceType) || 'Official Document');
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <FileText size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="break-words font-bold text-ink">{title}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            {sourceTypeText}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2.5 text-sm sm:grid-cols-2">
        {sectionLabel ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Section</dt>
            <dd className="mt-1 text-slate-700">{sectionLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Publisher</dt>
          <dd className="mt-1 text-slate-700">{valueOf(source, 'publisher', 'issuingBody') || 'Not listed'}</dd>
        </div>
        {printedPage ? (
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Printed page</dt>
            <dd className="mt-1 text-slate-700">
              {printedPage}{nipcPdfPages && /[–-]/.test(nipcPdfPages) ? ` (PDF pages ${nipcPdfPages})` : pdfPage ? ` (PDF page ${pdfPage})` : ''}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Publication / effective date</dt>
          <dd className="mt-1 text-slate-700">{pubDate ? formatDate(pubDate) : 'Publication / effective date not stated by source'}</dd>
        </div>
        {accessedAt ? (
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Source accessed</dt>
            <dd className="mt-1 inline-flex items-center gap-1 text-slate-700">
              <CalendarDays size={14} aria-hidden="true" />
              {formatDate(accessedAt)}
            </dd>
          </div>
        ) : null}
      </dl>
      {rawReference && !sectionLabel && !printedPage ? (
        <p className="mt-3 break-words border-t border-slate-200 pt-3 text-sm text-slate-600">
          Reference: {rawReference}
        </p>
      ) : null}
      {excerpt ? (
        <p className="mt-3 break-words border-t border-slate-200 pt-3 text-sm leading-6 text-slate-700">
          <span className="font-semibold text-ink">Evidence note:</span> {excerpt}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
        {sourceHref ? (
          <ExternalLink href={sourceHref} className="text-sm" label={`${nipcSection && url.includes('/sources/') ? 'View evidence copy' : 'View official source'}: ${title} (opens in a new tab)`}>
            {nipcSection && url.includes('/sources/') ? 'View evidence copy' : 'View official source'}
          </ExternalLink>
        ) : null}
        {viewerHref ? (
          <Link className="text-button text-sm" to={viewerHref}>
            Open viewer
          </Link>
        ) : null}
      </div>
    </article>
  );
}

