import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import specialistStyles from './SpecialistCTA.module.css';
import finalStyles from '../sections/FinalCTA.module.css';

function stylesheet(path: URL, classes: Record<string, string>) {
  return readFileSync(path, 'utf8').replace(
    /\.([a-zA-Z_][\w-]*)/g,
    (selector, name: string) =>
      classes[name] ? `.${classes[name]}` : selector,
  );
}

function luminance(rgb: number[]) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

it('keeps the native disclosure readable inside the final CTA copy styles', () => {
  const executable =
    process.env.CHROME_BIN ??
    [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      ...['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'].map((key) =>
        join(
          process.env[key] ?? '',
          'Google',
          'Chrome',
          'Application',
          'chrome.exe',
        ),
      ),
    ].find(existsSync);
  if (!executable)
    throw new Error(
      'The native disclosure regression needs Chromium. Set CHROME_BIN to its executable.',
    );
  const directory = mkdtempSync(join(tmpdir(), 'brightfield-specialist-'));
  try {
    const css =
      stylesheet(
        new URL('./SpecialistCTA.module.css', import.meta.url),
        specialistStyles,
      ) +
      stylesheet(
        new URL('../sections/FinalCTA.module.css', import.meta.url),
        finalStyles,
      );
    const file = join(directory, 'disclosure.html');
    writeFileSync(
      file,
      `<!doctype html><style>:root{--paper:#FBFCFD;--navy:#102B4E;--blue:#315C9A;--sky:#EDF4F7;}${css}</style>
      <div class="${finalStyles.copy}"><div popover="manual" class="${specialistStyles.popover}"><p class="${specialistStyles.copy}">This is where we’d connect you with a solar specialist. It’s a demo, so you get the sunshine without the sales call. No request has been sent. 😄</p></div></div>
      <output id="regression-result"></output><script>
      const panel=document.querySelector('[popover]');panel.showPopover();
      for(const animation of panel.getAnimations()) animation.finish();
      document.querySelector('#regression-result').textContent=JSON.stringify({
        text:getComputedStyle(panel.querySelector('p')).color,
        background:getComputedStyle(panel).backgroundColor
      });</script>`,
    );
    const result = spawnSync(
      executable,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--no-first-run',
        `--user-data-dir=${join(directory, 'profile')}`,
        '--dump-dom',
        pathToFileURL(file).href,
      ],
      { encoding: 'utf8', timeout: 15000 },
    );
    if (result.error) throw result.error;
    const payload = result.stdout.match(
      /<output id="regression-result">([^<]+)<\/output>/,
    )?.[1];
    if (result.status !== 0 || !payload)
      throw new Error(`Native disclosure fixture failed: ${result.stderr}`);
    const colors = JSON.parse(payload) as { text: string; background: string };
    const text = luminance(colors.text.match(/\d+/g)!.map(Number));
    const background = luminance(colors.background.match(/\d+/g)!.map(Number));
    expect(
      (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
  } finally {
    rmSync(directory, { recursive: true, force: true, maxRetries: 3 });
  }
}, 20000);
