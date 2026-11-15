import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

const resources = {
  tr: {
    translation: {
      today: 'Bugün', calendar: 'Takvim', routines: 'Rutinler', earnings: 'Kazanç',
      settings: 'Ayarlar', greeting: 'Bugünkü planın', nextShift: 'Sonraki gün',
      shiftToday: 'Bugünkü vardiya', configure: 'Vardiya düzenini oluştur',
      configureDescription: 'Kendi vardiya döngünü tanımlayarak takvimini kullanmaya başla.',
      date: 'Tarih', day: 'Gün', shift: 'Vardiya', off: 'İzin', morning: 'Sabah',
      evening: 'Akşam', night: 'Gece', noPattern: 'Henüz bir vardiya düzenin yok.',
      anchorDate: 'Döngü başlangıç tarihi (YYYY-AA-GG)',
      cycle: 'Vardiya döngüsü', addDay: 'Gün ekle', removeDay: 'Son günü sil',
      save: 'Kaydet', saved: 'Vardiya düzeni kaydedildi.',
      example: '8 günlük örnek döngüyü yükle', exampleHint: 'Örnek için başlangıç bugündür.',
      invalidDate: 'Geçerli bir tarih ve en az bir döngü günü gir.',
      loading: 'Yerel veriler yükleniyor…', databaseError: 'Yerel veriler açılamadı.',
      retry: 'Yeniden dene', upcoming: 'Önümüzdeki 14 gün',
      noRoutines: 'Rutin kuralları sonraki geliştirme aşamasında eklenecek.',
      noEarnings: 'Mesai ve kazanç hesaplama sonraki geliştirme aşamasında eklenecek.',
      offline: 'Çevrimdışı çalışır · Hesap gerekmez',
      foundation: 'Vardiyum geliştirme sürümü', opening: 'Açılış',
      setupSubtitle: 'Döngü gününe dokunarak vardiya türünü değiştir.',
    },
  },
  en: {
    translation: {
      today: 'Today', calendar: 'Calendar', routines: 'Routines', earnings: 'Earnings',
      settings: 'Settings', greeting: 'Your plan today', nextShift: 'Next day',
      shiftToday: "Today's shift", configure: 'Set up your shift schedule',
      configureDescription: 'Create your own recurring cycle to start using your calendar.',
      date: 'Date', day: 'Day', shift: 'Shift', off: 'Off', morning: 'Morning',
      evening: 'Evening', night: 'Night', noPattern: 'No shift schedule yet.',
      anchorDate: 'Cycle start date (YYYY-MM-DD)',
      cycle: 'Shift cycle', addDay: 'Add day', removeDay: 'Remove last day',
      save: 'Save', saved: 'Shift schedule saved.',
      example: 'Load sample 8-day cycle', exampleHint: 'The sample starts today.',
      invalidDate: 'Enter a valid date and at least one cycle day.',
      loading: 'Loading local data…', databaseError: 'Local data could not be loaded.',
      retry: 'Retry', upcoming: 'Next 14 days',
      noRoutines: 'Routine rules will be added in the next development phase.',
      noEarnings: 'Overtime and earnings calculations will be added in a later phase.',
      offline: 'Works offline · No account needed',
      foundation: 'Vardiyum development build', opening: 'Opening',
      setupSubtitle: 'Tap a cycle day to change its shift.',
    },
  },
};

const language = getLocales()[0]?.languageCode === 'en' ? 'en' : 'tr';

void i18n.use(initReactI18next).init({
  resources,
  lng: language,
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

export default i18n;
