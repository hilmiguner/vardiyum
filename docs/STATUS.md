# Vardiyum — Güncel Durum / Kanıt Kaydı

**Güncelleme tarihi:** 2026-11-15  
**Repo:** https://github.com/hilmiguner/vardiyum  
**Ana dal:** main  
**Hedef:** Sektörden bağımsız vardiya takvimi + vardiyaya bağlı rutinler + tahmini kazanç; iOS / Android.

## GitHub üzerinde doğrulananlar

- [x] GitHub deposu var: hilmiguner/vardiyum (erişim/metadata doğrulandı).
- [x] Depo başlangıçta boştu; başlangıç README.md kaydı eklendi (commit: 42239462fb9a21d7a642ddc30d04657c2cd86a96).
- [x] Ürün hedefi, kapsam, mimari, yol haritası, test planı, karar kayıtları ve devir dokümantasyonu yazıldı (bu dokümantasyon değişikliği).
- [x] PR #1 (https://github.com/hilmiguner/vardiyum/pull/1) squash merge edildi; main commit: 8a29a3a6f908d234326c53307ce6b18ae16223a5.

## Henüz yapılmayanlar

- [ ] Expo / React Native proje kodu oluşturulmadı.
- [ ] Uygulama ekranları veya SQLite şeması uygulanmadı.
- [ ] Otomatik test / GitHub Actions CI kurulmadı veya çalıştırılmadı.
- [ ] Vardiya motoru / rutin motoru / kazanç motoru geliştirilmedi.
- [ ] iOS/Android build, TestFlight, Play Console beta, mağaza yayınları yapılmadı.
- [ ] İsim/marka/domain/mağaza adının kullanılabilirliği doğrulanmadı.
- [ ] Geliştirici üyeliklerinin açıldığı doğrulanmadı.

## Sıradaki somut iş

**[Faz 1 — GitHub Issue #2](https://github.com/hilmiguner/vardiyum/issues/2):** Expo + React Native + TypeScript projesini oluştur; Expo Router, TR/EN, tema, SQLite, test ve GitHub Actions kalite kapısı kur. Vardiya motoru için saf domain arayüzünü ve ilk kabul senaryosu testlerini ekle. CI ve derlemeleri doğrula.

### Tamamlanma kanıtı standardı

Bir iş, konuşmada “hazır” denildiği için tamamlanmış sayılmaz. Dosya/commit/PR/CI veya test çıktılarıyla kanıtlanmalı. Her ilerlemeden sonra:
1. GitHub main ve açık PR/branch'leri kontrol et.
2. Gerçekleşen işi, ilgili commit veya PR'ı ve test sonucunu buraya yaz.
3. [ROADMAP.md](ROADMAP.md) ve [HANDOFF.md](HANDOFF.md) içindeki sonraki adımı güncelle.
4. Başarısız/bekleyen işleri açık durumlarıyla bırak.

## Değişiklik geçmişi

- **2026-11-15:** Başlangıç ürün ve teknik planı kabul edildi. Kullanıcının açtığı GitHub deposuna proje hafızası aktarımı başlatıldı. README oluşturuldu; PR #1 ile yedi ayrıntılı doküman main dalına birleştirildi. Uygulama kodu henüz yok.
