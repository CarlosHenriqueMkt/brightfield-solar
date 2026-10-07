import type { CSSProperties } from 'react';
import styles from './Motto.module.css';

const COPY_LINES = ['A brighter home.', 'A clearer choice.'] as const;
const SEGMENTER = new Intl.Segmenter('en', { granularity: 'grapheme' });

type LetterStyle = CSSProperties & {
  '--letter-order': number;
};

type VisualLetter = {
  grapheme: string;
  style: LetterStyle;
};

type VisualPart =
  | {
      kind: 'word';
      letters: readonly VisualLetter[];
    }
  | {
      kind: 'space';
      value: string;
    };

type VisualLine = {
  parts: readonly VisualPart[];
};

function segmentCopy(lines: readonly string[]): readonly VisualLine[] {
  const segmentedLines: VisualLine[] = [];
  const letters: VisualLetter[] = [];

  for (const line of lines) {
    const parts: VisualPart[] = [];
    let word: VisualLetter[] = [];

    const flushWord = () => {
      if (word.length > 0) {
        const wordLetters = word;
        parts.push({ kind: 'word', letters: wordLetters });
        letters.push(...wordLetters);
        word = [];
      }
    };

    for (const { segment } of SEGMENTER.segment(line)) {
      if (/^\s+$/u.test(segment)) {
        flushWord();
        parts.push({ kind: 'space', value: segment });
      } else {
        const letter: VisualLetter = {
          grapheme: segment,
          style: { '--letter-order': 0 },
        };
        word.push(letter);
      }
    }

    flushWord();
    segmentedLines.push({ parts });
  }

  const lastLetterIndex = Math.max(letters.length - 1, 1);
  letters.forEach((letter, index) => {
    letter.style['--letter-order'] = index / lastLetterIndex;
  });

  return segmentedLines;
}

const VISUAL_LINES = segmentCopy(COPY_LINES);
const ACCESSIBLE_NAME = COPY_LINES.join(' ');

type MottoProps = {
  id?: string;
  className?: string;
  as?: 'h1' | 'h2';
};

export function Motto({ id, className, as: Heading = 'h1' }: MottoProps) {
  const headingClassName = [styles.heading, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Heading id={id} className={headingClassName} aria-label={ACCESSIBLE_NAME}>
      {VISUAL_LINES.map((line, lineIndex) => (
        <span
          className={styles.line}
          aria-hidden="true"
          key={`line-${lineIndex}`}
        >
          {line.parts.map((part, partIndex) => {
            if (part.kind === 'space') {
              return part.value;
            }

            return (
              <span
                className={styles.word}
                data-motto-word
                key={`word-${lineIndex}-${partIndex}`}
              >
                {part.letters.map((letter, letterIndex) => (
                  <span
                    aria-hidden="true"
                    className={styles.letter}
                    data-motto-letter
                    key={`letter-${lineIndex}-${partIndex}-${letterIndex}`}
                    style={letter.style}
                  >
                    {letter.grapheme}
                  </span>
                ))}
              </span>
            );
          })}
        </span>
      ))}
    </Heading>
  );
}
