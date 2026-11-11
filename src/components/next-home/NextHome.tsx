import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { dmSans, instrumentSerif, manrope } from './fonts';
import styles from './NextHome.module.css';

// The langquest.org home page for LangQuest Next (LAN-153, LAN-219).
// The old home page stays at legacy.langquest.org (src/middleware.ts).

const APP = 'https://app.langquest.org';
const SIGN_IN = 'https://app.langquest.org/signin';
const LEGACY = 'https://legacy.langquest.org';
const GOOGLE_PLAY =
  'https://play.google.com/store/apps/details?id=com.frontierrnd.langquestnext';
const APP_STORE = 'https://apps.apple.com/app/id6812492008';

// One file to replace when a sharper photo comes. Its crops are in
// NextHome.module.css (.shotImage and .end).
const FIELD_PHOTO = '/next-home/field.jpeg';

// Real app screens, 720 x 1565.
const SCREEN = { width: 720, height: 1565 };

function screen(name: string) {
  return `/next-home/${name}.webp`;
}

function Phone({
  src,
  alt,
  sizes
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  return (
    <div className={styles.phone}>
      <Image src={src} alt={alt} sizes={sizes} {...SCREEN} />
    </div>
  );
}

// The bars of a waveform, the same each time: a seeded random walk with a
// short pause every 13 bars. Drawn on the server, so no script runs for it.
function waveHeights(count: number, seed: number) {
  let s = seed;
  const random = () => {
    s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) | 0;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
  const heights: number[] = [];
  let v = 0.5;
  for (let i = 0; i < count; i++) {
    v = Math.max(0.12, Math.min(1, v + (random() - 0.5) * 0.75));
    const pause = i % 13 > 10 ? 0.18 : 1;
    heights.push(Math.round(v * pause * 100));
  }
  return heights;
}

function Wave({ seed, height }: { seed: number; height: number }) {
  return (
    <div
      className={styles.wave}
      style={{ '--h': `${height}px` } as CSSProperties}
    >
      {waveHeights(30, seed).map((h, i) => (
        <i key={i} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#00D7FE"
        d="M3.6 1.8c-.3.3-.5.8-.5 1.4v17.6c0 .6.2 1.1.5 1.4L13.5 12z"
      />
      <path
        fill="#FFCE00"
        d="M17 15.5 13.5 12 17 8.5l4 2.3c1.1.7 1.1 1.8 0 2.4z"
      />
      <path fill="#FF3A44" d="M17 15.5 13.5 12 3.6 22.2c.4.4 1 .4 1.7 0z" />
      <path fill="#00F076" d="M17 8.5 5.3 1.8c-.7-.4-1.3-.4-1.7 0L13.5 12z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.8 1.3 10.35.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.14-2.53.99-1.45 1.4-2.85 1.42-2.93-.03-.01-2.72-1.04-2.74-4.13zM14.47 4.39c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.29.69-3.03 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.33-.58 3.05-1.45z"
      />
    </svg>
  );
}

function Logo({ label }: { label: string }) {
  return (
    <Link className={styles.logo} href="/" aria-label={label}>
      <i aria-hidden="true" />
      LangQuest
    </Link>
  );
}

export default async function NextHome() {
  const t = await getTranslations('nextHome');
  const serif = (chunks: ReactNode) => (
    <span className={styles.serif}>{chunks}</span>
  );

  return (
    <div
      className={`${styles.page} ${manrope.variable} ${dmSans.variable} ${instrumentSerif.variable}`}
    >
      <div className={styles.strip}>
        <span className={styles.long}>{t('strip.long')} </span>
        <span className={styles.short}>{t('strip.short')} </span>
        <a href={LEGACY}>
          <b>legacy.langquest.org</b>
        </a>
      </div>

      <header className={styles.hero}>
        <nav className={`${styles.wrap} ${styles.nav}`}>
          <Logo label={t('nav.home')} />
          <div className={styles.links}>
            <a className={styles.textLink} href="#how">
              {t('nav.how')}
            </a>
            <a className={styles.textLink} href="#team">
              {t('nav.teams')}
            </a>
            <a className={`${styles.pill} ${styles.ghost}`} href={SIGN_IN}>
              {t('nav.login')}
            </a>
            <a
              className={`${styles.pill} ${styles.white} ${styles.navGet}`}
              href="#get"
            >
              {t('nav.getApp')}
            </a>
          </div>
        </nav>
        <div className={styles.wrap}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{t('hero.eyebrow')}</p>
            <h1>{t.rich('hero.title', { serif })}</h1>
            <p className={styles.lede}>{t('hero.lede')}</p>
            <div className={styles.cta}>
              <a className={`${styles.pill} ${styles.white}`} href="#get">
                {t('nav.getApp')}
              </a>
              <a className={`${styles.pill} ${styles.ghost}`} href={APP}>
                {t('hero.openBrowser')}
              </a>
            </div>
            <p className={styles.avail}>{t('hero.available')}</p>
          </div>
        </div>
        <div className={styles.shot}>
          <div className={styles.shotImage}>
            <Image
              src={FIELD_PHOTO}
              alt={t('hero.photoAlt')}
              fill
              priority
              sizes="(max-width: 720px) 164vw, 960px"
            />
          </div>
        </div>
        <div className={styles.rec} aria-hidden="true">
          <div className={styles.ref}>
            {t('hero.recording.reference')}{' '}
            <span>{t('hero.recording.version')}</span>
          </div>
          <div className={`${styles.part} ${styles.done}`}>
            <b>{t('hero.recording.part', { n: 1 })}</b>
            <Wave seed={11} height={20} />
            <span className={styles.time}>0:12</span>
          </div>
          <div className={`${styles.part} ${styles.done}`}>
            <b>{t('hero.recording.part', { n: 2 })}</b>
            <Wave seed={23} height={20} />
            <span className={styles.time}>0:09</span>
          </div>
          <div className={`${styles.part} ${styles.on}`}>
            <b>{t('hero.recording.part', { n: 3 })}</b>
            <Wave seed={5} height={34} />
            <span className={styles.time}>0:27</span>
          </div>
        </div>
      </header>

      <main>
        <section id="how" className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.kick}>{t('how.kicker')}</p>
            <h2>{t('how.title')}</h2>
            <div className={styles.steps}>
              {(
                [
                  ['listen', styles.s1, '61-translator-my-work'],
                  ['speak', styles.s2, '68-recording'],
                  ['heard', styles.s3, '66-passage']
                ] as const
              ).map(([key, tint, shot], i) => (
                <div key={key} className={`${styles.step} ${tint}`}>
                  <div className={styles.n} aria-hidden="true">
                    {i + 1}
                  </div>
                  <h3>{t(`how.${key}.title`)}</h3>
                  <p>{t(`how.${key}.text`)}</p>
                  <Phone
                    src={screen(shot)}
                    alt={t(`how.${key}.alt`)}
                    sizes="292px"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.off}`}>
          <div className={`${styles.wrap} ${styles.offIn}`}>
            <div>
              <p className={styles.kick}>{t('offline.kicker')}</p>
              <h2>{t('offline.title')}</h2>
              <p className={styles.offText}>{t('offline.text')}</p>
              <div className={styles.facts}>
                <div>
                  <b>{t('offline.savedTitle')}</b>
                  {t('offline.savedText')}
                </div>
                <div>
                  <b>{t('offline.syncTitle')}</b>
                  {t('offline.syncText')}
                </div>
                <div>
                  <b>{t('offline.joinTitle')}</b>
                  {t('offline.joinText')}
                </div>
              </div>
            </div>
            <div className={styles.ph}>
              <div className={styles.sync}>
                <i aria-hidden="true" />
                {t('offline.badge')}
              </div>
              <Phone
                src={screen('63-translator-map')}
                alt={t('offline.alt')}
                sizes="(max-width: 720px) 290px, 360px"
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.wrap} ${styles.proc}`}>
            <div>
              <p className={styles.kick}>{t('process.kicker')}</p>
              <h2>{t('process.title')}</h2>
              <p className={styles.procText}>{t('process.text')}</p>
              <ol className={styles.flow}>
                {(['peer', 'community', 'back', 'consultant'] as const).map(
                  (key, i) => (
                    <li key={key}>
                      <i aria-hidden="true" />
                      {t(`process.${key}`)}
                      <em>{t('process.step', { n: i + 1 })}</em>
                    </li>
                  )
                )}
              </ol>
            </div>
            <div className={styles.photoCard}>
              <Phone
                src={screen('32-flow-applied')}
                alt={t('process.alt')}
                sizes="(max-width: 720px) 270px, 330px"
              />
            </div>
          </div>
        </section>

        <section id="team" className={`${styles.section} ${styles.team}`}>
          <div className={styles.wrap}>
            <p className={styles.kick}>{t('teams.kicker')}</p>
            <h2>{t('teams.title')}</h2>
            <div className={styles.tgrid}>
              {(
                [
                  ['translators', '79-translator-asked'],
                  ['reviewers', '66-passage'],
                  ['coordinators', '71-org-home']
                ] as const
              ).map(([key, shot]) => (
                <div key={key}>
                  <div className={styles.tview}>
                    <Phone
                      src={screen(shot)}
                      alt={t(`teams.${key}.alt`)}
                      sizes="(max-width: 720px) 78vw, 380px"
                    />
                  </div>
                  <h3>{t(`teams.${key}.title`)}</h3>
                  <p>{t(`teams.${key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.wrap}>
            <div className={styles.proof}>
              <div>
                <div className={styles.num}>{t('proof.clips')}</div>
                <p className={styles.numc}>{t('proof.clipsText')}</p>
              </div>
              <blockquote>
                {t('proof.quote')}
                <small>{t('proof.quoteText')}</small>
              </blockquote>
            </div>
            <p className={styles.note}>
              <b>{t('proof.noteTitle')}</b> {t('proof.note')}
            </p>
          </div>
        </section>

        <section id="get" className={styles.end}>
          <Image src={FIELD_PHOTO} alt="" fill sizes="100vw" />
          <div className={`${styles.wrap} ${styles.endIn}`}>
            <h2>{t.rich('end.title', { serif })}</h2>
            <p>{t('end.text')}</p>
            <div className={styles.row}>
              <a className={styles.store} href={GOOGLE_PLAY}>
                <GooglePlayIcon />
                <span>
                  <small>{t('end.googlePlayTop')}</small>
                  {t('end.googlePlay')}
                </span>
              </a>
              <a className={styles.store} href={APP_STORE}>
                <AppleIcon />
                <span>
                  <small>{t('end.appStoreTop')}</small>
                  {t('end.appStore')}
                </span>
              </a>
              <a className={`${styles.pill} ${styles.ghost}`} href={SIGN_IN}>
                {t('nav.login')}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footIn}`}>
          <Logo label={t('nav.home')} />
          <nav>
            <Link href="/next/privacy">{t('footer.privacy')}</Link>
            <Link href="/next/delete-account">{t('footer.deleteAccount')}</Link>
            <Link href="/next/support">{t('footer.support')}</Link>
            <a href={LEGACY}>{t('footer.previous')}</a>
          </nav>
          <span>{t('footer.credit')}</span>
        </div>
      </footer>
    </div>
  );
}
