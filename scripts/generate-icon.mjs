/**
 * Generates app icons for MK Hatch Pilot.
 * Design: hatching egg with baby chick, using app brand colors.
 * Run: node scripts/generate-icon.mjs
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'assets');

// Brand colors
const GREEN_DARK   = '#2E5234';
const GREEN_MID    = '#3F6A45';
const GREEN_LIGHT  = '#5B8F62';
const ACCENT       = '#C97C42';
const EGGSHELL     = '#F4EFE6';
const EGG_SHADOW   = '#DDD0BA';
const CHICK_YELLOW = '#F5C83A';
const CHICK_LIGHT  = '#FFE566';
const BEAK_ORANGE  = '#E07828';
const BEAK_DARK    = '#C05A10';

function buildIconSvg(size) {
  const s = size / 1024; // scale factor

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="65%">
      <stop offset="0%" stop-color="${GREEN_LIGHT}"/>
      <stop offset="100%" stop-color="${GREEN_DARK}"/>
    </radialGradient>
    <radialGradient id="eggFill" cx="38%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="${EGGSHELL}"/>
    </radialGradient>
    <radialGradient id="chickFill" cx="38%" cy="30%" r="62%">
      <stop offset="0%" stop-color="${CHICK_LIGHT}"/>
      <stop offset="100%" stop-color="${CHICK_YELLOW}"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="rgba(0,0,0,0.35)"/>
    </filter>
    <filter id="chickShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="rgba(180,120,0,0.30)"/>
    </filter>
    <clipPath id="eggClip">
      <!-- Egg bottom half clip used for crack effect -->
      <rect x="0" y="570" width="1024" height="500"/>
    </clipPath>
  </defs>

  <!-- ── Background rounded square ── -->
  <rect width="1024" height="1024" rx="224" ry="224" fill="url(#bg)"/>

  <!-- ── Ground shadow ── -->
  <ellipse cx="512" cy="842" rx="195" ry="24" fill="rgba(0,0,0,0.18)"/>

  <!-- ── EGG BOTTOM (below crack line) ── -->
  <!--
    Egg shape: cubic bezier approximation of a natural egg.
    Egg center-bottom ~y=830, top ~y=355.
    Wide point ~y=630 (width ±195).
  -->
  <path
    d="
      M 512 830
      C 680 830, 710 710, 705 635
      C 700 560, 660 455, 610 400
      C 580 370, 548 355, 512 355
      C 476 355, 444 370, 414 400
      C 364 455, 324 560, 319 635
      C 314 710, 344 830, 512 830
      Z
    "
    fill="url(#eggFill)"
    stroke="${EGG_SHADOW}"
    stroke-width="5"
    filter="url(#shadow)"
    clip-path="url(#eggClip)"
  />

  <!-- ── EGG TOP (above crack, behind chick) ── -->
  <path
    d="
      M 328 588
      L 340 560
      L 375 575
      L 400 545
      L 432 568
      L 460 542
      L 490 562
      L 512 548
      L 534 562
      L 564 542
      L 592 568
      L 624 545
      L 649 575
      L 684 560
      L 696 588
      C 700 560, 660 455, 610 400
      C 580 370, 548 355, 512 355
      C 476 355, 444 370, 414 400
      C 364 455, 324 560, 328 588
      Z
    "
    fill="url(#eggFill)"
    stroke="${EGG_SHADOW}"
    stroke-width="5"
  />

  <!-- ── CHICK BODY (below head, peeking from egg) ── -->
  <ellipse
    cx="512" cy="600"
    rx="128" ry="96"
    fill="url(#chickFill)"
    filter="url(#chickShadow)"
  />

  <!-- ── WINGS ── -->
  <ellipse
    cx="370" cy="615"
    rx="52" ry="38"
    fill="${CHICK_YELLOW}"
    transform="rotate(-28 370 615)"
  />
  <ellipse
    cx="654" cy="615"
    rx="52" ry="38"
    fill="${CHICK_YELLOW}"
    transform="rotate(28 654 615)"
  />

  <!-- ── CHICK HEAD ── -->
  <circle
    cx="512" cy="468"
    r="128"
    fill="url(#chickFill)"
    filter="url(#chickShadow)"
  />

  <!-- ── Tuft feathers on top of head ── -->
  <ellipse cx="490" cy="348" rx="18" ry="32" fill="${CHICK_YELLOW}" transform="rotate(-18 490 348)"/>
  <ellipse cx="512" cy="342" rx="18" ry="34" fill="${CHICK_LIGHT}"/>
  <ellipse cx="534" cy="348" rx="18" ry="32" fill="${CHICK_YELLOW}" transform="rotate(18 534 348)"/>

  <!-- ── EYES ── -->
  <!-- Left eye -->
  <circle cx="468" cy="452" r="24" fill="#1C1C1C"/>
  <circle cx="475" cy="444" r="9" fill="white"/>
  <circle cx="477" cy="442" r="4.5" fill="white"/>
  <!-- Right eye -->
  <circle cx="556" cy="452" r="24" fill="#1C1C1C"/>
  <circle cx="563" cy="444" r="9" fill="white"/>
  <circle cx="565" cy="442" r="4.5" fill="white"/>

  <!-- ── BEAK ── -->
  <path d="M 488 487 L 512 522 L 536 487 Z" fill="${BEAK_ORANGE}"/>
  <path d="M 488 487 L 512 503 L 536 487 Z" fill="${BEAK_DARK}"/>

  <!-- ── CRACK DETAILS on egg top ── -->
  <line x1="400" y1="545" x2="386" y2="516" stroke="${EGG_SHADOW}" stroke-width="6" stroke-linecap="round"/>
  <line x1="386" y1="516" x2="406" y2="494" stroke="${EGG_SHADOW}" stroke-width="6" stroke-linecap="round"/>
  <line x1="624" y1="545" x2="640" y2="514" stroke="${EGG_SHADOW}" stroke-width="6" stroke-linecap="round"/>
  <line x1="640" y1="514" x2="622" y2="490" stroke="${EGG_SHADOW}" stroke-width="6" stroke-linecap="round"/>
  <line x1="490" y1="562" x2="478" y2="538" stroke="${EGG_SHADOW}" stroke-width="5" stroke-linecap="round"/>

  <!-- ── Sparkle stars (top-left, top-right) ── -->
  <!-- Star top-left -->
  <g transform="translate(248, 300) rotate(15)">
    <polygon points="0,-26 6,-8 24,-8 10,4 15,22 0,12 -15,22 -10,4 -24,-8 -6,-8"
      fill="${ACCENT}" opacity="0.85"/>
  </g>
  <!-- Star top-right -->
  <g transform="translate(776, 268) rotate(-10)">
    <polygon points="0,-20 5,-6 18,-6 8,3 12,17 0,9 -12,17 -8,3 -18,-6 -5,-6"
      fill="${CHICK_LIGHT}" opacity="0.80"/>
  </g>
  <!-- Small dots -->
  <circle cx="200" cy="420" r="8" fill="${CHICK_LIGHT}" opacity="0.6"/>
  <circle cx="820" cy="390" r="6" fill="${ACCENT}" opacity="0.55"/>
  <circle cx="180" cy="620" r="5" fill="${CHICK_LIGHT}" opacity="0.5"/>
  <circle cx="840" cy="580" r="7" fill="${CHICK_LIGHT}" opacity="0.5"/>
</svg>`;
}

async function generateIcon(svgString, outputPath, size) {
  const buffer = Buffer.from(svgString);
  await sharp(buffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`✓ Generated ${path.basename(outputPath)} (${size}x${size})`);
}

async function main() {
  const iconSvg       = buildIconSvg(1024);
  const faviconSvg    = buildIconSvg(48);

  await generateIcon(iconSvg, path.join(assetsDir, 'icon.png'), 1024);
  await generateIcon(iconSvg, path.join(assetsDir, 'adaptive-icon.png'), 1024);
  await generateIcon(iconSvg, path.join(assetsDir, 'splash-icon.png'), 1024);
  await generateIcon(faviconSvg, path.join(assetsDir, 'favicon.png'), 48);

  console.log('\nAll icons generated successfully!');
}

main().catch(err => { console.error(err); process.exit(1); });
