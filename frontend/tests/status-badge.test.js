import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('source-supported status is visibly distinct and explains that human review is missing', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { StatusBadge } = await vite.ssrLoadModule('/src/components/common/StatusBadge.jsx');
    const render = (status) => renderToStaticMarkup(React.createElement(StatusBadge, { status, showMeaning: true }));
    const sourceSupported = render('source_supported');
    assert.match(sourceSupported, /Source-supported — awaiting human review/);
    assert.match(sourceSupported, /official source is linked, but FeeLens has not recorded an authorised human review/i);
    for (const other of ['verified', 'pending', 'conflicting', 'historical_or_superseded']) {
      assert.doesNotMatch(render(other), /Source-supported — awaiting human review/);
    }
    assert.match(render('verified'), />Verified:/);
    assert.match(render('pending'), />Pending:/);
    assert.match(render('conflicting'), />Conflicting official information:/);
    assert.match(render('historical_or_superseded'), />Historical \/ superseded:/);
  } finally {
    await vite.close();
  }
});
