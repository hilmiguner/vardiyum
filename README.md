# Vardiyum

**Vardiyanı bil. Gününü planla. Kazancını takip et.**

Vardiyum, tüm sektörlerdeki vardiyalı çalışanlar için tasarlanan iOS/Android kişisel vardiya asistanıdır. Hedefi kullanıcıya vardiyasını, o güne düşen rutinlerini ve dönemlik **tahmini** kazancını tek yerden göstermektir. Ürün planı için [docs/PRODUCT.md](docs/PRODUCT.md), teknik sınırlar için [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> **Durum (2026-11-15):** Expo mobil iskeleti **PR #3**, özel vardiya türleri/aylık takvim/tek günlük istisnalar **PR #5** ile main'e eklendi. Kod testleri ve Android/iOS JavaScript paketleme başarılı; **native cihaz testleri henüz yapılmadı**. [docs/STATUS.md](docs/STATUS.md).

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
