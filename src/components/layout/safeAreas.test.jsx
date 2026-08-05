import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Safe areas (FE #308).
 *
 * Installed as a standalone PWA there is no browser chrome, so anything that
 * reaches a screen edge sits under the status bar or the home indicator on a
 * notched device. These are file-level assertions on purpose: jsdom always
 * resolves `env(safe-area-inset-*)` to 0 and has no notion of standalone mode,
 * so the only thing that can be pinned in a unit test is that the declarations
 * are still there. The visual result has to be checked on a real device.
 */

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('safe areas', () => {
  it('opts the viewport into the display cutout', () => {
    const html = read('index.html');
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1];

    // Without this every env(safe-area-inset-*) below resolves to 0
    expect(viewport).toContain('viewport-fit=cover');
  });

  it('pads the body against the side insets', () => {
    const css = read('src/index.css');

    expect(css).toContain('padding-left: env(safe-area-inset-left, 0px)');
    expect(css).toContain('padding-right: env(safe-area-inset-right, 0px)');
  });

  it.each([
    ['src/components/layout/Header.jsx', 'env(safe-area-inset-top)'],
    ['src/components/layout/HeaderAuth.jsx', 'env(safe-area-inset-top)'],
    ['src/components/layout/Footer.jsx', 'env(safe-area-inset-bottom)'],
    ['src/components/ui/InstallBanner.jsx', 'env(safe-area-inset-bottom)'],
    ['src/components/scoring/ScoreInputPanel.jsx', 'env(safe-area-inset-bottom)'],
    ['src/components/quick_match/HandicapInputPanel.jsx', 'env(safe-area-inset-bottom)'],
    ['src/components/golf_course/GolfCourseForm.jsx', 'env(safe-area-inset-bottom)'],
  ])('%s keeps its inset padding', (path, inset) => {
    expect(read(path)).toContain(inset);
  });
});
