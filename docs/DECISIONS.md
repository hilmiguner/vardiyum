# Vardiyum — Mimari ve Ürün Karar Kaydı

Kararlar 2026-11-15 itibarıyla konuşulan hedefleri belgeler. Geliştirme sırasında değişen kararlar tarih ve gerekçeyle eklenecek; eski girdiler iz bırakacak.

| ID | Durum | Karar | Gerekçe |
| --- | --- | --- | --- |
| D-001 | Onaylı | Başlangıçtan itibaren tüm vardiyalı çalışanlar hedeflenecek | Fabrika/sağlık/güvenlik dahil sektör bağımsız büyüme |
| D-002 | Onaylı | Ürün bir kişisel vardiya asistanı: takvim + rutin + kazanç | Sadece takvim sunan rakiplerden ayrışma |
| D-003 | Onaylı | iOS ve Android aynı ürünün hedef platformları | Geniş erişim |
| D-004 | Planlanan teknik yön | React Native + Expo + TypeScript | Tek kod tabanı, hızlı doğrulama |
| D-005 | Planlanan teknik yön | Offline-first, ilk sürümde zorunlu hesap veya bağımsız backend yok | Gizlilik, düşük işletim maliyeti, internetsiz kullanım |
| D-006 | Planlanan teknik yön | Saf vardiya/rutin/kazanç motorları, SQLite kalıcılık | Test edilebilirlik, gelecekte senkronizasyona hazırlık |
| D-007 | MVP kapsamı | Döngü + tek gün istisna mekanizması | Sektörlerden bağımsız esneklik |
| D-008 | MVP kapsamı | Vardiya ve günlere bağlanan görevler | Ana ürün farklılaştırıcısı |
| D-009 | MVP kapsamı | Kazançlar ilk sürümde açıkça **tahmini**; ülkeye özgü otomatik bordro iddiası yok | Yanıltıcı ücret hesaplamasından kaçınma |
| D-010 | Planlanan kapsam | TR/EN, dört ana sekme, basit onboarding | Global başlangıç ve odaklı UX |
| D-011 | Ertelenen | Supabase hesabı/senkronizasyonu, widget, sosyal ve gelişmiş analizler P1+ | MVP'yi küçültme |
| D-012 | Önerilen | Temel takvim ücretsiz; Premium sonradan, fiyat belirlenmedi | Edinim ve geri bildirime öncelik |
| D-013 | Çalışma adı | Vardiyum | Henüz marka/mağaza/domaine ilişkin kullanılabilirlik onayı yok |
| D-014 | Operasyonel | GitHub belgeleri proje hafızasının kaynağı; doğrulanmamış iş 'tamamlandı' yazılmaz | Sohbetler arasında güvenilir devam |

## Açık kararlar

- [ ] İsim/marka/alan adı ve mağaza adının uygunluk taraması
- [ ] Lisans (açık kaynak veya kapalı), CONTRIBUTING ve sürüm politikası
- [ ] Expo ve paket sürümleri (kurulum tarihinde uyumluluk)
- [ ] Zaman dilimi değiştiren kullanıcıda vardiya ankorunun davranışı
- [ ] Rutin filtrelerinin AND/OR birleştirme semantiği
- [ ] Yedek formatı, şifreleme ve geri yükleme çakışma kuralı
- [ ] Kazanç dönemi / kesintiler / vergi varsayımları ve kullanılacak para birimi biçimlendirmesi
- [ ] İlk sürümde elle planlanan (döngüsüz) takvim düzenleme akışı
- [ ] Gizlilik metni ve mağaza yayınına ilişkin güncel kurallar

## Değişiklik süreci

Önemli karar değişikliğinde yeni tarihli kayıt ve PR bağlantısı eklenir. Önceki karar sessizce silinmez. Dosyalar ve GitHub PR geçmişi birlikte izlenir.

## 2026-11-15 — Uygulama tercihleri

- **D-015 (uygulandı):** İlk prototipte Expo SDK 57, React Native 0.86 ve React 19.2 kullanıldı. SDK 58 güncel kararlı sürüm; SDK 57 Expo Go ile erken test kolaylığı için seçildi. Yükseltme ayrı test/PR ile ele alınacak.
- **D-016 (uygulandı):** Npm lock dosyası depoya eklendi, CI `npm ci` kullanır. İki platformun JS bundle sonucu gerçek native build veya cihaz testi değildir.

## 2026-11-15 — Faz 2 uygulama kararları

- **D-017 (uygulandı, PR #5):** Takvim günleri, ilk kurulumda kaydedilen IANA saat dilimine göre seçilir; gün/ay aritmetiğinde **sivil takvim günü** kullanılır. Seyahatte saat dilimini değiştirmeye yönelik ayar henüz yapılmadı.
- **D-018 (uygulandı, PR #5):** Vardiya şablonunda `startsAt`, `endsAt` ve `endDayOffset` tutulur; planlı duvar saati süresi, **gerçek UTC geçen süre** değildir. DST üzerinden gerçek çalışma süresi ve maaş hesapları sonraki ayrı karardır.
- **D-019 (uygulandı, PR #5):** `day_overrides` normal döngünün indeksini değiştirmez. `shift_templates` içindeki mevcut v1 satırları ve geçmiş döngü kayıtları v2 yükseltmesinde ezilmez.
- **D-020 (açık):** Şablon silme, günlük değişikliklerin zaman çizelgesi sürümleme ve tarihsel vardiya düzeni değişimlerine dair geçmiş koruma politikası henüz tamamlanmadı.
