import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { clsx } from 'clsx';

const LitepaperLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation(['litepaper']);
  const router = useRouter();
  const { slug } = router.query;

  const sections = [
    { key: 'ethos', title: t('ethos.title') },
    { key: 'tokenomics', title: t('tokenomics.title') },
    { key: 'mint-fee', title: t('tokenomics.mint_fee.title'), isSub: true },
    { key: 'dynamic-term', title: t('tokenomics.dynamic_term.title'), isSub: true },
    { key: 'population-pressure', title: t('tokenomics.population_pressure.title'), isSub: true },
    { key: 'time-decay', title: t('tokenomics.time_decay.title'), isSub: true },
    { key: 'tax', title: t('tokenomics.tax.title'), isSub: true },
    { key: 'fee-distribution', title: t('tokenomics.fee_distribution.title'), isSub: true },
  ];

  return (
    <div className="flex flex-row items-start gap-8">
      {/* Table of Contents */}
      <div className="card bg-base-200 p-4 w-1/4 sticky top-24 flex-none">
        <h3 className="font-bold mb-2">{t('table_of_contents')}</h3>
        <ul className="menu menu-compact">
          {sections.map((section, index) => (
            <li key={index} className={clsx({ 'pl-4': section.isSub })}>
              <Link
                href={`/litepaper/${section.key}`}
                className={clsx('text-sm', {
                  'active': slug === section.key,
                })}
              >
                {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Content */}
      <div className="card bg-base-100 w-3/4 p-8 text-base-content">
        {children}
      </div>
    </div>
  );
};

export default LitepaperLayout;
