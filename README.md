# Vardiyum

**Vardiyanı bil. Gününü planla. Kazancını takip et.**

Vardiyum, **tüm sektörlerdeki vardiyalı çalışanlar** için tasarlanan, iOS ve Android üzerinde çalışacak **çevrimdışı öncelikli (offline-first)** kişisel vardiya asistanıdır.

> **Proje durumu (2026-11-15):** Ürün vizyonu, MVP kapsamı ve başlangıç teknik mimarisi planlandı. Henüz mobil uygulama kodu, test veya mağaza yayını oluşturulmadı. Repo başlangıç dokümantasyonu hazırlanıyor. Güncel ve doğrulanabilir durum için [docs/STATUS.md](docs/STATUS.md) dosyasını okuyun.

## Neyi çözüyoruz?

1. **Ne zaman çalışıyorum?** Esnek vardiya türleri, tekrar eden döngüler, vardiya değişiklikleri ve takvim.
2. **Bugün ne yapmam gerekiyor?** Vardiyaya, haftanın gününe ve döngü gününe bağlanabilen kişisel/iş rutinleri ve hatırlatmalar.
3. **Bu ay yaklaşık ne kadar kazanacağım?** Çalışma, mesai, prim ve kesintilere dayalı, açıklanabilir **tahmini** kazanç özeti (hukuki/bordro garantisi değil).

## Kimin için?

Fabrika, sağlık, güvenlik, perakende, lojistik, konaklama ve diğer tüm vardiyalı çalışanlar. Mesleğe özel ürünler yerine **genel amaçlı esnek vardiya motoru** tercih edildi; ilk test senaryolarında farklı sektörlerin düzenleri yer alacak.

## İlk sürüm (MVP)

- Özel vardiyalar ve tekrarlayan örüntüler; düzensiz günler için manuel istisnalar
- Günlük / haftalık / aylık takvim ve izin / mesai kayıtları
- Vardiyaya ve güne bağlı tekrarlayan rutinler; görev tamamlama geçmişi
- Cihaz üzerinde çalışan hatırlatmalar
- Sabit aylık veya saatlik ücret üzerinden tahmini kazanç hesaplama
- Türkçe ve İngilizce, çevrimdışı çalışma, yerel veri saklama
- Temel veri dışa aktarma / yedekleme, erişilebilir kullanıcı deneyimi

**İlk yayında planlanmayanlar:** zorunlu üyelik, bulut senkronizasyonu, şirket/personel yönetimi, sosyal özellikler, ülkelere özel eksiksiz bordro/vergi motoru. Widget, bulut senkronizasyonu, detaylı bordro analizi ve arkadaşlarla takvim karşılaştırması sonraki sürümlere adaydır.

## Planlanan teknik yön

| Alan | Seçim |
| --- | --- |
| Mobil | React Native + Expo + TypeScript |
| Navigasyon | Expo Router |
| Yerel depolama | SQLite / expo-sqlite |
| Uygulama durumu / doğrulama | Zustand / Zod |
| Bildirimler | expo-notifications |
| Çoklu dil | expo-localization + i18next |
| Test stratejisi | Saf domain fonksiyonları için birim testleri, kritik mobil akışlar için E2E |
| CI/CD | GitHub Actions; mobil derlemeler için Expo EAS (uygulanırken doğrulanacak) |
| İleride (opsiyonel) | Supabase ile hesap, yedekleme ve cihazlar arası senkronizasyon |

Teknik seçimler geliştirme başlarken sürüm ve platform uyumluluğu açısından yeniden doğrulanacaktır.

## Proje belgeleri

- [Ürün tanımı ve MVP kriterleri](docs/PRODUCT.md)
- [Teknik mimari ve veri modeli](docs/ARCHITECTURE.md)
- [Aşamalar ve çıkış koşulları](docs/ROADMAP.md)
- [Karar kaydı](docs/DECISIONS.md)
- [Test stratejisi](docs/TEST-PLAN.md)
- [Güncel durum ve doğrulanan ilerleme](docs/STATUS.md)
- [Yeni sohbet / geliştirici için devir notu](docs/HANDOFF.md)

## Çalışmaya devam etmek

Yeni bir sohbette **`docs/HANDOFF.md` ve `docs/STATUS.md` dosyalarını önce oku**, GitHub'ın güncel branch/PR/CI durumuyla karşılaştır, sonra `docs/ROADMAP.md` içindeki sıradaki açık işi seç. Geçmişte konuşulanları tamamlanmış kabul etme; yalnızca GitHub'da doğrulanan işlemleri tamamlandı olarak işaretle.

## İsim ve yayın notu

**Vardiyum** çalışma adıdır. Marka, alan adı ve uygulama mağazası isim uygunluğu henüz teyit edilmedi. Planlanan yayın platformları Apple App Store ve Google Play'dir; geliştirici hesapları ve mağaza uygunluk gereksinimleri yayın öncesinde güncel resmî kaynaklardan kontrol edilmelidir.

## Lisans

Lisans kararı henüz verilmedi. Depoda bir lisans dosyası bulunmadıkça kodun açık kaynak lisansı altında olduğu varsayılmamalıdır.
