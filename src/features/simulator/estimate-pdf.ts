'use client';

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { EstimateSnapshot } from './estimate-document';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 60;
const CONTINUATION_TOP = 706;
const BODY_SIZE = 10.5;
const LINE_HEIGHT = 15;
const PARAGRAPH_GAP = 9;
const HEADING_HEIGHT = 26;
const colors = {
  navy: rgb(16 / 255, 43 / 255, 78 / 255),
  blue: rgb(49 / 255, 92 / 255, 154 / 255),
  text: rgb(36 / 255, 69 / 255, 104 / 255),
  muted: rgb(36 / 255, 69 / 255, 104 / 255),
  pale: rgb(237 / 255, 244 / 255, 247 / 255),
  rule: rgb(237 / 255, 244 / 255, 247 / 255),
  white: rgb(1, 1, 1),
};

class EstimateReport {
  private page: PDFPage;
  private cursor = 658;

  constructor(
    private readonly document: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.page.drawRectangle({
      x: 0,
      y: 678,
      width: PAGE_WIDTH,
      height: 114,
      color: colors.navy,
    });
    this.page.drawRectangle({
      x: MARGIN,
      y: 692,
      width: 48,
      height: 4,
      color: colors.blue,
    });
    this.page.drawText('BRIGHTFIELD SOLAR', {
      x: MARGIN,
      y: 750,
      font: bold,
      size: 13,
      color: colors.white,
    });
    this.page.drawText('Your solar estimate', {
      x: MARGIN,
      y: 710,
      font: bold,
      size: 28,
      color: colors.white,
    });
  }

  private wrap(
    text: string,
    font: PDFFont,
    size: number,
    width: number,
  ): string[] {
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      // A utility name or eligibility URL may have no spaces at all.
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > width) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  private nextPage(): void {
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.page.drawText('BRIGHTFIELD SOLAR', {
      x: MARGIN,
      y: 749,
      font: this.bold,
      size: 13,
      color: colors.navy,
    });
    this.page.drawText('Your solar estimate / continued', {
      x: MARGIN,
      y: 730,
      font: this.regular,
      size: 10,
      color: colors.muted,
    });
    this.page.drawLine({
      start: { x: MARGIN, y: 719 },
      end: { x: PAGE_WIDTH - MARGIN, y: 719 },
      thickness: 1,
      color: colors.rule,
    });
    this.cursor = CONTINUATION_TOP;
  }

  private reserve(height: number): void {
    if (this.cursor - height < BOTTOM) this.nextPage();
  }

  private paragraph(
    lines: readonly string[],
    size = BODY_SIZE,
    font = this.regular,
  ): void {
    const lineHeight = size === BODY_SIZE ? LINE_HEIGHT : size * 1.35;
    const height = lines.length * lineHeight + PARAGRAPH_GAP;
    if (height <= CONTINUATION_TOP - BOTTOM - HEADING_HEIGHT) {
      this.reserve(height);
    }
    let offset = 0;
    while (offset < lines.length) {
      const remaining = lines.length - offset;
      this.reserve(Math.min(remaining, 2) * lineHeight);
      let count = Math.min(
        remaining,
        Math.floor((this.cursor - BOTTOM) / lineHeight),
      );
      // Leave at least two lines at either end of a split paragraph.
      if (remaining - count === 1 && count > 2) count -= 1;
      for (const line of lines.slice(offset, offset + count)) {
        this.page.drawText(line, {
          x: MARGIN,
          y: this.cursor - size,
          font,
          size,
          color: colors.text,
        });
        this.cursor -= lineHeight;
      }
      offset += count;
      if (offset < lines.length) this.nextPage();
    }
    this.cursor -= PARAGRAPH_GAP;
  }

  selectedInputs(snapshot: EstimateSnapshot): void {
    this.paragraph(
      this.wrap(snapshot.cityLabel, this.bold, 16, CONTENT_WIDTH),
      16,
      this.bold,
    );
    this.paragraph(
      this.wrap(
        `Monthly electricity bill: $${snapshot.bill.toFixed(2)}   |   Coverage target: ${snapshot.coverage}%`,
        this.regular,
        11,
        CONTENT_WIDTH,
      ),
      11,
    );
    this.cursor -= 5;
  }

