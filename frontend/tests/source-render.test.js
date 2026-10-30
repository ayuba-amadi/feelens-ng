import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { createServer } from 'vite';
import { sourceRows } from '../src/lib/source-register.js';

test('source card renders the public source label and a service-slug link', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { SourceCard } = await vite.ssrLoadModule('/src/pages/DataSourcesPage.jsx');
    const [source] = sourceRows([{ title: 'Official FAQ', sourceType: 'official_faq', evidenceTier: 2, url: 'https://example.gov/faq', associations: [{ mdaSlug: 'mda', mdaName: 'MDA', serviceSlug: 'service', serviceName: 'Service', verificationStatus: 'verified' }] }]);
    const html = renderToStaticMarkup(React.createElement(StaticRouter, { location: '/data-sources' }, React.createElement(SourceCard, { source })));
    assert.match(html, /Official FAQ/);
    assert.match(html, /href="\/services\/service"/);
    assert.match(html, /https:\/\/example\.gov\/faq/);
    assert.doesNotMatch(html, /official_faq/);
  } finally { await vite.close(); }
});
