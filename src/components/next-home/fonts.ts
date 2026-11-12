import { DM_Sans, Instrument_Serif, Manrope } from 'next/font/google';

// next/font downloads these at build time and serves them from this site,
// so a visitor's browser never asks Google for them. Instrument Serif is
// for display words only, at 40px or larger: its thin strokes fade on
// cheap low-resolution screens at smaller sizes. The quote is upright,
// the other serif words italic.

export const manrope = Manrope({
  subsets: ['latin'],
  variable: '--nh-display',
  display: 'swap'
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--nh-body',
  display: 'swap'
});

export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--nh-serif',
  display: 'swap'
});
