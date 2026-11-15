import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Action, Heading, Muted, Page, Panel } from '../../components/ui';
import {
  loadEarningsReport,
  saveEarningsProfile,
  addEarningsAdjustment,
} from '../../data/earnings-repository';
import {
  periodBounds,
  type EarningsAdjustment,
  type EarningsModel,
  type EarningsProfile,
  type EarningsReport,
  type AdjustmentKind,
} from '../../domain/earnings-engine';
import {
  formatMoneyMinor,
  parseMoneyMinor,
  SUPPORTED_EARNINGS_CURRENCIES,
} from '../../domain/money-text';
import { calendarDateInZone } from '../../domain/shift-engine';
import { useAppState } from '../../state/app-state';
import { usePalette } from '../../theme/colors';

function entryId(prefix: string): string {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 80,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const c = usePalette();
  return (
    <View style={{ gap: 5 }}>
      <Muted>{label}</Muted>
      <TextInput
        accessibilityLabel={label}
        value={value}
        placeholder={placeholder}
        onChangeText={onChange}
        maxLength={maxLength}
        autoCorrect={false}
        autoCapitalize="none"
        placeholderTextColor={c.muted}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 11,
          padding: 12,
          fontSize: 16,
          color: c.text,
        }}
      />
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        borderWidth: 2,
        borderColor: selected ? c.accent : c.border,
        borderRadius: 10,
        padding: 10,
      }}
    >
      <Text style={{ color: c.text }}>{label}</Text>
    </Pressable>
  );
}

function ProfileEditor({
  selectedMonth,
  onSaved,
}: {
  selectedMonth: string;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [effectiveFrom, setEffectiveFrom] = useState(selectedMonth + '-01');
  const [model, setModel] = useState<EarningsModel>('hourly');
  const [currency, setCurrency] = useState('TRY');
  const [baseAmount, setBaseAmount] = useState('');
  const [threshold, setThreshold] = useState('');
  const [overtimeHourly, setOvertimeHourly] = useState('');
  const [numerator, setNumerator] = useState('1');
  const [denominator, setDenominator] = useState('1');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    try {
      const baseMinorUnits = parseMoneyMinor(baseAmount);
      const overtimeAfterMinutes = threshold.trim() ? Number(threshold) : null;
      const overtimeHourlyMinorUnits =
        model === 'monthly_fixed' && threshold.trim() ? parseMoneyMinor(overtimeHourly) : 0;
      const profile: EarningsProfile = {
        id: entryId('pay'),
        effectiveFrom: effectiveFrom.trim(),
        model,
        currency,
        baseMinorUnits,
        overtimeHourlyMinorUnits,
        overtimeAfterMinutes,
        overtimeMultiplierNumerator: Number(numerator),
        overtimeMultiplierDenominator: Number(denominator),
        revision: 1,
      };
      setBusy(true);
      await saveEarningsProfile(profile);
      await onSaved();
      Alert.alert(t('earnProfileSaved'));
    } catch (error) {
      Alert.alert(t('earnProfileError'), error instanceof Error ? error.message : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <Heading>{t('earnNewProfile')}</Heading>
      <Muted>{t('earnImmutableProfileHint')}</Muted>
      <InputField
        label={t('earnEffectiveFrom')}
        value={effectiveFrom}
        onChange={setEffectiveFrom}
        placeholder="2026-11-01"
        maxLength={10}
      />
      <Heading>{t('earnModel')}</Heading>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Choice
          label={t('earnModelHourly')}
          selected={model === 'hourly'}
          onPress={() => setModel('hourly')}
        />
        <Choice
          label={t('earnModelMonthly')}
          selected={model === 'monthly_fixed'}
          onPress={() => setModel('monthly_fixed')}
        />
      </View>
      <Heading>{t('earnCurrency')}</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SUPPORTED_EARNINGS_CURRENCIES.map((value) => (
          <Choice
            key={value}
            label={value}
            selected={currency === value}
            onPress={() => setCurrency(value)}
          />
        ))}
      </View>
      <InputField
        label={t(model === 'hourly' ? 'earnHourlyRate' : 'earnMonthlyBase')}
        value={baseAmount}
        onChange={setBaseAmount}
        placeholder="250,00"
      />
      <InputField
        label={t('earnThresholdMinutes')}
        value={threshold}
        onChange={setThreshold}
        placeholder={t('earnThresholdPlaceholder')}
      />
      <Muted>{t('earnThresholdWarning')}</Muted>
      {model === 'monthly_fixed' && threshold.trim() ? (
        <InputField
          label={t('earnOvertimeHourlyRate')}
          value={overtimeHourly}
          onChange={setOvertimeHourly}
          placeholder="250,00"
        />
      ) : null}
      {threshold.trim() ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <InputField
              label={t('earnMultiplierNumerator')}
              value={numerator}
              onChange={setNumerator}
              placeholder="1"
              maxLength={4}
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label={t('earnMultiplierDenominator')}
              value={denominator}
              onChange={setDenominator}
              placeholder="1"
              maxLength={4}
            />
          </View>
        </View>
      ) : null}
      <Action label={t('earnSaveProfile')} disabled={busy} onPress={() => void save()} />
    </Panel>
  );
}

