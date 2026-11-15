# Vardiyum — Yeni Sohbete Devir Notu

**Repo:** https://github.com/hilmiguner/vardiyum  
**Tarih:** 2026-11-15  
**Önce `docs/STATUS.md`, `docs/ROADMAP.md`, açık PR'lar ve Actions sonuçlarını oku.**

## Amacımız

Tüm sektörlerdeki vardiyalı çalışanlar için **offline-first** bir iOS/Android kişisel asistan:
1. Özel/tekrar eden vardiya düzeni, takvim ve günlük istisnalar.
2. Vardiya türüne ve günlere göre rutinler, bildirimler, tamamlama geçmişi.
3. Mesai, ücret, prim ve kesintilerden resmi bordro olmayan **tahmini** kazanç.

Türkçe/İngilizce, kullanıcı hesabı zorunlu değil, ileride isteğe bağlı Supabase senkronizasyonu mümkün. Çalışma adı **Vardiyum**, marka uygunluğu kontrol edilmedi.

## Bilinen GitHub geçmişi

- PR #1: Ürün planı, mimari, yol haritası ve devir dosyaları; **main'e merge edildi**.
- [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2): Faz 1 Expo uygulama temeli.
- Faz 1 dalı: `feat/expo-mobile-foundation` — uygulama iskeleti, dört sekme, dil/tema, SQLite, basit döngü düzenleme, saf takvim motoru, GitHub Actions CI.
- **Henüz doğrulanmamış:** Bağımlılıkların kurulumu, CI pass, gerçek iOS/Android build, SQLite cihaz persistans testi. `package-lock.json` GitHub Actions tarafından üretildi ve PR'a eklendi; CI `npm ci` kullanıyor (son test sonucu kontrol edilmeli).
- **Henüz geliştirilmemiş:** tam vardiya istisnaları, özel saatler, rutin/mesai/kazanç motorları, yedek alma/geri yükleme ve yayın.

## Mimari kurallar

- Döngü indeksi takvim günleriyle hesaplanır; DST zamanı milisaniyeye bölerek gün sayılmaz.
- Tek günlük değişiklik normal döngünün sırasını kaydırmaz.
- Gece yarısını geçen vardiyanın zaman aralığı ayrı modellenir.
- Planlanan vardiya ile gerçekleşen mesai ayrıdır.
- Tahmini kazanç parasal hassasiyet ve tarihsel ücret kurallarıyla hesaplanmalı.
- Tasarımdaki tablo / ekranların varlığı bitmiş özellik kanıtı değildir.

## Sıradaki adım

**Önce GitHub'da güncel PR/CI kontrol et.** Faz 1 PR'ındaki bağımlılık hatalarını düzelt; Expo paket sürümlerini kontrol et; eklenen lockfile ile `npm ci` çalıştığını doğrula; lint/typecheck/unit testleri ve iki platformun JS bundle kontrolünü yeşil hale getir. Ardından iOS/Android smoke testlerini doğrula ve ancak kabul kriterleri karşılanınca merge et. Her gelişme sonrası STATUS, HANDOFF, ROADMAP ve gerekiyorsa DECISIONS dosyalarını güncelle.

### Yeni sohbet için mesaj

> Vardiyum'a kaldığımız yerden devam edelim: https://github.com/hilmiguner/vardiyum. Önce main ve açık PR/Issue/Actions durumunu kontrol et, docs/HANDOFF.md, docs/STATUS.md ve docs/ROADMAP.md'yi oku. Faz 1 uygulama iskeletinin doğrulanmamış CI ve native build durumlarını gerçek kanıtlarla kontrol ederek ilerle. Kapsam: tüm sektörler için offline-first iOS/Android vardiya döngüsü, rutinler ve tahmini kazanç. Yaptığın işleri test/commit/PR ile belgeleyerek GitHub'a işle.
