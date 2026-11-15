# Vardiyum — Yol Haritası

**Güncelleme:** 2026-11-15; doğrulanmış durum için [STATUS.md](STATUS.md).

| Faz | İçerik | Durum |
| --- | --- | --- |
| 0 | Ürün, mimari ve proje hafızası belgeleri | ✅ PR #1 ile tamamlandı |
| 1 | Expo iskeleti, SQLite, i18n, tema, CI | PR #3 main'e alındı; Issue #2 native test açık |
| 2 | Esnek vardiya motoru, istisnalar ve takvim | Planlandı |
| 3 | Rutinler, görev geçmişi, bildirimler | Planlandı |
| 4 | Mesai ve tahmini kazanç | Planlandı |
| 5 | Yedekleme, gerçek cihazlar, beta | Planlandı |
| 6 | App Store ve Google Play yayını | Planlandı |

## Faz 1 — [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)

**Kod durumu:** PR #3 main'e squash merge edildi (`84afe3dfb9bc112af47f084f85717bf2a44744e1`); fiziksel cihaz kabulü açık.

- [x] Expo SDK 57 / TypeScript proje dosyaları yazıldı.
- [x] Dört ana ekran + Ayarlar ekranı yazıldı.
- [x] TR/EN çeviri ve tema altyapısı yazıldı.
- [x] Yerel SQLite veritabanı şema/migrasyon kodu yazıldı.
- [x] Saf vardiya döngüsü ve birim test senaryoları yazıldı.
- [x] GitHub Actions lint/typecheck/test workflow dosyası yazıldı.
- [x] npm bağımlılık kilidi GitHub Actions üzerinden üretildi ve branch'e eklendi.
- [x] Expo paket sürüm kontrolü başarılı: Actions #43697865419.
- [x] CI: lint/typecheck/test ve iki platform JS export PASS (#43697865419).
- [ ] Android ve iOS smoke testlerinin kaydı.
- [ ] Yerel veri persistansının cihaz test kanıtı.
- [x] Faz 1 PR #3 merge edildi; main başlangıç SHA: `84afe3dfb9bc112af47f084f85717bf2a44744e1`.

**Kod var ≠ test geçti / yayınlandı.** Gerçek doğrulama olmadan üstteki kabul kutuları kapatılmaz.

## Faz 2 — Gerçek vardiya esnekliği

**Takip:** [GitHub Issue #4](https://github.com/hilmiguner/vardiyum/issues/4) (açık, henüz geliştirme başlamadı).

- [ ] Kullanıcı tanımlı saatler, vardiya türleri, 12/24 saat çalışma
- [ ] Döngüden bağımsız tek gün izin/mesai/shift override
- [ ] UTC offset, DST ve zaman dilimi sınır durumları
- [ ] Aylık takvimde düzenleme ve filtreler
- [ ] Kalıcılık, migrasyon ve aralık hesaplama testleri

## Faz 3 — Rutinler

- [ ] Haftanın günü, döngü günü ve vardiya türüne bağlı tekrarlar
- [ ] Günlük görev listesi ve geçmiş tamamlanmalar
- [ ] Lokal bildirim, güncellemede yeniden planlama ve izin reddi davranışı

## Faz 4 — Mesai ve tahmini kazanç

- [ ] Gerçekleşen çalışma, mesai ve izin defteri
- [ ] Sabit/saatlik ücret, katsayı, prim ve kesinti
- [ ] Hassas para birimi hesabı, dönem dökümü, tahmin uyarıları

## Faz 5 — Beta

- [ ] Güvenli dışa aktarma ve içe alma
- [ ] Android/iOS cihaz matrisi ve veri kaybı testleri
- [ ] Çeşitli sektörlerden 20 kişiyle hedef kullanıcı testi
- [ ] Gizlilik/beyan ve erişilebilirlik kontrolleri

## Faz 6 — Mağaza yayını

- [ ] Geliştirici hesapları ve mağaza önkoşulları
- [ ] Mağaza varlıkları, gizlilik beyanları ve beta kabul süreçleri
- [ ] İki mağazaya üretim sürümünün gönderimi

V1.1+ adayları: widget, detaylı analiz, isteğe bağlı hesap ve senkronizasyon, bordro karşılaştırma, arkadaş takvimi. İlk 10–16 hafta varsayımı teslim garantisi değildir.