function AdjustmentEditor({
  month,
  currency,
  onSaved,
}: {
  month: string;
  currency: string;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<AdjustmentKind>('bonus');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      const parsed = parseMoneyMinor(amount);
      const value =
        kind === 'deduction' ? -Math.abs(parsed) : kind === 'bonus' ? Math.abs(parsed) : parsed;
      const adjustment: EarningsAdjustment = {
        id: entryId('adj'),
        periodKey: month,
        currency,
        kind,
        amountMinorUnits: value,
        note,
        source: 'user_entered',
        createdAt: new Date().toISOString(),
      };
      setSaving(true);
      await addEarningsAdjustment(adjustment);
      await onSaved();
      setAmount('');
      setNote('');
      Alert.alert(t('earnAdjustmentSaved'));
    } catch (error) {
      Alert.alert(t('earnAdjustmentError'), error instanceof Error ? error.message : '');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Panel>
      <Heading>{t('earnAddAdjustment')}</Heading>
      <Muted>{t('earnAdjustmentImmutable')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['bonus', 'deduction', 'correction'] as const).map((item) => (
          <Choice
            key={item}
            label={t('earnKind_' + item)}
            selected={kind === item}
            onPress={() => setKind(item)}
          />
        ))}
      </View>
      <InputField
        label={t('earnAmount', { currency })}
        value={amount}
        onChange={setAmount}
        placeholder={kind === 'correction' ? '-125,00' : '125,00'}
      />
      <InputField
        label={t('earnAdjustmentNote')}
        value={note}
        onChange={setNote}
        maxLength={160}
      />
      <Action label={t('earnSaveAdjustment')} disabled={saving} onPress={() => void save()} />
    </Panel>
  );
}

