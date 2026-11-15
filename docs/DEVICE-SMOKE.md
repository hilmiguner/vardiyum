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
