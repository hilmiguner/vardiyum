# Vardiyum — Yeni Sohbette Devam Notu

**Repo:** https://github.com/hilmiguner/vardiyum  
**Tarih:** 2026-11-15

## Her zaman önce doğrula

1. `main` SHA, son Actions (özellikle push CI), açık PR/Issue durumunu kontrol et.
2. [STATUS.md](STATUS.md), [ROADMAP.md](ROADMAP.md), [DECISIONS.md](DECISIONS.md) ve bu dosyayı oku.
3. Kod var demek native test, mağaza yayını veya ürünün tamamı hazır demek değildir.

## Ürün / hedef

**Vardiyum**, başlangıçtan itibaren **tüm vardiyalı çalışanları** hedefleyen offline-first, TR/EN bir iOS/Android kişisel çalışma asistanı.

- Periyodik esnek vardiyalar + izin/değişiklik için tek gün istisnaları.
- Vardiyaya/güne bağlı rutin görevler, tamamlanma ve hatırlatmalar (Faz 3).
- Mesai, taban ücret, prim/kesinti üzerinden **tahmini** kazanç (Faz 4; resmi bordro değil).
- Çekirdek özellikler için internet ve üyelik zorunluluğu yok; ileride Supabase opsiyonu.
- Marka çalışma adı Vardiyum; tescil/domain/mağaza uygunluğu henüz kontrol edilmedi.

## GitHub ilerlemesi

- **PR #1:** Dokümantasyon/hafıza main'e merge edildi.
- **PR #3:** Expo SDK 57 + RN/TS, SQLite v1, uygulama iskeleti ve CI main'e merge edildi. PR #3 main CI: [#43698720966](https://github.com/hilmiguner/vardiyum/actions/runs/43698720966) SUCCESS.
- **PR #5:** `feat/shift-templates-overrides-v2` — kullanıcı tanımlı vardiya adı/saat/mola şablonları, aylık takvim, tek gün değişiklik/geri alma, SQLite v2 eklemeli migrasyon, geçmiş v1 veri koruma ve domain testleri.
- **PR #5 CI:** [#43700598683](https://github.com/hilmiguner/vardiyum/actions/runs/43700598683) SUCCESS (npm ci, Expo check, Prettier, lint, TS, Node test, Android+iOS JS export).
- **PR #5 merged:** main SHA `d321be3e54eac31de6a69e59afcc461113ceaf25`. Son PR CI #43700862285 SUCCESS; merge sonrası main CI #43700993958 ayrıca kontrol edilmeli.

## Teknik sınırlar / sonraki işler

- Yerel takvim günü hesabında tarih + IANA zaman dilimi kullanılır; sabit 24 saatlik milisaniyeye göre gün farkı hesaplanmaz.
- 23:00–07:00 veya 07:00–07:00 (+1) **planlı duvar saati aralığıdır**. DST geçişlerinde gerçek geçen süre ayrı çözüm gerektirir; ücret hesabında bunu gerçek dakika varsayma.
- SQLite v2 tablo ekler/alan genişletir; eski `pattern_days` ve `day_overrides` korunmalı.
- Tek günlük istisnalar diğer günlerin döngü sırasını değiştirmez.
- PR #5 gerçek telefonda test edilmedi; [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık.
- Kullanıcı rutinleri, bildirimler ve kazanç motorları henüz boş/yer tutucu ekranlar.
- [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4) Faz 2'nin açık üst işi; eksik kapsam ve cihaz testleri bitene kadar kapanmamalı.

## Bir sonraki somut geliştirme

1. PR #5 main'e birleştirildi; yeni oturumda son main commit/Actions ve [Issue #6](https://github.com/hilmiguner/vardiyum/issues/6) durumunu doğrula.
2. Native SQLite v1→v2 cihaz/uygulama yeniden başlatma testlerini yap; fiziksel test yapılamıyorsa açık bırak.
3. Faz 2 kalan kapsamını küçük PR'lara böl: [Issue #6](https://github.com/hilmiguner/vardiyum/issues/6) DST/gerçek geçen süre; şablon silme/sürümleme; izin/mesai kayıtları.
4. Her PR için otomatik test + Android/iOS JavaScript export + belgeler; hiçbir zaman yalnızca sohbet hafızasına güvenme.

## Yeni sohbet için kopyalanabilir mesaj

> Vardiyum projesini GitHub'dan devralıp kaldığımız yerden devam edelim: https://github.com/hilmiguner/vardiyum. Önce docs/HANDOFF.md, docs/STATUS.md, docs/ROADMAP.md, docs/DECISIONS.md, açık PR/Issue ve güncel Actions durumlarını oku. PR #3 Expo iskeleti main'de; PR #5 özel vardiya/günlük istisnalar **main'e merge edildi**; sıradaki Issue #6 DST/gerçek geçen süre. Native Android/iOS cihaz testleri Issue #2'de açık, Faz 2 Issue #4. Test edilmemiş işleri tamamlandı diye işaretleme. Yeni değişiklikleri GitHub'a kanıtlarıyla kaydet.
