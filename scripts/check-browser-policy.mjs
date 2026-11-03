/** Record resolved Playwright policy without dumping arbitrary project use/metadata. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
export default class BrowserPolicy {
  constructor(options = {}) {
    this.suite = options.suite ?? process.env.CHECK_BROWSER_SUITE ?? 'browser';
  }
  onBegin(config) {
    if (
      !['browser', 'loading', 'security', 'stack', 'catalog'].includes(
        this.suite,
      )
    )
      throw Error('Unknown browser evidence suite');
    const output = path.resolve(
      config.rootDir,
      '../../..',
      '.data/local-checks',
    );
    const policy = {
      format: 1,
      version: config.version,
      workers: config.workers,
      forbidOnly: config.forbidOnly,
      failOnFlakyTests: config.failOnFlakyTests,
      fullyParallel: config.fullyParallel,
      globalTimeout: config.globalTimeout,
      projects: config.projects.map((project) => ({
        name: project.name,
        retries: project.retries,
        repeatEach: project.repeatEach,
        timeout: project.timeout,
        expectTimeout: project.expect?.timeout ?? 5000,
        use: Object.fromEntries(
          [
            'browserName',
            'channel',
            'headless',
            'viewport',
            'locale',
            'timezoneId',
            'trace',
            'screenshot',
          ]
            .filter((key) => project.use[key] !== undefined)
            .map((key) => [key, project.use[key]]),
        ),
      })),
    };
    mkdirSync(output, { recursive: true });
    writeFileSync(
      path.join(output, this.suite + '-policy.json'),
      JSON.stringify(policy, null, 2) + '\n',
    );
  }
}
