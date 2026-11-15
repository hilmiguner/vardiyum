import { useTranslation } from 'react-i18next';

import { Heading, Muted, Page, Panel } from '../../components/ui';

export default function EarningsScreen() {
  const { t } = useTranslation();
  return (
    <Page title={t('earnings')}>
      <Panel>
        <Heading>{t('earnings')}</Heading>
        <Muted>{t('noEarnings')}</Muted>
      </Panel>
    </Page>
  );
}
