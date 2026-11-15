# Vardiyum — Güncel Durum / Kanıt Kaydı

**Güncelleme tarihi:** 2026-11-15  
**Repo:** https://github.com/hilmiguner/vardiyum  
**Ana dal:** main  
**Ürün:** Sektör bağımsız offline-first iOS/Android vardiya + rutin + tahmini kazanç asistanı.

## GitHub üzerinde tamamlananlar

- [x] PR #1: ürün/mimari/yol haritası/karar/handoff belgeleri main'e birleştirildi.
- [x] PR #3: Expo SDK 57 + React Native 0.86 + TypeScript mobil temel; **squash merge main SHA** `84afe3dfb9bc112af47f084f85717bf2a44744e1`.
- [x] Expo Router ile Bugün, Takvim, Rutinler, Kazanç ve Ayarlar ekranları.
- [x] Türkçe/İngilizce metinler, açık/koyu sistem teması.
- [x] SQLite v1 şema ve ilk migrasyon; döngü okuma/yazma repository.
- [x] Yerel örnek döngü editörü, bugünkü vardiya ve önümüzdeki 14 gün.
- [x] Saf takvim gününe dayalı döngü motoru ve Node test senaryoları.
- [x] `package-lock.json`, `npm ci` ve GitHub Actions kalite kapısı.
- [x] GitHub Actions **#43698347742** PR commit `ec9137d77ae5a1447c4b0ceea0047be5ce946db0`: format, npm ci, Expo dependency check, lint, typecheck, unit test, Android ve iOS JS export — **SUCCESS**.
- [x] Gerçek cihaz kontrol listesi: [DEVICE-SMOKE.md](DEVICE-SMOKE.md).

## Henüz kanıtlanmayanlar / sınırlamalar

- [ ] **Gerçek Android ve iOS cihaz veya simülatör çalıştırması, native derleme** kanıtlanmadı.
- [ ] SQLite'nın gerçek cihazda kapanıp açıldıktan sonra veri koruması test edilmedi.
- [ ] Gerçek standalone pakette internet kapalıyken kullanım doğrulanmadı.
- [ ] Kişisel vardiya saatleri, tek gün istisnaları, aylık takvim düzenleme henüz işlevsel değil (Faz 2).
- [ ] Rutin, bildirim, mesai ve maaş ekranlarında gerçek işlevler henüz yok (Faz 3–4).
- [ ] Yedek alma/geri yükleme, mağaza yayınları ve isim/marka araştırması yapılmadı.

**Ayrım:** Android/iOS JS export başarısı, native build/gerçek telefon testi başarısı değildir.

## Açık işler

- [Issue #2 — Faz 1 gerçek cihaz / SQLite kalıcılık kabulü](https://github.com/hilmiguner/vardiyum/issues/2): altyapı kodu main'e eklendi, yalnızca native kabul kanıtları açık.
- [Issue #4 — Faz 2 esnek vardiya motoru](https://github.com/hilmiguner/vardiyum/issues/4): henüz başlamadı.
- Main dalına PR #3 merge sonrası otomatik push CI doğrulamasını güncel Actions ekranından ayrıca kontrol et.

## Sıradaki adımlar

1. GitHub main SHA/Actions sonucunu doğrula; bu belge eskiyse düzelt.
2. Android ve iOS cihazlarda [DEVICE-SMOKE.md](DEVICE-SMOKE.md) testlerini uygulayıp bulguları Issue #2'ye ekle.
3. Issue #4 için yeni branch/PR aç: özel vardiya türleri ve zamanları, günlük istisnalar, gece geçişleri.
4. Her değişimde ROADMAP, HANDOFF, DECISIONS ve STATUS dosyalarını gerçek commit/CI kanıtına göre güncelle.

## Kanıt geçmişi

- **2026-11-15:** Başlangıç dokümantasyonu PR #1 tamamlandı.
- **2026-11-15:** İlk mobil temel PR #3 squash merge edildi; son PR kalite kontrolü SUCCESS. Native testler bekliyor.
