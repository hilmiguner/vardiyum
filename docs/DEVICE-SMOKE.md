# Vardiyum — Faz 1 Gerçek Cihaz Kontrol Listesi

**Durum:** 2026-11-15 itibarıyla henüz uygulanmadı. GitHub Actions #43697865419 Android/iOS **JavaScript** export doğrulaması yapmıştır; gerçek cihazda açılış kanıtı değildir.

## Hazırlık

1. Güncel Vardiyum dalını çek, Node 22 kullan ve `npm ci` çalıştır.
2. `npx expo install --check` ve `npx expo start --clear` ile Expo Go / uyumlu development build başlat.
3. Android fiziksel cihaz veya emulator; iOS fiziksel cihaz veya macOS simulator üzerinde aşağıdaki testleri ayrı ayrı kaydet.
4. **İnternetsiz kullanım:** Expo Go geliştirme sırasında Metro'ya ihtiyaç duyabilir. Ağsız işlevleri gerçek standalone pakette ayrıca test et; Expo Go testini çevrimdışı kanıtı sayma.

## Android ve iOS test senaryoları

- [ ] Açılış: Bugün, Takvim, Rutinler, Kazanç ve Ayarlar ekranlarına sorunsuz geçiş.
- [ ] İlk kullanımda döngü olmadığı mesajı ve Ayarlar'a yönlendirme.
- [ ] Ayarlardan 8 günlük örnek döngüyü yükle, kaydet; Bugün ve 14 gün listesinde doğru göründüğünü doğrula.
- [ ] Uygulamayı tamamen kapatıp yeniden aç; SQLite kaydının korunduğunu doğrula.
- [ ] Döngü gününe dokunup vardiyayı değiştir; gün ekle / kaldır; tekrar kaydet ve yeniden aç.
- [ ] Geçersiz başlangıç tarihi (ör. `2026-02-29`) gir; hata mesajı çıkmalı, uygulama çökmemeli.
- [ ] Sistem Türkçe/İngilizce olduğunda çeviriler ve açık/koyu temalar düzgün görünüyor.
- [ ] Erişilebilirlik: büyük yazı, TalkBack/VoiceOver, düğme etiketleri.
- [ ] Standalone paket varsa interneti kes; önceden girilmiş takvim ve veritabanı çalışmaya devam ediyor.

**Kapsam dışı:** Kişiselleştirilmiş vardiya saatleri, değişiklik istisnaları, rutin/mesai/kazanç ekranlarında gerçek işlemler (henüz geliştirilmedi).

## Test kanıtı

| Alan | Bilgi |
|---|---|
| Platform, OS ve cihaz | Android/iOS, model |
| Test commit SHA | SHA |
| Derleme türü | Expo Go / dev build / standalone |
| Tarih ve testi yapan | YYYY-MM-DD |
| Her madde | PASS/FAIL, açıklama |
| Hata bağlantısı | GitHub Issue / kişisel veri içermeyen ekran görüntüsü |

**Yayın/geliştirme sınırı:** Native test kaydı olmadan 'Android/iOS cihaz testleri tamamlandı' denmez.

## Faz 2 için ek cihaz testleri — PR #5 (henüz yapılmadı)

- [ ] V1'den yükselen telefonda eski döngü ve günlük değişiklik korunur; SQLite `user_version=2`.
- [ ] Özel vardiya ekle: 19:00–07:00, mola 30 dk; kapat/aç, değerler aynı.
- [ ] Aynı saat 07:00–07:00 gir: 24 saatlik planlı vardiya olarak görünmeli.
- [ ] Aylık takvimde rastgele bir günü "izin" olarak değiştir, sonraki döngü günü bozulmamalı.
- [ ] Değişiklik geri alınınca düzenli döngü görünür; kapat/aç sonrası kalıcıdır.
- [ ] Türkçe ve İngilizce metinler; Android/iOS açık/koyu tema ve TalkBack/VoiceOver erişimi.
- [ ] Kullanıcı geçersiz saat veya mola girince uygulama çökmemeli, kayıt reddedilmeli.

## Issue #8 — Gelecekteki cihaz kontrolü (kullanıcı tercihiyle ertelendi)

- [ ] iOS ve Android'de v2->v3 SQLite migrasyonu; pattern/override/eski work_entries korunur.
- [ ] NYC 2026-11-01 01:30 fold: erken/geç seçenekleri tek gün için saklanır; uygulama kapanıp açılınca yeniden yüklenir.
- [ ] Şablon saati veya program bölgesi değişince eski DST seçimi kullanılmaz.
- [ ] Planlanan ile gerçek giriş/çıkış farklı tutulur; gerçek mola girişi ve silme sonrası kalıcılık.
- [ ] Aynı gerçek UTC aralık çakışması reddedilir, ardışık aralıklara izin verilir.
- [ ] Program IANA saat dilimi değişim önizlemesi/açık onayı, geçmiş fiilî UTC kayıtlar değişmez.
- [ ] Geliştirme vs üretim build, çevrimdışı kullanım, uygulama kapanıp açılınca kayıtlar, TalkBack/VoiceOver.
- [ ] Hermes/ICU/tzdb sürümünden kaynaklanan DST farkları kaydedilir; ücret motoruna otomatik aktarılmaz.

**Durum:** Henüz gerçek cihaz testi yapılmadı. Bunlar planlanan, tamamlanmamış maddelerdir.

## Faz 3 / Issue #10 (planlandı, henüz yapılmadı)

- [ ] Android/iOS SQLite v3→v4 migrasyonu, rutin/checkbox ve eski work/shift/override verileri korunuyor.
- [ ] Rutin oluştur, vardiya/hafta/döngü/izin filtreleri ve gece vardiyası başlangıç günü doğru.
- [ ] Günlük istisna değiştiğinde günlük checklist değişiyor.
- [ ] Tamamlandı/geri al, kapat/aç kalıcılığı; arşiv/geri alma ve geçmiş snapshot korunuyor.
- [ ] Türkçe/İngilizce, TalkBack/VoiceOver, erişilebilir checklist ve büyük yazılar.
- [ ] Bildirimler henüz uygulanmadı; bu testin kapsamı değil.

**Kullanıcı cihaz testlerini erteledi; native PASS kanıtı yok.**
