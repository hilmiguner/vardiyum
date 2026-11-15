# Vardiyum — Yeni Sohbet / Geliştirici Devir Notu

**Repo:** https://github.com/hilmiguner/vardiyum  
**Güncelleme:** 2026-11-15  
**Ana dal:** main

## Önce kontrol edilecekler

1. GitHub'daki main commit, açık PR/Issue'lar ve son Actions CI sonucunu oku.
2. [STATUS.md](STATUS.md) ve [ROADMAP.md](ROADMAP.md) dosyalarını oku.
3. [PRODUCT.md](PRODUCT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DECISIONS.md](DECISIONS.md) dosyalarını karar kaynağı olarak al. İddia yerine gerçek commit/CI kanıtı kullan.

## Ürünün amacı

**Vardiyum**, başlangıçtan itibaren tüm sektörlerdeki vardiyalı çalışanlar için iOS/Android kişisel vardiya asistanıdır:
- Özel/periyodik vardiya döngüleri, tek gün istisnaları, izin ve takvim.
- Vardiyaya/güne bağlı iş ve kişisel rutinler ile bildirimler.
- Mesai, ücret ve primlerden **tahmini** dönem kazanç dökümü; resmi bordro değil.

Offline-first, Türkçe/İngilizce, ilk sürümde zorunlu üyelik ve backend yok. İleride isteğe bağlı senkronizasyon için Supabase aday. Marka adı **Vardiyum**, marka/mağaza/domain kullanılabilirliği henüz teyit edilmedi.

## Doğrulanan GitHub ilerlemesi

- **PR #1** ürün planı, mimari, kararlar ve devir belgeleri main'e merge edildi.
- **PR #3** Expo SDK 57 / React Native 0.86 / TypeScript; Expo Router dört sekme + ayarlar; sistem tema ve TR/EN; SQLite şema v1 ve kalıcı döngü repository; basit döngü editörü ve 14 gün görünümü; saf takvim motoru. **Main merge SHA:** `84afe3dfb9bc112af47f084f85717bf2a44744e1`.
- **CI kanıtı:** [Actions #43698347742](https://github.com/hilmiguner/vardiyum/actions/runs/43698347742) PR head `ec9137d...` için SUCCESS (Prettier, npm ci, Expo sürüm kontrolü, lint, typecheck, Node test, Android ve iOS JS export).
- `package-lock.json` repoda. Bir sonraki geliştirici `npm ci` kullanmalı.

## Açık riskler / hazır olmayan özellikler

- **Native iOS/Android build ve gerçek cihaz testleri yapılmadı.** JavaScript bundle PASS, native doğrulamanın yerini tutmaz.
- Gerçek cihaz SQLite persistansı, standalone çevrimdışı kullanım ve erişilebilirlik cihaz testleri: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2), [DEVICE-SMOKE.md](DEVICE-SMOKE.md).
- İlk editörde vardiya saatleri sabit örnektir; özel saatler, izin/değişiklik override'ları ve ay görünümü **henüz uygulanmadı**.
- Rutin ve kazanç ekranları yer tutucudur; bu modüllerin veri tabloları hazırlanmış olsa da motorları yoktur.
- Yedekleme, bildirim planlaması, ücretin hukuki hesap kuralları ve mağaza yayını sonraki fazlardadır.

## Sıradaki çalışma

1. Güncel main ve CI durumunu kontrol et.
2. Native cihaz testini planla, eldeki imkanlarla doğrula; mümkün değilse bu sınırı açık bırak.
3. **[Issue #4 — Faz 2: esnek vardiya motoru](https://github.com/hilmiguner/vardiyum/issues/4)** için branch/PR aç.
4. Serbest vardiya tanımı, istisnalar, gece aralıkları, timezone/DST ve SQLite migration testlerine odaklan. Tüm değişiklikler için CI + dokümantasyon.
5. Faz 2'yi, test edilen mevcut yerel verileri kaybettirmeden uygula.

## Yeni sohbet için önerilen mesaj

> Vardiyum'a kaldığımız yerden devam edelim. https://github.com/hilmiguner/vardiyum deposunda docs/HANDOFF.md, docs/STATUS.md, docs/ROADMAP.md, docs/DECISIONS.md dosyalarını ve güncel PR/CI/Issue durumunu kontrol et. PR #3 ile Expo mobil altyapısı main'e alındı; native cihaz testi hâlâ açık (Issue #2). Sıradaki kod işi Issue #4: esnek vardiya şablonları, saatler, istisnalar ve güvenilir takvim motoru. Kanıtlanmayan işleri tamamlandı diye işaretleme. Yeni değişiklikleri ve kararları GitHub'a yaz.
