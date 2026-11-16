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

## 2026-11-16 — PR #39 MERGED ve PR #40 güvenli Bugün kazanç özeti (P0 aşama 1)

- [x] [PR #39](https://github.com/hilmiguner/vardiyum/pull/39) kullanıcı onayıyla MERGED, main `8b778cb6dde93890bd68b98b083b71040f2e2aef`; [main CI #43857901909](https://github.com/hilmiguner/vardiyum/actions/runs/43857901909) **SUCCESS 323 Node**. Önceki bölümün “merge bekleniyor” ifadeleri geçmiş durumu gösterir, artık güncel değildir.
- [x] [PR #40](https://github.com/hilmiguner/vardiyum/pull/40) `PRODUCT.md` §3.6'da eksik kalan **Bugün tahmini kazanç özeti** için kaynak-bağlı yalnız *mevcut* aylık veya özel dönem combined report, doğru gün/ay zone ve `payPeriodForDate` (26→25), fail-closed + TR/EN durum/CTA ekranı. `loadTodayEarningsFromSources` bir kez ilgili raporu yükler ve kaydedilmiş dönem başlangıcı değişmediyse yalnız o kaynak tutarını sunar. Eski aylık ve özel dönem toplamlarını toplamaz, yeni bordro motoru kurmaz.
- [x] +10 Node test: aylık gün1 vs gün26, 25/26 sınırı, yıl/Şubat/45 dakikalık IANA, user-reported kaynak discl/scope, yanlış ay/para/FX, needs_profile, blocked, no data, ayar race, SQLite failure. Temp format tanı [Actions #43858929304](https://github.com/hilmiguner/vardiyum/actions/runs/43858929304) **SUCCESS 333/333 Node + Android/iOS JS**; tanı workflow'u geri alındı.
- [x] Ayarlar'da özel maaş dönemi tercihinin `henüz etkinleşmediğini` iddia eden tarihsel TR/EN uyarı metinleri gerçek ürün davranışına uyarlandı: takvim ayı raporu değişmez, ayrı özel dönem tahmini yalnız doğrulanmış kaynaklarla.
- [ ] Son temiz PR #40 HEAD Actions / merge için **ayrı kullanıcı onayı**. Bu PR P0 aşama 1'in tamamı değildir.
- [ ] **P0 aşama 1 kalan tek toplu kabul denetimi:** ilk kurulum, TR/EN UX, temel erişilebilirlik, boş/hatalı kayıt, bildirim reddi/kritik gizlilik ve dört sekme + Ayarlar akışları; kanıtlı P0 eksikler düzeltilir. Native iOS/Android #2/#20 aşama 2, beta ve store daha sonra.

## 2026-11-16 — 1. aşama son kaynak-kod denetimi (PR #41; cihaz değil)

| MVP P0 kullanıcı akışı | Kanıtlanan kod | Son durum / kalan |
| --- | --- | --- |
| İlk açılış/kurulum | `Today` ve `Calendar` boş program → `/settings` CTA; `Settings` döngü şablon/saat/tarih doğrulaması ve transactional SQLite | **PR #41:** `Routines` aynı CTA ve `Settings` DB read Retry; ilk cihaz açılışı ve erişilebilir büyük font **Aşama 2** |
| Bugün | Bugünkü program IANA yerel gün, bir sonraki vardiya, günlük rutin; [PR #40](https://github.com/hilmiguner/vardiyum/pull/40) verified calendar/custom earnings-only summary | **Kod mevcut**, yanlış rapor/FX/needs_profile/blocked/no_work durumunda tutar YOK, resmî/net pay iddiası YOK |
| Takvim + gerçek çalışma | [PR #39](https://github.com/hilmiguner/vardiyum/pull/39): aynı gün vardiya veya kaynak saat/zone değişiminde draft reset; kullanıcı gerçek UTC çalışma kaydı korunur | **Kod mevcut**, native SQLite kalıcılığı/DST gerçek cihaz Aşama 2 |
| Rutin/izne bağlı davranış | Kural edit/archive, checkbox/audit, 14 gün bildirim reconciliation ve sadece kullanıcı aksiyonuyla OS izni | **PR #41:** storage error iken stale `rules` yönetimi yok, açık Retry + no-schedule CTA, checklist recovery; gerçek OS izin reddi/teslim Aşama 2 |
| Kazanç/gizlilik | Saatlik/sabit ve doğrulanmış destekli özel dönemde pre-tax, explicit consent CSV/JSON, fail-closed; AES-256-GCM clean restore kodu | **Kod mevcut, cihaz kanıtı yok**; fixed→fixed OT amount/combined/FX v1.1+ ve BLOCKED |
| TR/EN/erişilebilirlik | İki dilde etiketler, checkbox/button role, uyarılar; "özel dönem aktif değil" eski metni PR #40 ile düzeltildi | Cihazda TalkBack/VoiceOver, dynamic text overflow, düşük kontrast ve erişilebilir izin ekranları henüz **PASS değil** |

**Kapatma kuralı:** PR #41 son HEAD CI + kullanıcı merge onayı + main CI doğrulanınca **kaynak düzeyinde ilk ekran/çekirdek P0 denetim döngüsünü kapat**. Yeni mikro-özellik arama. Issue #38 2. aşama, gerçek cihaz üzerinde objektif kayıt ve bug-fix triage; 3. kapalı beta, 4. store. Native testte P0 bulunursa aynı aşamada düzelt; stage sayısı artmaz.

**PR kanıtı:** [#40 main CI #43865416364](https://github.com/hilmiguner/vardiyum/actions/runs/43865416364) 333/333 SUCCESS. [#41](https://github.com/hilmiguner/vardiyum/pull/41) rutin ilk kurulum + schedule/routine DB error gate + retry (5 yeni regresyon). **PR OPEN/CI ve merge ayrı kontrol edilir**.
