# Vardiyum — Yol Haritası

**Başlangıç referansı:** 2026-11-15. Öncelik sırası öneridir. Durum iddiaları için [STATUS.md](STATUS.md) esas alınır.

| Faz | Çıktı | Durum |
| --- | --- | --- |
| 0 | Ürün/mimari/karar/devir belgeleri | Bu başlangıç dokümantasyon değişikliğiyle hazırlanıyor |
| 1 | Çalışan Expo projesi, test ve CI altyapısı | Başlamadı |
| 2 | Vardiya döngüsü motoru ve takvim | Başlamadı |
| 3 | Rutin kuralları ve bildirimler | Başlamadı |
| 4 | Mesai ve tahmini kazanç | Başlamadı |
| 5 | Kalite, cihaz testleri ve beta | Başlamadı |
| 6 | iOS / Android mağaza yayını | Başlamadı |

## Faz 0 — Projeyi belgelerle başlat

- [x] Ürün adı çalışma adı olarak Vardiyum belirlendi.
- [x] Sektör bağımsız hedef kitle ve temel değer önerisi belirlendi.
- [x] MVP / sonraki sürüm sınırları konuşuldu.
- [x] Teknik yön ve offline-first ilkesi belirlendi.
- [ ] Belgelerin main dalına birleştirilmesi ve commit/PR doğrulaması.
- [ ] İsim / marka / domain / mağaza görünürlüğü kontrolü (yayın öncesi).

## Faz 1 — Temel uygulama

- [ ] Expo + React Native + TypeScript başlangıç dosyaları
- [ ] Expo Router, dört sekme ve ayarlar iskeleti
- [ ] SQLite veri katmanı ve migration politikası
- [ ] Çoklu dil (TR/EN), tema ve erişilebilirlik temeli
- [ ] Lint / format / typecheck / unit-test GitHub Actions CI
- [ ] Android + iOS geliştirme derlemesi; gerçek cihaz smoke test

**Çıkış ölçütü:** iki platformda açılan, çevrimdışı çalışan, CI kontrolleri yeşil uygulama iskeleti.

## Faz 2 — Vardiya motoru

- [ ] Şablonlar, pattern tanımı, başlangıç tarihi
- [ ] Saf döngü hesaplama fonksiyonu
- [ ] İstisnalar / değişiklikler / izin girişleri
- [ ] Gece geçişi, ay/yıl sınırları, uzun döngüler ve DST testleri
- [ ] Gün/hafta/ay takvim UI'si
- [ ] İlk kurulum ve örnek şablonlar

**Çıkış ölçütü:** farklı sektör örneklerini hesaplayan, geriye ve ileriye doğru doğru çalışan takvim.

## Faz 3 — Rutinler ve hatırlatmalar

- [ ] Görev oluşturma, düzenleme, silme
- [ ] Vardiya + hafta günü + döngü günü kuralları
- [ ] Günlük görev listesi ve tamamlama geçmişi
- [ ] Yerel planlı bildirimler ve yeniden planlama
- [ ] Bildirim izinleri kapalı senaryosu ve gerçek cihaz testi

**Çıkış ölçütü:** vardiyaya göre günlük yapılacaklar ve doğru görev geçmişi.

## Faz 4 — Mesai ve tahmini kazanç

- [ ] Gerçekleşen çalışma / fazla mesai kayıtları
- [ ] Aylık ve saatlik ücret profilleri
- [ ] Katsayılar, primler, kesintiler ve dönemler
- [ ] Yüksek hassasiyetli tutar hesapları ve doğrulama
- [ ] Tahmin dökümü ve kullanıcıya sınırları açıklayan UI

**Çıkış ölçütü:** birim testlerinde doğru, izah edilebilir tahmini kazanç.

## Faz 5 — Beta/kalite

- [ ] Yerel veri dışa aktarma/geri alma; bozuk yedek testleri
- [ ] Android/iOS cihaz matrisi, uygulama kapanması, güncelleme ve saat dilimi testleri
- [ ] Erişilebilirlik, performans ve hata raporları
- [ ] Çeşitli sektörlerden hedef 20 test kullanıcısı
- [ ] Kritik vardiya hesabı ve veri kaybı hataları kapatılmış
- [ ] Gizlilik metni, destek iletişim kanalı ve beta geri bildirim döngüsü

**Çıkış ölçütü:** yayın için aday üretim derlemesi ve kabul test raporu.

## Faz 6 — Mağaza yayını

- [ ] Apple Developer ve Google Play Console hazırlıkları
- [ ] App Store / Play mağaza açıklamaları, ekran görüntüleri, dil içerikleri
- [ ] O tarihte geçerli SDK/API hedefleri, izinler ve veri güvenliği beyanları
- [ ] TestFlight ve Google Play test prosedürü / uygunluk
- [ ] Sürümleme, çökme takibi, yayın sonrası destek ve güncelleme planı

**Çıkış ölçütü:** her iki mağazada yayınlanmış doğrulanmış sürüm.

## V1.1 / V2 adayları (MVP dışı)

V1.1: Widget'lar, gelişmiş istatistikler, isteğe bağlı bulut yedekleme ve çoklu cihaz senkronizasyonu, bordro karşılaştırması.  
V2: Arkadaşlarla takvim karşılaştırma, sektörel şablonlar, gelişmiş ülke/işveren ücret kuralları, birden fazla iş profili.

## Tahmin ve takip

İlk varsayımsal tahmin: tek geliştirici için **10–16 hafta etkin geliştirme**. Saat/hafta, dış bağımlılıklar, mağaza incelemesi veya kapsam artışıyla değişir. Taahhüt edilmiş teslim tarihi değildir.

Her PR'da ilgili faza referans ver; test sonuçlarını doğrula; ardından [STATUS.md](STATUS.md), [HANDOFF.md](HANDOFF.md) ve bu dosyadaki tamamlanma kutularını güncelle.