export default function EarningsScreen() {
  const { t, i18n } = useTranslation();
  const c = usePalette();
  const { schedule } = useAppState();
  const [monthInput, setMonthInput] = useState(() =>
    calendarDateInZone(schedule.timeZone).slice(0, 7),
  );
  const [month, setMonth] = useState(monthInput);
  const [report, setReport] = useState<EarningsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [revision, setRevision] = useState(0);
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';

  const refresh = useCallback(async () => {
    try {
      const next = await loadEarningsReport(month);
      setReport(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'EARNINGS_REPORT_ERROR');
      setReport(null);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadEarningsReport(month)
        .then((next) => {
          if (active) {
            setReport(next);
            setError(null);
          }
        })
        .catch((reason: unknown) => {
          if (active)
            setError(reason instanceof Error ? reason.message : 'EARNINGS_REPORT_ERROR');
        });
      return () => {
        active = false;
      };
    }, [month, revision]),
  );

  const chooseMonth = () => {
    try {
      periodBounds(monthInput.trim());
      setMonth(monthInput.trim());
      setShowEditor(false);
    } catch {
      Alert.alert(t('earnInvalidMonth'));
    }
  };
  const onSaved = async () => {
    await refresh();
    setRevision((before) => before + 1);
  };
  const format = (amount: number, currency: string) =>
    formatMoneyMinor(amount, currency, locale);
  return (
    <Page title={t('earnings')} subtitle={t('earnSubtitle')}>
      <Panel>
        <Heading>{t('earnChooseMonth')}</Heading>
        <InputField
          label={t('earnMonth')}
          value={monthInput}
          onChange={setMonthInput}
          maxLength={7}
          placeholder="2026-11"
        />
        <Action label={t('earnViewMonth')} onPress={chooseMonth} />
        <Muted>{t('earnSafetyWarning')}</Muted>
      </Panel>
      {error ? (
        <Panel>
          <Text style={{ color: c.danger }}>{error}</Text>
        </Panel>
      ) : null}
      {!report && !error ? (
        <Panel>
          <Muted>{t('loading')}</Muted>
        </Panel>
      ) : null}
      {report?.status === 'needs_profile' ? (
        <Panel>
          <Heading>{t('earnNoProfile')}</Heading>
          <Muted>{t('earnNoProfileHint')}</Muted>
        </Panel>
      ) : null}
      {report?.status === 'blocked' ? (
        <Panel>
          <Heading>{t('earnBlocked')}</Heading>
          <Muted>{t('earnBlockedExplanation')}</Muted>
          {report.reasons.map((reason, idx) => (
            <Text key={idx} style={{ color: c.danger }}>
              {reason}
            </Text>
          ))}
        </Panel>
      ) : null}
      {report?.status === 'estimated' ? (
        <>
          <Panel>
            <Heading>{t('earnEstimatedTotal')}</Heading>
            <Text
              accessibilityRole="text"
              style={{
                color: c.text,
                fontSize: 28,
                fontWeight: '800',
              }}
            >
              {format(report.totalMinorUnits, report.profile.currency)}
            </Text>
            <Muted>
              {t('earnProfileDescription', {
                id: report.profile.id,
                revision: report.profile.revision,
                effectiveFrom: report.profile.effectiveFrom,
                model: t(
                  report.profile.model === 'hourly' ? 'earnModelHourly' : 'earnModelMonthly',
                ),
              })}
            </Muted>
            <Muted>
              {t('earnLoggedHours', {
                minutes: Math.floor(report.loggedSeconds / 60),
                overtime: Math.floor(report.overtimeSeconds / 60),
              })}
            </Muted>
            {report.profile.model === 'monthly_fixed' ? (
              <Muted>{t('earnFullMonthAssumption')}</Muted>
            ) : null}
            <Muted>{t('earnNotPayslip')}</Muted>
          </Panel>
          <Panel>
            <Heading>{t('earnLineItems')}</Heading>
            {report.lines.length ? (
              report.lines.map((line, index) => (
                <View
                  key={line.sourceId + ':' + line.kind + ':' + index}
                  style={{
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    paddingBottom: 10,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: c.text, fontWeight: '700' }}>
                    {t('earnLine_' + line.kind)} ·{' '}
                    {format(line.amountMinorUnits, report.profile.currency)}
                  </Text>
                  <Muted>
                    {t('earnLineSource', {
                      source: line.sourceId,
                      profile: line.profileId,
                      revision: line.profileRevision,
                      seconds: line.seconds,
                    })}
                  </Muted>
                  <Muted>{line.description}</Muted>
                </View>
              ))
            ) : (
              <Muted>{t('earnNoWork')}</Muted>
            )}
          </Panel>
          <AdjustmentEditor
            month={month}
            currency={report.profile.currency}
            onSaved={onSaved}
          />
        </>
      ) : null}
      <Panel>
        <Action
          label={t(showEditor ? 'earnHideProfileEditor' : 'earnNewProfile')}
          onPress={() => setShowEditor(!showEditor)}
        />
        <Muted>{t('earnProfileVersionWarning')}</Muted>
      </Panel>
      {showEditor || report?.status === 'needs_profile' ? (
        <ProfileEditor
          key={month}
          selectedMonth={month}
          onSaved={async () => {
            await onSaved();
            setShowEditor(false);
          }}
        />
      ) : null}
    </Page>
  );
}
