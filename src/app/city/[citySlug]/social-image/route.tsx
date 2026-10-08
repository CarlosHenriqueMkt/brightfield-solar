import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { getAllCitySlugs, getCityBySlug } from '@/domain/cities/cities';
import { getCityDisplayName } from '@/domain/cities/city-config';
import { FICTIONAL_PROJECT_NOTICE, SITE_NAME } from '@/domain/site';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;
const NAVY = '#102B4E';
const BLUE = '#315C9A';
const PAPER = '#FBFCFD';
const PALE_BLUE = '#EDF4F7';
const FONT_DIRECTORY = join(process.cwd(), 'src', 'app', 'fonts');
const regularFont = readFile(join(FONT_DIRECTORY, 'ibm-plex-400.ttf'));
const semiboldFont = readFile(join(FONT_DIRECTORY, 'ibm-plex-600.ttf'));

export function generateStaticParams() {
  return getAllCitySlugs().map((citySlug) => ({ citySlug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ citySlug: string }> },
) {
  const { citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  const [regular, semibold, poster] = await Promise.all([
    regularFont,
    semiboldFont,
    readFile(
      join(process.cwd(), 'public', city.scenePoster.desktopSrc.slice(1)),
    ),
  ]);
  const posterDataUri = `data:image/png;base64,${poster.toString('base64')}`;
  const displayName = getCityDisplayName(city);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: NAVY,
        fontFamily: 'IBM Plex Sans',
      }}
    >
      <img
        src={posterDataUri}
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '62%',
          display: 'flex',
          flexDirection: 'column',
          padding: '54px 58px 48px 68px',
          backgroundColor: PAPER,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: NAVY,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              display: 'flex',
              backgroundColor: BLUE,
              borderRadius: 3,
            }}
          />
          <span>{SITE_NAME.toUpperCase()}</span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 54,
            color: BLUE,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '0.1em',
          }}
        >
          FICTIONAL CHALLENGE PROJECT
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 16,
            color: NAVY,
          }}
        >
          <div
            style={{
              display: 'flex',
              maxWidth: 610,
              fontSize: displayName.length > 18 ? 62 : 76,
              lineHeight: 1,
              fontWeight: 600,
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 16,
              color: BLUE,
              fontSize: 28,
              lineHeight: 1.15,
              fontWeight: 400,
            }}
          >
            {city.stateFull}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
            paddingTop: 24,
            borderTop: `2px solid ${PALE_BLUE}`,
            color: NAVY,
          }}
        >
          <div
            style={{
              display: 'flex',
              color: BLUE,
              fontSize: 21,
              fontWeight: 600,
            }}
          >
            Illustrative solar-planning scenario
          </div>
          <div
            style={{
              display: 'flex',
              maxWidth: 570,
              marginTop: 12,
              color: NAVY,
              fontSize: 15,
              lineHeight: 1.35,
              fontWeight: 400,
            }}
          >
            {FICTIONAL_PROJECT_NOTICE}
          </div>
        </div>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'IBM Plex Sans', data: regular, weight: 400, style: 'normal' },
        {
          name: 'IBM Plex Sans',
          data: semibold,
          weight: 600,
          style: 'normal',
        },
      ],
    },
  );
}
