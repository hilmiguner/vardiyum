# Vardiyum — Güncel Durum / Kanıt Kaydı

**Güncelleme:** 2026-11-15  
**Repo:** https://github.com/hilmiguner/vardiyum  
**Ana dal:** main  
**Geliştirme:** [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2), `feat/expo-mobile-foundation` dalı.

## Main dalında daha önce doğrulananlar

- [x] Ürün ve teknik kapsam dokümanları PR #1 ile birleştirildi.
- [x] En son dokümantasyon commit'i: 43dd9e4c54ef6c9d1725326a1ca98cd509b56304 (Faz 1 başlamadan önceki referans).

## Faz 1 geliştirme dalında hazırlananlar — main'e merge edilmedi

- [x] Expo SDK 57 / React Native / TypeScript proje konfigürasyonu
- [x] Expo Router ile Bugün, Takvim, Rutinler, Kazanç, Ayarlar ekranları
- [x] Türkçe/İngilizce çeviriler ve sistem teması
- [x] SQLite şeması (sürüm 1) ve transactional başlangıç migrasyonu
- [x] Vardiya döngüsü için yerel okuma/yazma, örnek döngü ve temel editör
- [x] Takvim günü hesaplama motoru ve planlanan Node testleri
- [x] GitHub Actions lint/typecheck/test iş akışı dosyası

**Uyarı:** Yukarıdaki kutular `kod yazıldı` anlamındadır; `CI/test geçti`, `mobil cihazda çalıştı` veya `main'e merge edildi` anlamına gelmez. PR ve CI sonucu yeni oturumda doğrulanmalıdır.

## Açık doğrulama / engeller

- [ ] `npm install` ve `npx expo install --check` ile bağımlılık uyumluluğunu doğrula.
- [x] `package-lock.json` GitHub Actions ile oluşturulup PR'a eklendi; CI yapılandırması `npm ci` kullanacak şekilde güncellendi. Yeni çalışmanın sonucu ayrıca kontrol edilmeli.
- [ ] CI sonucunu kontrol et: lint, typecheck, domain test; başarısızsa düzelt.
- [ ] Android/iOS gerçek cihaz veya emülatör smoke test yap.
- [ ] Yerel veritabanı kalıcılığını yeniden başlatma/migrasyon testleriyle kanıtla.
- [ ] Rutin ve kazanç ekranları gerçek işlevselliğe henüz sahip değil.
- [ ] Faz 2: özelleştirilebilir saatler, izin/değişiklik istisnaları, gece vardiyası süreleri ve takvim.

## Sıradaki eylem

1. Faz 1 PR'ı ve GitHub Actions kontrol sonuçlarını incele.
2. Bağımlılık kilidini ve uyumluluk sorunlarını gider; çalışır geliştirme sürümü doğrula.
3. Faz 1 kabul kriterleri sağlanınca merge et; main SHA/CI bilgilerini bu dosyaya işle.
4. Faz 2 için tarih/istisna/gece vardiyası kabul testleriyle vardiya motorunu genişlet.

## Geçmiş

- **2026-11-15:** Başlangıç proje hafızası ve yol haritası PR #1 ile main'e eklendi.
- **2026-11-15:** Faz 1 için Expo mobil iskeleti, SQLite ve kalite kapısı geliştirme dalında hazırlandı; derleme ve test doğrulaması bekliyor.
