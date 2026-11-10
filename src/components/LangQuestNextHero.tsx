'use client';

import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import styles from './LangQuestNextHero.module.css';

export default function LangQuestNextHero() {
  const t = useTranslations('homepage.next');

  return (
    <section className={styles.hero} aria-labelledby="langquest-next-title">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            {t('eyebrow')}
          </p>
          <h1 id="langquest-next-title" className={styles.title}>
            LangQuest <span>Next</span>
          </h1>
          <p className={styles.headline}>{t('headline')}</p>
          <p className={styles.description}>{t('description')}</p>
          <div className={styles.actions}>
            <Button asChild size="lg" className={styles.primaryAction}>
              <a href="https://next.langquest.org">
                {t('tryNext')}
                <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
            <a className={styles.secondaryAction} href="#langquest-original">
              {t('existingApp')}
              <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <p className={styles.note}>{t('note')}</p>
        </div>
        <div className={styles.artwork} aria-hidden="true">
          <div className={styles.logoFrame}>
            <span className={styles.corner} />
            <Image
              src="/langquest-next-logo.svg"
              alt=""
              width={320}
              height={320}
              priority
              className={styles.logo}
            />
            <span className={styles.wordmark}>LANGQUEST NEXT</span>
          </div>
          <p className={styles.artworkCaption}>{t('workflow')}</p>
        </div>
      </div>
    </section>
  );
}
