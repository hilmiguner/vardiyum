# Vardiyum

**Vardiyanı bil. Gününü planla. Kazancını takip et.**

Vardiyum, tüm sektörlerdeki vardiyalı çalışanlar için tasarlanan iOS/Android kişisel vardiya asistanıdır. Hedefi kullanıcıya vardiyasını, o güne düşen rutinlerini ve dönemlik **tahmini** kazancını tek yerden göstermektir. Ürün planı için [docs/PRODUCT.md](docs/PRODUCT.md), teknik sınırlar için [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> **Durum (2026-11-15):** Vardiya, DST ve fiilî çalışma altyapıları (PR #3/#5/#7/#9) ile çevrimdışı vardiyaya bağlı **rutinler ve günlük görev geçmişi PR #11 main'de**. Merge sonrası [Actions #43706843264](https://github.com/hilmiguner/vardiyum/actions/runs/43706843264) SUCCESS: 51/51 Node testi ve Android/iOS JS export. Native cihaz testleri kullanıcı isteğiyle ertelendi. Güncel durum: [docs/STATUS.md](docs/STATUS.md).

## Geliştirme kurulumu

**Gereksinimler:** Node.js 22.13+ (önerilen 22 LTS), npm, Android Emulator veya fiziksel telefon; iOS yerel derlemesi için macOS/Xcode ya da uygun Expo EAS hesabı.

```bash
git clone https://github.com/hilmiguner/vardiyum.git
cd vardiyum
npm ci
npx expo install --check
npm start
```

Android veya iOS için Expo CLI ekranındaki yönlendirmeler kullanılabilir. Geliştirici bilgisayarında Expo Go veya development build seçimi cihaz ve SDK uyumuna göre kontrol edilmelidir. İlk kod sürümü **Expo SDK 57** (React Native 0.86 / React 19.2) ile planlandı. SDK 58'e geçiş ayrı test/PR gerektirir.

```bash
npm run lint
npm run typecheck
npm test
npm run format
```

> **Bağımlılık kilidi:** `package-lock.json` GitHub Actions kullanılarak üretildi ve geliştirme dalına eklendi. CI artık `npm ci` ile tam bu kilit dosyasını kullanır. Android ve iOS JavaScript paketleme kontrolleri [Actions #43697865419](https://github.com/hilmiguner/vardiyum/actions/runs/43697865419) ile başarılı; native cihaz doğrulaması açık.

## Şu anda uygulamada neler var?

- Expo Router: Bugün / Takvim / Rutinler / Kazanç sekmeleri ve Ayarlar
- Sistem dilinden TR/EN seçimi ve açık/koyu tema renkleri
- SQLite açılış migrasyonu ve yerel vardiya döngüsü kalıcılığı
- Ayarlardan döngü günü ekleme/çıkarma, özel vardiya türü/saat/mola tanımlama ve 8 günlük örnek düzen
- Bugünkü vardiya ve aylık takvim; bir güne özel değişiklik yapma ve normal döngüye döndürme
- IANA saat dilimine göre **planlanan saat aralığı / gerçek geçen süre** karşılaştırması; DST boşlukları ve tekrar eden saatler için açık uyarı (PR #7)
- Saf, çevrimdışı test edilebilir takvim günü hesaplama motoru

**Kısıt:** Faz 2'de özel şablon, aylık takvim ve günlük istisna kodu PR #5; saat dilimi geçişi çözümleyicisi PR #7 ile eklenmiştir. Şablon silme/gerçekleşmiş çalışma kaydı, DST'de gerçek geçen süre ve native cihaz kabulü açık. Rutin ve kazanç ekranları henüz işlevsel değildir.

## Temel prensipler

- **Offline-first:** İlk sürümde zorunlu hesap veya sunucu bulunmaz.
- **Doğru takvim:** Döngü güne bağlıdır; DST değişiminde geçen milisaniyeye bağlı olarak ilerlemez.
- **Açıklanabilir kazanç:** Gelecekteki kazanç hesapları yasal bordro yerine geçmez.
- **Proje hafızası:** Kodun durumu ve planlanan işler GitHub belgeleri/PR'larla doğrulanır; sohbet geçmişi tek kaynak değildir.

## Belge dizini

- [Ürün ve MVP](docs/PRODUCT.md)
- [Mimari ve veri modeli](docs/ARCHITECTURE.md)
- [Yol haritası](docs/ROADMAP.md)
- [Kararlar](docs/DECISIONS.md)
- [Test planı](docs/TEST-PLAN.md)
- [Durum](docs/STATUS.md)
- [Yeni sohbet devir notu](docs/HANDOFF.md)
- [Gerçek cihaz test listesi](docs/DEVICE-SMOKE.md)

## Lisans ve marka

Lisans henüz seçilmedi. **Vardiyum** çalışma adıdır; marka, alan adı ve mağaza adı uygunluğu teyit edilmemiştir.

## Gerçek çalışma ve saat dilimi — Faz 2 / PR #9

- Aylık takvimde belirsiz saatler için **o tarihe özgü** `earlier/later` seçimleri saklanabilir. Vardiya saatleri veya program saat dilimi değişince eski seçim otomatik uygulanmaz.
- Takvimden **kendi giriş/çıkış saatlerin ve fiilî mola süren** girilebilir. Kaydedilen iki UTC anı, girişteki saat dilimi ve yerel saatler birlikte saklanır. Çakışan çalışma aralıkları reddedilir; kayıtlar silinebilir.
- Ayarlardan kayıtlı IANA saat dilimi, eski ve yeni UTC başlangıç örneği karşılaştırılarak **açık onayla** değiştirilebilir. Takvim döngüsünün yerel tarih/saatleri değişmez; geçmiş gerçek kayıtlar korunur.
- Tüm gerçek çalışmalar **kullanıcı beyanıdır**: işveren doğrulaması, otomatik maaş hesaplaması veya resmi bordro yerine geçmez.
- Yerel SQLite v3 migrasyonu v1/v2 vardiya ve eski `work_entries` satırlarını silmez; yeni kayıtlar ayrı `actual_work_sessions` tablosundadır.
- **Cihaz testleri:** yalnızca CI ve JS paketleme kanıtlandı; [docs/DEVICE-SMOKE.md](docs/DEVICE-SMOKE.md) gerçek cihaz testi ileride yapılacak.

## Faz 3 — Offline rutinler (PR #11)

- Rutinler ekranında rutin oluşturma, düzenleme, devre dışı bırakma, arşivleme ve arşivden geri alma.
- Vardiya türü, ISO haftanın günü, herhangi uzunlukta döngü günü ve izin günü filtreleri; aynı filtre grubunda **VEYA**, gruplar arasında **VE**. Boş filtre = tüm günler.
- Bugün ve Rutinler ekranlarında seçili günün görevleri, tamamlandı/geri al işaretleri ve geçmiş hareketler.
- Günlük vardiya istisnaları dikkate alınır; gece vardiyası görevi, vardiyanın **başladığı** takvim gününe bağlanır.
- SQLite v4 eski `routine_rules` ve `task_completions` verilerini korur, eski tamamlanmaları `routine_completion_events` geçmişine taşır. Bir rutini arşivlemek geçmişini **silmez**.
- Yerel bildirimler ve native cihaz testleri **henüz yapılmadı**; Faz 3'ün ayrı işleri.