  metrics(snapshot: EstimateSnapshot): void {
    const metrics = [
      ['Number of panels', snapshot.result.panelCount],
      ['Investment after federal credit', snapshot.result.investment],
      ['Estimated monthly savings', snapshot.result.monthlySavings],
      ['Estimated payback', snapshot.result.payback],
    ];
    const gap = 12;
    const width = (CONTENT_WIDTH - gap) / 2;
    const height = 86;
    this.reserve(height * 2 + gap + 20);
    const top = this.cursor;
    for (const [index, [label, value]] of metrics.entries()) {
      const x = MARGIN + (index % 2) * (width + gap);
      const y = top - Math.floor(index / 2) * (height + gap);
      this.page.drawRectangle({
        x,
        y: y - height,
        width,
        height,
        color: colors.pale,
      });
      const innerWidth = width - 32;
      for (const [lineIndex, line] of this.wrap(
        label,
        this.regular,
        10,
        innerWidth,
      ).entries()) {
        this.page.drawText(line, {
          x: x + 16,
          y: y - 21 - lineIndex * 13,
          font: this.regular,
          size: 10,
          color: colors.muted,
        });
      }
      const size = Math.min(
        22,
        (22 * innerWidth) / this.bold.widthOfTextAtSize(value, 22),
      );
      this.page.drawText(value, {
        x: x + 16,
        y: y - 67,
        font: this.bold,
        size,
        color: colors.blue,
      });
    }
    this.cursor -= height * 2 + gap + 20;
  }

  sectionHeight(paragraphs: readonly string[]): number {
    return (
      HEADING_HEIGHT +
      paragraphs.reduce(
        (height, paragraph) =>
          height +
          this.wrap(paragraph, this.regular, BODY_SIZE, CONTENT_WIDTH).length *
            LINE_HEIGHT +
          PARAGRAPH_GAP,
        0,
      ) +
      10
    );
  }

  keepTogether(height: number): void {
    if (height <= CONTINUATION_TOP - BOTTOM) this.reserve(height);
  }

  section(title: string, paragraphs: readonly string[]): void {
    const wrapped = paragraphs.map((paragraph) =>
      this.wrap(paragraph, this.regular, BODY_SIZE, CONTENT_WIDTH),
    );
    const height = this.sectionHeight(paragraphs);
    if (height <= CONTINUATION_TOP - BOTTOM) {
      this.reserve(height);
    } else {
      const firstHeight =
        (wrapped[0]?.length ?? 0) * LINE_HEIGHT + PARAGRAPH_GAP;
      this.reserve(
        HEADING_HEIGHT +
          (firstHeight <= CONTINUATION_TOP - BOTTOM - HEADING_HEIGHT
            ? firstHeight
            : LINE_HEIGHT * 2),
      );
    }
    this.page.drawText(title, {
      x: MARGIN,
      y: this.cursor - 14,
      font: this.bold,
      size: 14,
      color: colors.navy,
    });
    this.cursor -= HEADING_HEIGHT;
    for (const lines of wrapped) this.paragraph(lines);
    this.cursor -= 10;
  }

  footers(): void {
    const pages = this.document.getPages();
    for (const [index, page] of pages.entries()) {
      page.drawLine({
        start: { x: MARGIN, y: 47 },
        end: { x: PAGE_WIDTH - MARGIN, y: 47 },
        thickness: 0.75,
        color: colors.rule,
      });
      page.drawText('Brightfield Solar | Fictional estimate', {
        x: MARGIN,
        y: 30,
        font: this.regular,
        size: 8,
        color: colors.muted,
      });
      const pagination = `Page ${index + 1} of ${pages.length}`;
      page.drawText(pagination, {
        x: PAGE_WIDTH - MARGIN - this.regular.widthOfTextAtSize(pagination, 8),
        y: 30,
        font: this.regular,
        size: 8,
        color: colors.muted,
      });
    }
  }
}

function filename(snapshot: EstimateSnapshot): string {
  const city =
    snapshot.citySlug
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'city';
  return `brightfield-solar-${city}-bill-${snapshot.bill}-coverage-${snapshot.coverage}.pdf`;
}

export async function generateEstimatePdf(
  snapshot: EstimateSnapshot,
): Promise<File> {
  const document = await PDFDocument.create();
  document.setTitle(`Brightfield Solar estimate - ${snapshot.cityLabel}`);
  document.setAuthor('Brightfield Solar');
  document.setSubject('Fictional solar estimate, assumptions, and limitations');
  document.setCreator('Brightfield Solar simulator');
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const report = new EstimateReport(document, regular, bold);
  report.selectedInputs(snapshot);
  report.metrics(snapshot);
  report.section('Important considerations', [
    snapshot.stateIncentiveNote,
    ...snapshot.notices,
  ]);
  // Keep the explanation and its limitations together whenever one page can fit both.
  report.keepTogether(
    report.sectionHeight([snapshot.explanation]) +
      report.sectionHeight([snapshot.disclaimer]),
  );
  report.section('How it is calculated', [snapshot.explanation]);
  report.section('Estimate limitations', [snapshot.disclaimer]);
  report.footers();
  const bytes = await document.save({ useObjectStreams: false });
  return new File([bytes.buffer as ArrayBuffer], filename(snapshot), {
    type: 'application/pdf',
  });
}
