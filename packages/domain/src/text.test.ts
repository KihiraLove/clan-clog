import * as appText from './text.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultSiteCopy,
  parseSiteCopy,
  parseHardcoreAppearance,
} from './site-copy.js';
import {
  defaultSubmissionHelp,
  parseSubmissionHelp,
} from './submission-help.js';

test('shipped defaults have one source while saved regular/hardcore copy remains independent', () => {
  assert.equal(defaultSiteCopy.collectionTitle, 'Clan Collection Log');
  assert.equal(
    defaultSiteCopy.collectionTitle,
    appText.domainSiteCopyCollectionTitle,
  );
  assert.equal(
    defaultSubmissionHelp,
    appText.domainSubmissionHelpDefaultMarkdown,
  );
  const custom = {
    collectionTitle: 'A & B <clan>',
    collectionCaption: 'Our drops',
    xpTitle: 'Our XP',
  };
  assert.deepEqual(parseSiteCopy(custom), custom);
  assert.deepEqual(
    parseHardcoreAppearance({ clanName: 'Hardcore <clan>', copy: custom }),
    { clanName: 'Hardcore <clan>', copy: custom },
  );
  assert.equal(
    parseSubmissionHelp('## Saved help\n\nKeep **our** rules.'),
    '## Saved help\n\nKeep **our** rules.',
  );
});

test('complete messages preserve zero/one/many wording and arbitrary names without HTML interpretation', () => {
  for (const count of [0, 1, 4]) {
    assert.equal(
      appText.webUnknownMetricDialogSaveMetricAndContinue(count),
      count > 1 ? 'Save metrics and continue' : 'Save metric and continue',
    );
    assert.equal(
      appText.webCollectionLogItemLabel('A & B <item>', true, true, count),
      'A & B <item>: collected, hardcore' +
        (count >= 2 ? `, ${count} obtains` : ''),
    );
  }
  assert.equal(
    appText.webCollectionLogItemLabel('Item', false, false, 0),
    'Item: not collected',
  );
  assert.equal(
    appText.webAdminAccountsModerator('A <B> & C', 'disable'),
    'Moderator A <B> & C disabled.',
  );
  assert.equal(
    appText.webCompetitionImportPagesSelectedMessage(0, true),
    '0 pages selected. Update the preview to confirm these pages.',
  );
});

test('uncertain Discord receipts retain the no-repeat and no-credit instructions', () => {
  const message =
    appText.botHandlerSubmissionCouldNotBeConfirmedItMightHaveReachedThe(
      '\nDiscord interaction ID: 12345678901234567.',
    );
  assert.match(
    message,
    /might have reached the server and been saved for review/u,
  );
  assert.match(message, /Discord interaction ID: 12345678901234567\./u);
  assert.match(
    message,
    /Do not repeat \/cc-clog submit as a new command until checked/u,
  );
  assert.match(message, /No approval or collection credit is implied\.$/u);
});

// These assertions run during the domain compilation, without executing invalid calls.
const checkFormatterTypes = () => {
  // @ts-expect-error Missing semantic keys must fail compilation.
  void appText.webCollectionLogMissingLabel;
  // @ts-expect-error Counts are numbers, rather than arbitrary strings.
  appText.webUnknownMetricDialogSaveMetricAndContinue('2');
  // @ts-expect-error The collected flag is a boolean.
  appText.webCollectionLogItemLabel('Item', 'yes', false, 1);
};
void checkFormatterTypes;
