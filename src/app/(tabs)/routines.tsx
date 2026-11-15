import { useTranslation } from 'react-i18next';

import { Heading, Muted, Page, Panel } from '../../components/ui';

export default function RoutinesScreen() {
  const { t } = useTranslation();
  return (
    <Page title={t('routines')}>
      <Panel>
        <Heading>{t('routines')}</Heading>
        <Muted>{t('noRoutines')}</Muted>
      </Panel>
    </Page>
  );
}
