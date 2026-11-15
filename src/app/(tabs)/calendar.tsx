import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Action, Heading, Muted, Page, Panel } from '../../components/ui';
import { ScheduledDuration } from '../../components/scheduled-duration';
import { BoundaryChoiceEditor } from '../../components/boundary-choice-editor';
import { ActualWorkEditor } from '../../components/actual-work-editor';
import {
  addCalendarDays,
  calendarDateInZone,
  calendarOrdinal,
  moveMonth,
  resolveShift,
  type ShiftTemplate,
} from '../../domain/shift-engine';
import { useAppState } from '../../state/app-state';
import { usePalette } from '../../theme/colors';

function timeLabel(template: ShiftTemplate): string {
  if (template.isRestDay) return '—';
  return `${template.startsAt} – ${template.endsAt}${template.endDayOffset === 1 ? ' (+1)' : ''}`;
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { schedule, loading, error, changeDay } = useAppState();
  const c = usePalette();
  const today = calendarDateInZone(schedule.timeZone);
  const [visibleMonth, setVisibleMonth] = useState(today.slice(0, 7) + '-01');
  const [selectedDate, setSelectedDate] = useState(today);
  const [noteDraft, setNoteDraft] = useState<{ date: string; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const ordinal = calendarOrdinal(visibleMonth);
  const firstWeekday = (new Date(ordinal * 86_400_000).getUTCDay() + 6) % 7;
  const numberOfDays = calendarOrdinal(moveMonth(visibleMonth, 1)) - ordinal;
  const cells = Array.from({ length: firstWeekday + numberOfDays }, (_, index) =>
    index < firstWeekday ? null : addCalendarDays(visibleMonth, index - firstWeekday),
  );
  const chosen = resolveShift(selectedDate, schedule);
  const note =
    noteDraft?.date === selectedDate
      ? noteDraft.value
      : (schedule.overrides[selectedDate]?.note ?? '');

  const goMonth = (amount: number) => {
    const next = moveMonth(visibleMonth, amount);
    setVisibleMonth(next);
    setSelectedDate(next);
    setNoteDraft(null);
  };
  const setOverride = async (id: string | null) => {
    setSaving(true);
    try {
      await changeDay(selectedDate, id, id === null ? '' : note);
      setNoteDraft(null);
    } catch (reason) {
      Alert.alert(t('databaseError'), reason instanceof Error ? reason.message : '');
    } finally {
      setSaving(false);
    }
  };

  const weekdays = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];
  return (
    <Page title={t('calendar')} subtitle={t('monthView')}>
      {loading ? (
        <Muted>{t('loading')}</Muted>
      ) : error ? (
        <Panel>
          <Muted>
            {t('databaseError')} ({error})
          </Muted>
        </Panel>
      ) : !schedule.pattern ? (
        <Panel>
          <Muted>{t('noPattern')}</Muted>
        </Panel>
      ) : (
        <>
          <Panel>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('previousMonth')}
                onPress={() => goMonth(-1)}
                style={{ padding: 10 }}
              >
                <Text style={{ color: c.text, fontSize: 22 }}>‹</Text>
              </Pressable>
              <Heading>{visibleMonth.slice(0, 7)}</Heading>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('nextMonth')}
                onPress={() => goMonth(1)}
                style={{ padding: 10 }}
              >
                <Text style={{ color: c.text, fontSize: 22 }}>›</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {weekdays.map((day, index) => (
                <View
                  key={index}
                  style={{ width: '14.2857%', alignItems: 'center', paddingVertical: 6 }}
                >
                  <Text style={{ color: c.muted, fontSize: 11 }}>{day}</Text>
                </View>
              ))}
              {cells.map((date, index) => {
                const shift = date ? resolveShift(date, schedule) : null;
                const active = date === selectedDate;
                return (
                  <View
                    key={date ?? `empty-${index}`}
                    style={{ width: '14.2857%', padding: 2 }}
                  >
                    {date ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${date} ${shift?.template.name ?? ''}`}
                        onPress={() => {
                          setSelectedDate(date);
                          setNoteDraft(null);
                        }}
                        style={{
                          minHeight: 57,
                          padding: 5,
                          borderRadius: 10,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? c.accent : c.border,
                          backgroundColor: active ? c.cardAlt : c.card,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 3,
                        }}
                      >
                        <Text style={{ color: c.text, fontWeight: active ? '800' : '500' }}>
                          {Number(date.slice(8))}
                        </Text>
                        <View
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: shift?.template.color ?? c.muted,
                          }}
                        />
                        {shift?.source === 'override' ? (
                          <Text style={{ fontSize: 9, color: c.accent }}>*</Text>
                        ) : null}
                      </Pressable>
                    ) : (
                      <View style={{ minHeight: 57 }} />
                    )}
                  </View>
                );
              })}
            </View>
          </Panel>
          <Panel>
            <Heading>{selectedDate}</Heading>
            {chosen && (
              <>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>
                  {chosen.template.name}
                </Text>
                <Muted>{timeLabel(chosen.template)}</Muted>
                <ScheduledDuration
                  date={selectedDate}
                  template={chosen.template}
                  timeZone={schedule.timeZone}
                />
                {chosen.source === 'override' ? <Muted>{t('editedDay')}</Muted> : null}
              </>
            )}
            <Heading>{t('changeDay')}</Heading>
            <Muted>{t('overrideHint')}</Muted>
            <TextInput
              value={note}
              onChangeText={(value) =>
                setNoteDraft({
                  date: selectedDate,
                  value,
                })
              }
              accessibilityLabel={t('dayNote')}
              maxLength={120}
              placeholder={t('dayNote')}
              placeholderTextColor={c.muted}
              style={{
                color: c.text,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {schedule.templates.map((template) => (
                <Pressable
                  key={template.id}
                  accessibilityRole="button"
                  disabled={saving}
                  accessibilityLabel={`${selectedDate} ${template.name}`}
                  onPress={() => void setOverride(template.id)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: c.cardAlt,
                    borderBottomWidth: 3,
                    borderBottomColor: template.color,
                  }}
                >
                  <Text style={{ color: c.text, fontWeight: '700' }}>{template.name}</Text>
                </Pressable>
              ))}
            </View>
            {chosen?.source === 'override' ? (
              <Action
                label={t('restoreCycle')}
                onPress={() => void setOverride(null)}
                disabled={saving}
              />
            ) : null}
          </Panel>
          {chosen && (
            <>
              <BoundaryChoiceEditor
                key={selectedDate + ':' + chosen.template.id}
                date={selectedDate}
                template={chosen.template}
                timeZone={schedule.timeZone}
              />
              <ActualWorkEditor
                key={selectedDate}
                date={selectedDate}
                template={chosen.template}
                timeZone={schedule.timeZone}
              />
            </>
          )}
        </>
      )}
    </Page>
  );
}
