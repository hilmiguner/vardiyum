# Vardiyum — Yol Haritası

**Güncelleme:** 2026-11-15; doğrulanmış durum için [STATUS.md](STATUS.md).

| Faz | İçerik | Durum |
| --- | --- | --- |
| 0 | Ürün, mimari ve proje hafızası belgeleri | ✅ PR #1 ile tamamlandı |
| 1 | Expo iskeleti, SQLite, i18n, tema, CI | PR #3 main'e alındı; Issue #2 native test açık |
| 2 | Esnek vardiya motoru, istisnalar ve takvim | PR #5/#7/#9 main'de; cihaz testleri/sürümleme açık |
| 3 | Rutinler, görev geçmişi, bildirimler | PR #11 main; PR #13 izinli hatırlatma kodu/CI başarılı, native QA açık |
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

**Takip:** [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4), [PR #5](https://github.com/hilmiguner/vardiyum/pull/5) (özel şablonlar, aylık takvim ve istisnalar main'e merge edildi: d321be3e; son PR CI #43700862285 SUCCESS).

- [x] Kullanıcı tanımlı saatler, vardiya türleri, 12/24 saatlik planlama kodu ve birim testleri PR #5.
- [x] Döngüden bağımsız tek gün vardiya/izin override ve geri alma PR #5.
- [x] Gerçekleşmiş giriş/çıkış, mola ve not **kullanıcı beyanı olarak** ayrı kayıt akışı PR #9 (kod/CI).
- [ ] Ücretlendirilebilir mesai ve işveren onayı; Faz 4 ve açık tarihsel sürümleme kapsamında.
- [x] Döngü indeksi ve takvim günü için DST / IANA tarih senaryoları test edildi.
- [x] IANA saat dilimiyle gerçek UTC aralığı ve geçen saniye; DST gap/fold fail-closed kuralı, otomatik testler **PR #7 main'e merge edildi** (`5d4e1f9f`), main CI [#43702715736](https://github.com/hilmiguner/vardiyum/actions/runs/43702715736) SUCCESS.
- [ ] Gerçek cihaz ICU/tzdb sınır durumları: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) (kullanıcı isteğiyle ertelendi).
- [x] Bir gün için ayrı DST fold seçimi ve şablon/saat dilimi imzası; fiilî çalışma kayıtları ve açık saat dilimi değişim UI'si [PR #9](https://github.com/hilmiguner/vardiyum/pull/9) main'e merge edildi (`a4fcb627`); main CI [#43704664276](https://github.com/hilmiguner/vardiyum/actions/runs/43704664276) SUCCESS.
- [ ] Native cihazda DST, SQLite v3 kalıcılığı ve UTC kayıt doğrulaması: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ertelendi.
- [x] Aylık takvim, ay gezinme, gün seçimi ve günlük override PR #5.
- [ ] İleri düzey filtreleme.
- [x] SQLite v1→v2 ve eski kayıt koruma Node testleri PR #5.
- [ ] Gerçek cihazda veritabanı yükseltme/yeniden açma/bozuk veri testleri.
- [ ] Şablon silme ve sürümleme stratejisi.

## Faz 3 — Rutinler

**İlerleme:** [Issue #10](https://github.com/hilmiguner/vardiyum/issues/10) / [PR #11](https://github.com/hilmiguner/vardiyum/pull/11) **main'e merge edildi**, `e336bf4d`; main [CI #43706843264](https://github.com/hilmiguner/vardiyum/actions/runs/43706843264) SUCCESS. Yerel bildirimler için [Issue #12](https://github.com/hilmiguner/vardiyum/issues/12) açık; native cihaz testi ertelendi.

- [x] Haftanın günü, vardiya türü, izin ve herhangi uzunluktaki döngü günü filtre motoru (PR #11).
- [x] Bugün/Rutinler checklist, tarih seçimi, tamamlama/geri alma, arşiv ve hareket geçmişi (PR #11).
- [x] Lokal hatırlatma planlayıcı/izin/yeniden senkronizasyonu: [Issue #12](https://github.com/hilmiguner/vardiyum/issues/12), [PR #13](https://github.com/hilmiguner/vardiyum/pull/13), Node/JS CI #43708621922 SUCCESS.
- [ ] Android/iOS gerçek cihazda izin, kilit ekranı, boot, DST ve teslim testi: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) (ertelendi).

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
