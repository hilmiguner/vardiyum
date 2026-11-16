# Vardiyum — MVP P0 Çekirdek Akış Denetimi

**Tarih:** 2026-11-16  
**Tek MVP çıkış takipçisi:** [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38)  
**Öncelik:** [MVP-SCOPE-FREEZE.md](MVP-SCOPE-FREEZE.md), 1. aşama — mevcut ürünü tamamlamak, **yeni maaş senaryosu eklememek**.  
**Kanıt seviyesi:** Bu rapor kaynak kodu ve Node/CI denetimidir; Android/iOS gerçek native cihaz testi **DEĞİLDİR**.

## Kontrol matrisi (P0, gözden geçirilen gerçek kod)

| Çekirdek yol | Kodla doğrulanan durum | Kalan P0 kabul |
| --- | --- | --- |
| İlk kurulum / Bugün | `src/app/(tabs)/index.tsx`: vardiya yoksa Ayarlar kurulum CTA; `settings.tsx`: döngü tarihi/günler/vardiya türü formu, SQLite transaction | Gerçek kullanıcı ilk kurulum akışı, boş/hatalı giriş ve TR/EN erişilebilirlik gözlemi; gerçek cihaz aşama 2 |
| Takvim / günlük istisna | `calendar.tsx`: aylık 7 sütun grid, vardiya değiştirme/geri alma, not, gerçekleşen çalışma; veri deposunda kayıtlı gerçek UTC/IANA çalışma ayrı | **P0 risk düzeltmesi:** override veya aynı template saat/mola güncellemesi sonrası gerçek çalışma formundaki draft eski vardiyaya bağlı kalıyordu. Bu PR kaynak kimliği ile yeniden yükler; kayıtlı eski gerçek çalışma verisine dokunmaz. İlk kurulum yoksa doğrudan Ayarlar CTA + veritabanı hatası için Retry. |
| Rutinler ve hatırlatmalar | `routines.tsx`, `routine-day-checklist.tsx`, `reminder-coordinator.tsx`: görevler/işaretleme/özet ve yerel bildirim uzlaştırma kodu mevcut | UI boş durum/izin reddi/açık ekran geri dönüşü P0 kontrolü; OS teslimi Android/iOS cihaz aşama 2, yapılmış gibi işaretlenmez |
| Kazanç | `earnings.tsx`, `earnings-repository.ts`, custom combined/export: kaynaklı aylık ve desteklenen özel dönem tahminleri, açık engelleme/gizlilik kararları var | **P0 ürün boşluğu:** Ürün tanımı 3.6'daki “Bugün sayfasında tahmini kazanç özeti” `index.tsx` içinde henüz yok. Yeni bordro motoru açmadan yalnız mevcut kaynak doğrulamasıyla, özel dönem/ay ayrımını yanıltmadan ele alınmalı. |
| Dil/mahremiyet/offline | TR/EN `src/i18n/index.ts`, erişilebilir buton etiketleri, offline-first SQLite, AES backup/clean-target restore, onaylı export kodu mevcut | Cihazda yazı taşması/kontrast, OS paylaşım dosyası temizliği, offline/geri yükleme = aşama 2; kritik UX eksiklerini aşama 1'de kapat |
| Gelişmiş maaş istisnaları | PR #36 iki fixed BASE; #37 iki fixed OT **karar kaydı** | **P1/v1.1+**: fixed→fixed gerçek OT fiyatlandırma/combined/export, fixed↔hourly, FX. Fail-closed `BLOCKED` olmalı, P0 blocker değil. |

## Bu P0 düzeltme PR'ı — kabul ve regresyon

- [x] **Bulgu:** `ActualWorkEditor` `useState(template.startsAt/endsAt/breakMinutes/endDayOffset)` yalnız ilk mount'ta çalışır; Takvim'de `key={selectedDate}` kullanıldığı için aynı tarih gece vardiyasından gündüze override edildiğinde eski 23:00–07:00 (+1) taslağı 07:00–15:00 seçiliyken kalabilir. Kullanıcının yanlış gerçek mesai kaydetmesini önlemek P0'dır.
- [x] **Düzeltme:** `calendarEditorSourceKey` date, source shift ID, başlangıç/bitiş, next-day offset, mola, izin flag ve kayıtlı IANA zone içeren kesin tuple key üretir. Takvim `BoundaryChoiceEditor` ve `ActualWorkEditor` bileşenlerini yalnız kaynak değiştiğinde yeniden mount eder; original `actual_work_sessions` geçmişi değişmez. Anahtarlar sibling UI için unique.
- [x] **Düzeltme:** Takvim boş vardiya durumunda mevcut TR/EN `configure` kopyasını ve direkt `/settings` CTA'yı gösterir. SQLite açılış hatasında uygulamadan çıkmadan `reload` Retry.
- [x] Node testleri: aynı gün override gece→sabah, aynı ID ile saat/mola değişimi, timezone/gün/rest değişimi, deterministik/çarpışmasız tuple.
- [x] [PR #39 CI #43853928391](https://github.com/hilmiguner/vardiyum/actions/runs/43853928391) **SUCCESS: 323/323 Node, 0 fail; Prettier/ESLint/TypeScript/Expo, Android+iOS JS bundles** (native acceptance değildir).
- [ ] Son docs-only HEAD CI ve kullanıcı merge onayı bekleniyor.
- [ ] Kullanıcı merge onayı ve sonra main CI; bu geliştirme **#38 aşama 1 tamamlandı** anlamına gelmez.

## Sıradaki P0 kabul faaliyeti

`docs/PRODUCT.md` 3.6 doğrultusunda Bugün sayfası için **kaynak doğrulanmış, doğru dönemli ve eksik/blocked durumlarda rakam göstermeyen** sınırlı kazanç özeti kabulü. Yeni maaş/OT fiyat motoru **AÇILMAYACAK**. Ardından ilk kurulum ve temel rutin/izin-denied/TR-EN ekranları üzerinden son P0 kabul/bugfix, sonra native #2/#20 aşamasına geç. **Yeni sonsuz özellik loop'una geri dönme; #38'deki dört aşama aynı kalır.**
