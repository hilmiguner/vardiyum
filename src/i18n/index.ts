import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

const i18n = createInstance();

const resources = {
  tr: {
    translation: {
      today: 'Bugün',
      todayEarningsTitle: 'Bu maaş döneminin tahmini kazancı',
      todayEarningsCalendarPeriod: 'Takvim ayı: {{from}} – {{to}}',
      todayEarningsCustomPeriod: 'Özel maaş dönemi: {{from}} – {{to}}',
      todayEarningsNeedsProfile:
        'Bu dönem için ücret profili bulunamadı. Kazanç ekranından bir profil oluştur.',
      todayEarningsNoEntries:
        'Bu dönem için henüz hesaplanabilecek gerçek çalışma veya ek kalem kaydı yok.',
      todayEarningsBlocked:
        'Tutar gösterilemiyor: mevcut ücret veya çalışma kayıtları açık doğrulama gerektiriyor. Kazanç ekranından incele.',
      todayEarningsError:
        'Tahmin şu anda okunamadı. Yanlış bir tutar göstermek yerine yeniden dene.',
      todayEarningsFixedAssumption:
        'Aylık sabit ana ücret, kaydettiğin tam ay tutarı üzerinden gösterilir; gerçekleşen çalışma süresiyle oranlanmaz.',
      todayEarningsDisclaimer:
        'Yalnız kullanıcı beyanına dayalı vergi öncesi tahmin. Resmî bordro veya net maaş değildir. Takvim ayı ve özel dönem tutarlarını toplama.',
      todayEarningsViewDetails: 'Kazanç ayrıntılarını aç',
      calendar: 'Takvim',
      routines: 'Rutinler',
      earnings: 'Kazanç',
      settings: 'Ayarlar',
      earnTwoFixedOtTitle: 'Sabit ücret değişimi: fazla mesai politikası',
      earnTwoFixedOtExplanation:
        'Bu özel maaş dönemindeki iki SABİT ücret kaynağı için fazla mesaiyi ayrı onayla. Dahil edersen birinci dilimdeki kaydedilmiş çalışmanın ikinci dilimin kendi eşiğine sayılıp sayılmayacağını açıkça seç. Bu bir hesaplama, hukuki sınır veya bordro değildir.',
      earnTwoFixedOtRequiresBase:
        'Önce her iki sabit ücret dilimi için güncel ve onaylı ANA ücret tutarlarını kaydet.',
      earnTwoFixedOtBlocked:
        'Fazla mesai politikası için iki güvenilir sabit ücret profili gereklidir.',
      earnTwoFixedOtBaseSource:
        'Kaynak ANA ücret toplamı: {{base}} · değişmez beyan revizyonu {{revision}}',
      earnTwoFixedOtProfile:
        '{{index}}. profil {{id}} · sürüm {{revision}} · fazla mesai eşiği {{minutes}} dakika · saatlik ek mesai {{rate}} · çarpan {{numerator}}/{{denominator}}',
      earnTwoFixedOtUnconfigured: 'tanımlanmamış',
      earnTwoFixedOtStale:
        'Önceki fazla mesai kararı ANA ücret kaynağı, profil veya saat dilimi değiştiğinden geçersiz. Yeniden açık seçim yap.',
      earnTwoFixedOtCurrent:
        'Kaydedilmiş fazla mesai kararı: {{decision}} · sayaç {{mode}} · revizyon {{revision}}',
      earnTwoFixedOtNoMode: 'uygulanmaz',
      earnTwoFixedOtMissing:
        'Henüz açık fazla mesai onayı yok. Otomatik dahil etme veya hesaplama yapılmaz.',
      earnTwoFixedOtDecisionLabel:
        'Bu özel maaş döneminde kaydedilmiş fazla mesai hesabına ilişkin kararın',
      earnTwoFixedOtExclude: 'Bu dönemde fazla mesaiyi dahil ETME',
      earnTwoFixedOtInclude: 'Kaydedilmiş fazla mesaiyi dahil etmeye onay ver',
      earnTwoFixedOtNeedRates:
        'Dahil etme için iki profilin de fazla mesai eşiği ve saatlik ek mesai ücreti tanımlanmış olmalı.',
      earnTwoFixedOtThresholdLabel:
        'İkinci ücret profiline geçince fazla mesai eşik sayacı nasıl çalışsın?',
      earnTwoFixedOtCarry:
        'Sayaç DEVAM ETSİN: ilk dilimdeki çalışma ikinci profilin eşiğine sayılsın',
      earnTwoFixedOtReset: 'Sayaç SIFIRLANSIN: ikinci dilim yeni eşikten başlasın',
      earnTwoFixedOtReason: 'Bu kararın gerekçesi (3–160 karakter)',
      earnTwoFixedOtReasonPlaceholder: 'Örn. iş sözleşmemdeki fazla mesai uygulaması',
      earnTwoFixedOtSave: 'Kaynaklara bağlı fazla mesai politikasını kaydet',
      earnTwoFixedOtSaved: 'Fazla mesai kararın ve eşik politikası sürümlü kaydedildi.',
      earnTwoFixedOtSaveFailed: 'Fazla mesai politikası kaydedilemedi',
      earnTwoFixedOtNoPayYet:
        'UYARI: Bu bir karar kaydıdır; sistem henüz iki profilli fazla mesaiyi HESAPLAMIYOR. Kaynak gerçek çalışma ve molalar sonraki geliştirmede denetlenene kadar birleşik özel dönem tahmini ve CSV/JSON bu senaryoda ENGELLİDİR. Resmî ücret/bordro değildir.',
      earnFixedTransitionTitle: 'Sabit maaş değişimi: iki kaynaklı ANA ücret beyanı',
      earnFixedTransitionExplanation:
        'Özel dönem içinde 1. günde sabit aylık ücret profilin değişirse eski ve yeni kaynak için ayrı net ANA tutarı SEN girersin. Her tutar 0 ile kendi kaynak tam sabit ana ücreti arasında olmalı; otomatik gün/saat oranlaması yok. Kaydedilen tutarlar tam maaş/mesai tahmini değildir.',
      earnFixedTransitionPeriod:
        'Dönem {{start}} – {{end}} · kaydedilmiş program saat dilimi {{zone}}',
      earnFixedTransitionBlocked:
        'Bu geçiş iki sabit maaş profili ve aynı para birimi olarak doğrulanamadı. Karma sabit/saatlik ve farklı para birimi desteklenmiyor.',
      earnFixedTransitionStale:
        'Önceki beyan ücret profili veya saat dilimi değiştiğinden GEÇERSİZ. Tutar gösterilmez; yeni açık karar kaydet.',
      earnFixedTransitionSegment: '{{index}}. kaynak dilimi: {{start}} – {{end}}',
      earnFixedTransitionProfile:
        'Profil {{id}} · kaynak sürümü {{revision}} · tam aylık ANA ücret {{amount}}',
      earnFixedTransitionPreviouslyDeclared: 'Önceki kayıtlı dilim beyanı: {{amount}}',
      earnFixedTransitionInput: '{{index}}. dilim için beyan ettiğin ANA ücret ({{currency}})',
      earnFixedTransitionDeclaredTotal:
        'İki dilimin beyan edilmiş sadece ANA ücret toplamı: {{amount}} · onay sürümü {{revision}}',
      earnFixedTransitionNeedsDecision:
        'Henüz geçerli beyan yok. Toplam üretilmez; iki dilim için ayrı tutar ve gerekçe gir.',
      earnFixedTransitionReason:
        'İki ücret tutarını bu şekilde belirleme gerekçen (3–160 karakter)',
      earnFixedTransitionReasonPlaceholder: 'Örn. sözleşmede belirtilen ara dönem ana ücreti',
      earnFixedTransitionSave: 'İki ANA ücret beyanını kaydet',
      earnFixedTransitionSaved: 'Kaynaklara bağlı ANA ücret beyanı kaydedildi.',
      earnFixedTransitionSaveFailed: 'ANA ücret geçişi beyanı kaydedilemedi',
      earnFixedTransitionNotPayslip:
        'Bu yalnız kullanıcıya ait iki ayrı sabit ücret ANA tutarı beyanıdır. Gerçek çalışma, fazla mesai, prim/kesinti/düzeltme, vergi/SGK/net ve resmî bordro içermez. Tam özel dönem birleşik tahmini, geçiş mesai politikası onaylanana kadar ENGELLİDİR.',
      earnCustomExportHeading: 'Özel dönem raporu: CSV/JSON',
      earnCustomExportHint:
        'Yalnız güncel doğrulanmış birleşik tutar paylaşılabilir. Dosya kaynak çalışma kimlikleri, gerçek UTC giriş/çıkış ve saat dilimi, profil/audit sürümleri, prim/kesinti notları ve kesin kuruşları içerir. Gizli finansal veri; şifreli yedek değildir, otomatik aktarım YOK.',
      earnCustomExportCsv: 'Özel dönem CSV dosyasını paylaş',
      earnCustomExportJson: 'Özel dönem JSON dosyasını paylaş',
      earnCustomExportPrivacyTitle: 'Özel dönem finansal dosyasını dışarı paylaş?',
      earnCustomExportPrivacyBody:
        'Dönem: {{from}} – {{to}}\nTahmini toplam: {{total}}\nÇalışma kalemi: {{work}} · ek kalem: {{adjustments}}\nDosya tüm kaynak kimlikleri, saatleri, ücretleri ve notları içerir. Seçtiğin uygulama bunları görebilir. Takvim ayı raporuyla toplama. Bu resmî bordro değildir. Onaydan sonra kaynaklar yeniden okunur; değişmişse paylaşım iptal edilir.',
      earnCustomExportConfirm: 'Dosyayı paylaş',
      earnCustomExportFailed: 'Özel dönem raporu paylaşılamadı',
      earnCombinedTitle: 'Özel maaş dönemi: birleşik kazanç tahmini',
      earnCombinedExplanation:
        'Yalnız doğrulanmış gerçek saatlik çalışma YA DA kullanıcı tarafından seçilmiş sabit ücret ile ayrı onaylı fazla mesai ve açıkça döneme atanmış prim/kesinti/düzeltme birleştirilir. Belirsiz kaynak, farklı para birimi veya geçersiz revizyon varsa toplam gösterilmez.',
      earnCombinedBlocked:
        'Kaynaklar doğrulanamadığı için birleşik özel dönem tutarı gösterilemiyor.',
      earnCombinedPeriod:
        'Özel dönem: {{from}} – {{to}} · başlangıç günü {{day}} · saat dilimi {{zone}}',
      earnCombinedModel: 'Kazanç modeli: {{mode}}',
      earnCombinedHourly: 'Kaydedilmiş gerçek saatlik çalışma',
      earnCombinedFixed: 'Kullanıcının seçtiği sabit ana tutar',
      earnCombinedTotalLabel: 'Kullanıcı bildirimli, VERGİ ÖNCESİ birleşik tahmini tutar:',
      earnCombinedBase: 'Seçilen sabit ANA ücret: {{amount}}',
      earnCombinedRegular: 'Saatlik normal gerçek çalışma: {{amount}}',
      earnCombinedOvertime: 'Kaydedilmiş eşik üstü fazla mesai: {{amount}}',
      earnCombinedAdjustment: 'Döneme açıkça atanmış ek kalemler (işaretli): {{amount}}',
      earnCombinedTrace:
        'Sabit ücret beyanı {{baseRev}} · mesai onayı {{otRev}} ({{otPolicy}}) · doğrulanmış net süre {{netSeconds}} sn · fazla mesai {{overtimeSeconds}} sn',
      earnCombinedProfileSources: 'Ücret profili kaynakları',
      earnCombinedProfile: 'Profil {{id}} · değişmez kaynak sürümü {{revision}}',
      earnCombinedWorkSources: 'Gerçek çalışma kaynakları',
      earnCombinedWork_hourly_regular: 'Saatlik normal süre',
      earnCombinedWork_hourly_overtime: 'Saatlik ek mesai',
      earnCombinedWork_fixed_overtime: 'Sabit maaşa ek mesai',
      earnCombinedWorkLine:
        '{{kind}} · kayıt {{id}} · {{seconds}} sn · {{amount}} · profil {{profile}}/v{{revision}} · dönem mola beyanı {{audit}} · oran mola beyanı {{rateAudit}}',
      earnCombinedWorkOrigin: 'Orijinal UTC kaynak: {{from}} – {{to}}',
      earnCombinedNoWorkRows:
        'Bu birleşik modelde ek ücretlendirilen gerçek çalışma kalemi yok.',
      earnCombinedAdjustmentSources: 'Prim, kesinti, düzeltme kaynakları',
      earnCombinedAdjustmentLine:
        '{{kind}} · kaynak {{id}} ({{month}}) · dönem payı {{amount}} · kaynak toplam {{sourceAmount}} · atıf sürümü {{revision}}',
      earnCombinedAdjustmentPeriodSplit:
        'İlk dönem {{earlier}}: {{earlierAmount}} · sonraki {{later}}: {{laterAmount}}',
      earnCombinedAuditReason: 'Atıf gerekçesi: {{reason}} · {{recordedAt}}',
      earnCombinedNoAdjustmentRows: 'Bu özel döneme atanmış ek kazanç/kesinti kaydı yok.',
      earnCombinedNotPayslip:
        'Bu tutar kullanıcı girdilerine dayalı, vergi öncesi yaklaşık tahmindir; resmî bordro, işveren onayı, net maaş, vergi/SGK veya yasal mesai alacağı DEĞİLDİR. Birleştirme yalnız BU özel dönem içindir. Takvim ayı raporu aynı kaynakları da içerir; aylık ve özel dönem tutarlarını birbirine EKLEME. Özel dönem CSV/JSON yalnız açık kullanıcı onayıyla paylaşılır.',
      earnAttribTitle: 'Özel maaş dönemi: prim, kesinti ve düzeltme atfı',
      earnAttribExplanation:
        'Takvim ayına kayıtlı her prim, kesinti veya düzeltmeyi hangi özel maaş dönemine ait olduğunu SEN belirleyerek ayır. İlk dönem tutarını tam kuruş olarak yaz; kalan tutar otomatik olarak ikinci döneme aktarılır. Gün sayısına göre bölme yapılmaz ve aynı kaynak iki kez sayılmaz.',
      earnAttribPeriod: 'Seçilen maaş dönemi: {{start}} – {{end}}',
      earnAttribEmpty:
        'Bu özel maaş dönemini ilgilendiren takvim aylık prim, kesinti veya düzeltme yok.',
      earnAttribPending:
        '{{count}} kaynak için kullanıcı beyanı eksik veya kaynak değişmiş. Güvenilir dönem toplamı gösterilmez.',
      earnAttribVerified:
        'Açıkça atanmış prim/kesinti/düzeltme toplamları (para birimleri ayrı):',
      earnAttribSource: '{{kind}} · kaynak tutarı {{amount}}',
      earnAttribKind_bonus: 'Prim',
      earnAttribKind_deduction: 'Kesinti',
      earnAttribKind_correction: 'Düzeltme',
      earnAttribPeriods: 'Kaynağın iki olası özel dönemi: {{earlier}} ve {{later}}',
      earnAttribSavedAmounts:
        'Önceki dönem {{earlier}} · sonraki dönem {{later}} · seçili dönemde {{current}}',
      earnAttribEarlierAmount:
        '{{period}} başlangıçlı ilk özel döneme ayırdığın tutar ({{currency}})',
      earnAttribRemainder:
        '{{period}} başlangıçlı ikinci özel döneme kalan tutar kendiliğinden atanır. Kesinti veya negatif düzeltme için pozitif büyüklük de girebilirsin; uygulama kaynak kaydın eksi işaretini korur.',
      earnAttribReason: 'Atıf veya düzeltme nedeni (3–160 karakter)',
      earnAttribReasonPlaceholder:
        'Örneğin: Kasım priminin hangi maaş dönemine ait olduğunu doğruladım',
      earnAttribRevision: 'Kaynağın atıf revizyonu: {{revision}}',
      earnAttribSave: 'İki dönem arasındaki atfı sürümlü kaydet',
      earnAttribSaved:
        'Atıf kaydedildi; her iki maaş döneminde aynı kaynak bölüşümü kullanılacak.',
      earnAttribInvalid: 'Atıf geçersiz veya kayıt sürümü eskimiş',
      earnAttribStale:
        'Takvim aylık kaynak kaydı değişmiş. Önceki atıf kullanılamaz; veri tutarlılığını kontrol et.',
      earnAttribSeparate:
        'Bu toplam yalnız açıkça atanan takvim aylık ek kalemlerdir. Mevcut aylık rapor da aynı orijinal kaynakları gösterir; aylık ve özel dönem raporlarını BİRBİRİNE EKLEME. Sabit/saatlik ana kazanca henüz eklenmez. Vergi öncesi kullanıcı bildirimidir, resmi bordro değildir.',
      earnFixedOtTitle: 'Özel dönem: sabit ücrete ek kayıtlı fazla mesai',
      earnFixedOtExplanation:
        'Önce sabit ücret ana tutarını beyan et. Ardından ücret profilindeki kendi belirlediğin fazla mesai eşiğini, saatlik ek ücret ve çarpanı kullanarak yalnız kayıtlı gerçek çalışmanın eşik üzerindeki süresini hesaplamaya açıkça izin verebilirsin. Normal saatler sabit ücrete tekrar eklenmez.',
      earnFixedOtState_requires_base:
        'Önce sabit ücret ana tutarı beyanını kaydet veya güncelle.',
      earnFixedOtState_needs_configuration:
        'Sabit ücret profilinde kullanıcı tanımlı fazla mesai eşiği ve pozitif fazla mesai saatlik ücreti bulunmalı. Önce ücret profilini sürümlü düzenle.',
      earnFixedOtState_blocked:
        'Fazla mesai tahmini kaynak uyuşmazlığı veya dönemlik prim/kesinti nedeniyle engellendi.',
      earnFixedOtState_not_applicable: 'Bu dönem için geçerli değil.',
      earnFixedOtSource:
        'Sabit kaynak: {{id}} · profil sürümü {{revision}} · ana tutar beyanı {{baseRevision}} · seçilen ana tutar {{base}}',
      earnFixedOtRate:
        'Kendi seçtiğin eşik: {{threshold}} net dakika / özel dönem · fazla mesai saatlik {{rate}} × {{numerator}}/{{denominator}}',
      earnFixedOtStale:
        'Sabit ücret ana tutarı veya ücret profili değişti: eski fazla mesai onayı geçersiz. Yeni kararını açıkça kaydet.',
      earnFixedOtCombinedScope:
        'Yalnız seçilen sabit ana tutar + kayıtlı gerçek fazla mesai TAHMİNİ:',
      earnFixedOtSum: 'Sabit ana tutar {{base}} + ek fazla mesai {{overtime}}',
      earnFixedOtSeconds:
        'Kaydedilen net çalışma {{logged}} sn · eşiğe kadar {{regular}} sn (tekrar ücretlendirilmez) · ek fazla mesai {{overtime}} sn',
      earnFixedOtLine:
        'Gerçek çalışma {{work}} · ek fazla mesai {{seconds}} sn · {{amount}} · dönem molası beyanı {{audit}}',
      earnFixedOtExcluded:
        'Fazla mesaiyi bu özel döneme dahil etmemeyi açıkça seçtin. Birleşik tutar gösterilmez.',
      earnFixedOtNeedsConsent:
        'Bu dönem için fazla mesai ekleme onayı henüz verilmedi. Birleşik tutar gösterilmez.',
      earnFixedOtBlocked:
        'Kaynak çalışma veya sınır mola kayıtları güvenli biçimde doğrulanamadı. Birleşik tutar gösterilmez.',
      earnFixedOtSelection: 'Fazla mesaiyi eklemeyi açıkça seç',
      earnFixedOtInclude: 'Kayıtlı fazla mesaiyi ekle',
      earnFixedOtExclude: 'Bu dönemde ekleme',
      earnFixedOtReason: 'Bu onayın veya düzeltmenin nedeni (3–160 karakter)',
      earnFixedOtReasonPlaceholder: 'Örneğin: kayıtlı mesai eşiği ve oranını kendim onayladım',
      earnFixedOtRevision: 'Fazla mesai onayı revizyonu: {{revision}}',
      earnFixedOtSave: 'Fazla mesai kararını sürümlü kaydet',
      earnFixedOtSaved: 'Fazla mesai kararı sürümlü kaydedildi; tahmin yeniden hesaplanacak.',
      earnFixedOtInvalid: 'Fazla mesai kararı geçersiz veya eskimiş',
      earnFixedOtNotPayslip:
        'Yalnız kullanıcı bildirimi esaslı vergi öncesi tahmindir. Ücret profili eşiği yasal mesai sınırı değildir. Takvim bazlı prim, kesinti, düzeltme, SGK, vergi ve net maaş hariçtir; resmî bordro değildir. Gerçek çalışmalar sonradan değiştirilirse tutar güncellenir.',
      earnFixedTitle: 'Özel maaş dönemi: sabit ücret ana tutarı',
      earnFixedExplanation:
        'Bu bölüm yalnız sabit aylık ücretin özel dönem için kullanıcı tarafından açıkça seçilen ana tutarını gösterir. Takvim günleri veya kaydedilen çalışma süresi kullanılarak otomatik oranlama yapılmaz. İki ayrı maaş profili varsa tahmin durur.',
      earnFixedPeriod: 'Özel maaş dönemi: {{start}} – {{end}}',
      earnFixedProfile:
        'Ücret profili {{profile}} · sürüm {{revision}} · tam aylık kaynak {{amount}}',
      earnFixedSavedScope: 'Kullanıcının seçtiği, yalnız sabit ücret ANA TUTAR tahmini:',
      earnFixedSavedChoice: '{{mode}} · beyan revizyonu {{revision}}',
      earnFixedStale:
        'Ücret profili veya saat dilimi değişmiş. Önceki beyan bu kaynağa artık uymuyor; yeniden açık seçim yap.',
      earnFixedNeedsChoice:
        'Bu özel maaş dönemi için henüz bir ücret ana tutarı beyan edilmedi.',
      earnFixedSelection: 'Özel dönem için açık ücret ana tutarı kararı',
      earnFixedFull: 'Tam sabit ana tutar',
      earnFixedPartial: 'Eksik dönem: kendim tutar gireceğim',
      earnFixedAmount: 'Özel dönem için beyan ettiğin ana tutar ({{currency}})',
      earnFixedAmountHint:
        'En fazla mevcut tam kaynak ücretten küçük, sıfır veya pozitif kesin bir tutar gir. Otomatik gün/saat oranlaması yapılmaz.',
      earnFixedReason: 'Bu seçimi veya düzeltmeyi neden yaptın? (3–160 karakter)',
      earnFixedReasonPlaceholder: 'Örneğin: eksik dönem tutarımı bordrodan kontrol ettim',
      earnFixedRevision: 'Kayıtlı beyan revizyonu: {{revision}}',
      earnFixedSave: 'Sabit ücret ana tutarı beyanını kaydet',
      earnFixedSaved: 'Sabit ücret ana tutarı beyanı sürümlü olarak kaydedildi.',
      earnFixedInvalid: 'Sabit ücret seçimi geçersiz veya eskimiş',
      earnFixedBlocked: 'Özel dönem sabit ücret ana tutarı şu an hesaplanamaz.',
      earnFixedNotPayslip:
        'Bu yalnız kullanıcı beyanına dayalı VERGİ ÖNCESİ SABİT ÜCRET ANA TUTARIDIR. Fazla mesai, prim, kesinti, düzeltme, SGK, vergi ve net maaş dahil değildir; tam bordro veya ödeme taahhüdü değildir. Aylık düzeltmeler veya profil geçişi varsa tutar bloke edilir.',
      earnCustomHourlyTitle: 'Özel dönem: kaydedilmiş gerçek çalışma kazancı',
      earnRateBreakTitle: 'Ücret değişimi sınırındaki mola beyanı',
      earnDualBreakLineAudit: 'Maaş dönemi + ücret sınırı mola beyanı: revizyon {{revision}}',
      earnRateBreakLineAudit: 'Ücret değişimi mola beyanı: revizyon {{revision}}',
      earnDualBreakTitle: 'İki sınırı aşan vardiyada mola dağılımı',
      earnDualBreakExplanation:
        'Önce özel maaş dönemi sınırına düşen mola dakikalarını yukarıdaki bölümde beyan et. Bu bölümde yalnız aynı vardiyanın ücret değişimi anını da aşan parçasındaki molanın eski/yeni ücret tarafına dağılımını ayrıca gir. Her beyan ilk mola kaydının belirli sürümüne bağlıdır.',
      earnDualBreakNeedsFirst:
        '{{count}} vardiya için önce yukarıdaki özel dönem mola dağılımı kaydedilmeli. Bu yapılmadan ücret hesaplanmaz.',
      earnDualBreakNone:
        'Bu dönemde iki sınırı aşan, ayrıca mola beyanı gerektiren vardiya bulunamadı.',
      earnDualBreakContext:
        'Maaş dönemi: {{period}} · ücret değişimi: {{rate}} (UTC {{utc}}) · ilk beyan sürümü: {{audit}}',
      earnDualBreakAmounts:
        'Orijinal toplam mola: {{original}} dk · bu dönemdeki mola: {{portion}} dk · eski ücret tarafı en fazla {{before}} dk · yeni taraf en fazla {{after}} dk',
      earnDualBreakStale:
        'İlk mola beyanı değişti. Eski ikinci beyan geçersiz; yeni dağılımı tekrar kaydet.',
      earnDualBreakBefore: 'Bu maaş döneminde, ücret değişmeden önce kullanılan mola dakikası',
      earnDualBreakReason: 'Beyan veya düzeltme nedeni (3–160 karakter)',
      earnDualBreakReasonPlaceholder: 'Örneğin: iki sınır arasındaki mola konumunu doğruladım',
      earnDualBreakRevision: 'İkinci mola beyanı sürümü: {{revision}}',
      earnDualBreakSave: 'İki sınır mola beyanını sürümlü kaydet',
      earnDualBreakSaved: 'İki sınır beyanı kaydedildi; özel dönem kazanç tahmini yenilendi.',
      earnDualBreakInvalid: 'İki sınır beyanı geçersiz, çelişkili veya sürümü eski',
      earnDualBreakNotPayslip:
        'Mola dağılımı otomatik varsayılmaz. İki sınırı aşan vardiyalar ayrı sürümlü beyanla değerlendirilebilir. Her çalışma kendi UTC ve IANA saat dilimiyle fiyatlandırılır; bu resmi bordro değildir.',

      earnRateBreakExplanation:
        'Ayın 1’inde saatlik ücret değişirken iki ücret aralığını aşan gerçek çalışmanın molasını eski ve yeni orana açıkça dağıtabilirsin. Bu ayrı, kaynaklı ve sürümlü beyan yalnız özel dönem saatlik tahmininde kullanılır.',
      earnRateBreakNone:
        'Bu özel dönemde ayrı beyan gerektiren, ücret değişimini aşan molalı çalışma yok.',
      earnRateBreakCrossPeriodUnavailable:
        '{{count}} çalışma her iki sınırı da aşıyor. Bu vardiyalar için önce maaş dönemi, ardından yukarıdaki iki sınır mola beyanını tamamla; eksik beyanla ücret hesaplanmaz.',
      earnRateBreakMidnight: 'Ücret değişimi: {{date}} · UTC sınırı: {{utc}}',
      earnRateBreakTotal: 'Orijinal toplam mola: {{minutes}} dakika',
      earnRateBreakLimits:
        'Eski oran tarafının kapasitesi en fazla {{before}} dk; yeni oran tarafı en fazla {{after}} dk.',
      earnRateBreakBefore: 'Eski saatlik ücret tarafında kullanılan mola dakikası',
      earnRateBreakReason: 'Beyan veya düzeltme nedeni (3–160 karakter)',
      earnRateBreakReasonPlaceholder: 'Örnek: molamın ilk kısmı eski ücret saatindeydi',
      earnRateBreakRevision: 'Beyan sürümü: {{revision}} (0: kayıt yok)',
      earnRateBreakSave: 'Ücret geçişi mola dağılımını sürümlü kaydet',
      earnRateBreakSaved: 'Beyan sürümlü kaydedildi ve özel dönem tahmini güncellendi.',
      earnRateBreakInvalid: 'Ücret değişimi mola beyanı hatalı veya eskimiş',
      earnRateBreakNotPayslip:
        'Beyan edemediğin veya iki sınırı aynı anda aşan molalar otomatik dağıtılmaz. Bu hesap resmî bordro değildir; önceki beyanlar uygulama düzeyinde korunur.',

      earnCustomHourlyScope:
        'Kullanıcının kaydettiği gerçek saatlik çalışma üzerinden hesaplanır. Ücret değişiminde her iş parçasına kendi kayıtlı IANA saat dilimindeki geçerli oran uygulanır; dönemlik fazla mesai eşiği değişmeden kalmalıdır. Ücret geçişindeki molalar yalnız ayrı sürümlü beyanla dağıtılır; farklı para birimi/eşik veya aylık prim/kesinti varsa hesap durur. Sabit maaş, vergi, SGK ve net ücret dahil değildir.',
      earnCustomHourlyPeriod: 'Özel dönem: {{start}} – {{end}} (iki tarih dahil)',
      earnCustomHourlyTotals:
        'Kaydedilmiş net çalışma: {{minutes}} dakika · Döneme özel eşik üzeri: {{overtime}} dakika',
      earnCustomHourlyProfile: 'Ücret kaynağı: {{profile}} · revizyon {{revision}}',
      earnCustomHourlyMixedRates:
        'Bu özel dönemde {{count}} farklı saatlik ücret profili uygulandı. Dönemlik mesai eşiği tek kez işlendi.',
      earnCustomHourlyLineProfile:
        'Bu parçanın ücret kaynağı: {{profile}} · sürüm {{revision}}',
      earnCustomHourlySources: 'Kaynaklara göre hesaplanan çalışma',
      earnCustomHourlyKind_regular: 'Normal saatlik çalışma',
      earnCustomHourlyKind_overtime: 'Dönemlik eşik üzeri saatlik çalışma',
      earnCustomHourlyLine:
        'Gerçek çalışma {{work}} · {{seconds}} saniye · Bu parçanın molası {{breakMinutes}} dk · Mola beyanı sürümü {{revision}}',
      earnCustomHourlyOriginal: 'Orijinal çalışma UTC: {{start}} → {{end}}',
      earnCustomHourlyStatus_blocked:
        'Özel dönem hesabı engellendi: profil/mola/çalışma veya ay bazlı düzeltme henüz güvenli değil.',
      earnCustomHourlyStatus_needs_profile:
        'Özel dönemin ilk gününde geçerli bir saatlik ücret profili gerekli.',
      earnCustomHourlyStatus_no_work: 'Bu özel dönemde kaydedilmiş gerçek çalışma bulunamadı.',
      earnCustomHourlyStatus_disabled: 'Başlangıç günü 1: mevcut takvim ayı raporu kullanılır.',
      earnCustomHourlyNotPayslip:
        'Bu rakam kullanıcı beyanına dayalı, vergi öncesi yalnız çalışma ücretinin tahminidir; tam maaş, bordro ya da ödeme taahhüdü değildir. Ay bazlı prim/kesinti/düzeltme varsa tutar gösterilmez. Özel dönem CSV/JSON aktarımı henüz etkin değildir.',
      earnCustomProfileTitle: 'Özel dönem ücret profili kontrolü',
      earnCustomProfileExplanation:
        'Seçtiğin maaş dönemi iki takvim ayını kapsıyorsa ayın 1’inde yeni bir ücret profili başlayabilir. Geçerli profil sürümleri tarih tarih gösterilir; oranlar sessizce birleştirilmez.',
      earnCustomProfilePeriod: 'Özel maaş dönemi: {{start}} – {{end}} ({{zone}})',
      earnCustomProfileStatus_needs_profile:
        'Bu dönemin başlangıcında geçerli ücret profili bulunamadı. Tahmin bloke.',
      earnCustomProfileStatus_single_hourly_profile:
        'Dönem boyunca tek saatlik ücret profili geçerli. Bu bir hesaplama veya ödeme onayı değildir.',
      earnCustomProfileStatus_fixed_salary_assumption_required:
        'Sabit ücret: tam/eksik özel dönem ödeme varsayımı seçilmeden tahmin yapılamaz.',
      earnCustomProfileStatus_profile_transition_review_required:
        'Ücret profili dönem içinde değişiyor. İki saatlik ücret aynı para birimi ve fazla mesai eşiğini kullanıyorsa çalışma parçaları farklı oranlarla hesaplanabilir; belirsiz molalar ve farklı eşikler engellenir.',
      earnCustomProfileSource:
        'Kaynak profil: {{id}} · sürüm {{revision}} · geçerlilik {{effective}}',
      earnCustomProfileModel: '{{model}} · kayıtlı tutar: {{amount}}',
      earnCustomProfileUtc: 'Saat dilimi karşılığı UTC: {{start}} → {{end}} (bitiş hariç)',
      earnCustomProfileZoneWarning:
        'Bu gösterim vardiya planının saat dilimini kullanır. Gerçek çalışma ücreti hesaplanırken her kaydın kendi IANA saat dilimi ve UTC anları esas alınmalıdır.',
      earnCustomProfileNotApplied:
        'Önemli: Bu panel yalnızca ücret profili geçişini gözden geçirir. Mevcut aylık Kazanç tutarı, mola dağılımları, primler ve CSV/JSON burada gösterilen özel döneme göre yeniden hesaplanmaz.',
      earnCustomBreakTitle: 'Özel dönem mola dağılımı (hazırlık)',
      earnCustomBreakExplanation:
        '26–25 gibi seçtiğin dönemin sınırını aşan, mola içeren gerçek çalışma kayıtlarını ayrı beyan edebilirsin. Bu kayıtlar mevcut aylık kazanç hesabına otomatik eklenmez.',
      earnCustomBreakSelectedPeriod:
        'Özel dönem: başlangıç günü {{day}} · başlangıç ayı {{period}}',
      earnCustomBreakNone: 'Bu özel dönem için sınırı aşan molalı çalışma bulunamadı.',
      earnCustomBreakTotal: 'Kaydedilmiş toplam mola: {{minutes}} dakika',
      earnCustomBreakFirst: '{{period}} özel döneminin ilk parçasına düşen mola dakikası',
      earnCustomBreakReason: 'Beyan veya düzeltme nedeni (3–160 karakter)',
      earnCustomBreakReasonPlaceholder: 'Örneğin: mola süresini düzelttim',
      earnCustomBreakRevision: 'Kayıtlı sürüm: {{revision}} (0: henüz beyan yok)',
      earnCustomBreakSave: 'Özel dönem mola dağılımını kaydet',
      earnCustomBreakSaved:
        'Mola dağılımı sürümlü olarak kaydedildi. Önceki düzeltmeler korunuyor.',
      earnCustomBreakInvalid: 'Özel dönem mola kaydı geçersiz veya güncel değil',
      earnCustomBreakNotEnabled:
        'Henüz Kazanç raporu, ücret profilleri veya CSV/JSON bu özel dönem beyanını kullanmaz. Hesaplama ve eski aylık mola geçmişi değişmez.',
      payPeriodPreferenceTitle: 'Maaş dönemi başlangıcı (hazırlık)',
      payPeriodPreferenceExplanation:
        'Maaş dönemin ayın 1’i dışında başlayabilir. Başlangıç günü takvim ayı raporunu değiştirmez; doğrulanmış özel dönem tahminleri ayrı görüntülenir.',
      payPeriodPreferenceStartDay: 'Dönem başlangıç günü (1–28)',
      payPeriodPreferenceHint:
        'Örneğin 26 seçilirse dönem ayın 26’sında başlar ve sonraki ayın 25’inde biter. 29–31 Şubat ayı nedeniyle bu sürümde desteklenmiyor.',
      payPeriodPreferenceInvalid: '1–28 arasında bir tam gün seç.',
      payPeriodPreviewDates: 'Örnek mevcut dönem: {{start}} – {{end}} ({{zone}})',
      payPeriodPreviewUnavailable: 'Bu saat diliminde dönem önizlemesi oluşturulamadı.',
      payPeriodPreferenceSave: 'Maaş dönemi tercihini kaydet',
      payPeriodPreferenceSaved: 'Maaş dönemi başlangıç tercihi cihazda kaydedildi.',
      payPeriodPreferenceError: 'Maaş dönemi tercihi okunamadı veya kaydedilemedi',
      payPeriodPreferenceNotEnabled:
        'Takvim ayı raporu korunur. 2–28 seçersen özel dönem tahmini desteklenen ücret ve mola kaynakları doğrulanınca ayrıca gösterilir. Desteklenmeyen profil geçişlerinde tutar gösterilmez.',
      greeting: 'Bugünkü planın',
      nextShift: 'Sonraki gün',
      shiftToday: 'Bugünkü vardiya',
      configure: 'Vardiya düzenini oluştur',
      configureDescription: 'Kendi vardiya döngünü tanımlayarak takvimini kullanmaya başla.',
      date: 'Tarih',
      day: 'Gün',
      shift: 'Vardiya',
      off: 'İzin',
      morning: 'Sabah',
      evening: 'Akşam',
      night: 'Gece',
      noPattern: 'Henüz bir vardiya düzenin yok.',
      anchorDate: 'Döngü başlangıç tarihi (YYYY-AA-GG)',
      cycle: 'Vardiya döngüsü',
      addDay: 'Gün ekle',
      removeDay: 'Son günü sil',
      save: 'Kaydet',
      saved: 'Vardiya düzeni kaydedildi.',
      example: '8 günlük örnek döngüyü yükle',
      exampleHint: 'Örnek için başlangıç bugündür.',
      invalidDate: 'Geçerli bir tarih ve en az bir döngü günü gir.',
      loading: 'Yerel veriler yükleniyor…',
      databaseError: 'Yerel veriler açılamadı.',
      retry: 'Yeniden dene',
      upcoming: 'Önümüzdeki 14 gün',
      noRoutines: 'Henüz rutin kuralı bulunmuyor.',
      reminderGlobalTitle: 'Yerel rutin hatırlatmaları',
      reminderGlobalExplanation:
        'Rutinlerinde isteğe bağlı saat belirleyebilirsin. Bildirim izni yalnızca Etkinleştir düğmesine dokunduğunda istenir; internet veya hesap gerekmez.',
      reminderPermissionOn: 'Bildirimler etkin. Yaklaşan görevler cihazda planlanır.',
      reminderPermissionOff: 'Bildirimler kapalı; görevler yine çalışır.',
      reminderPermissionDenied:
        'Bildirim izni yok veya kısıtlı. Cihaz ayarlarında izin verebilirsin; görevler etkilenmez.',
      enableReminders: 'Bildirimleri etkinleştir',
      disableReminders: 'Bildirimleri kapat',
      reminderBestEffort:
        'Önümüzdeki 14 gün için en fazla 48 hatırlatma planlanır (günde en fazla 6). İşletim sistemi teslim zamanını geciktirebilir; kesin alarm değildir.',
      reminderTimeTitle: 'Hatırlatma saati (SS:DD, isteğe bağlı)',
      reminderTimeHint:
        'Boş bırakılırsa bildirim yok. Saat {{timeZone}} bölgesine göre yorumlanır; yaz/kış saati geçişindeki belirsiz saatler atlanır.',
      routinePageSubtitle: 'Vardiyana ve gününe göre otomatik görev listeleri',
      dailyRoutineTitle: '{{date}} · Görevler',
      routineProgress: '{{done}} / {{total}} tamamlandı',
      noTasksToday: 'Bu gün için etkin görev yok.',
      routineError: 'Rutin verileri güncellenemedi',
      routineHistory: 'Tamamlama geçmişi',
      noRoutineHistory: 'Bu tarihte henüz görev hareketi yok.',
      historyIsPreserved: 'Rutin adı değişse veya arşivlense de işlem geçmişi korunur.',
      wasCompleted: 'Tamamlandı',
      wasUndone: 'Geri alındı',
      viewRoutineDate: 'Gün seç (YYYY-AA-GG)',
      showDate: 'Günü göster',
      manageRoutineRules: 'Rutin kurallarını yönet',
      noRoutineRules: 'Henüz rutin kuralı oluşturulmadı.',
      addRoutine: 'Yeni rutin oluştur',
      newRoutine: 'Yeni rutin',
      editRoutine: 'Rutini düzenle',
      routineTitle: 'Rutin / görev adı',
      routineInvalid: 'Rutin kuralı geçersiz',
      routineRuleSemantics: 'Gruplar arasında VE, aynı gruptaki seçeneklerde VEYA uygulanır.',
      routineShiftFilter: 'Vardiya türleri',
      routineWeekdayFilter: 'Haftanın günleri',
      routineCycleFilter: 'Döngü günü numaraları',
      routineCycleHint:
        '1–{{length}} arasında numaraları virgülle ayır. Boşsa tüm döngü günleri.',
      routineCycleExample: 'Örnek: 1,3,8',
      routineEmptyAny: 'Seçim yapılmazsa tümü geçerli.',
      routineRestOnly: 'Yalnızca izin / dinlenme günleri',
      routineEnabled: 'Rutin etkin',
      saveRoutine: 'Rutini kaydet',
      routineActive: 'Etkin',
      routineDisabled: 'Devre dışı',
      toggleRoutine: 'Etkin / devre dışı yap',
      archiveRoutine: 'Arşivle',
      routineArchiveWarning: 'Rutin gizlenir; geçmiş tamamlanmalar silinmez.',
      archivedRoutines: 'Arşivlenen rutinler',
      restoreRoutine: 'Arşivden çıkar (devre dışı)',
      noEarnings: 'Henüz kazanç verisi yok.',
      backupRestoreTitle: 'Temiz kurulumda geri yükle (deneysel)',
      backupRestoreLimitedWarning:
        'Geri yükleme yalnızca hiç değiştirilmemiş, dört varsayılan vardiya şablonuna sahip BOŞ uygulamada kullanılabilir. Mevcut kayıt varsa işlem reddedilir. Android/iOS gerçek cihaz kabul testleri henüz yapılmadı.',
      backupRestoreNotice:
        'ÖNEMLİ: Bu özellik yeni ve gerçek telefonda henüz doğrulanmadı. Yedek dosyanı ve anahtarını güvenle sakla. Sadece tamamen yeni/boş kurulumda geri yükleme yapılır; mevcut verilere birleştirme veya üzerine yazma YOK. Yedekten gelen bildirim izni yeniden onaylanmalıdır. Onay için RESTORE yaz.',
      backupRestoreTypeToConfirm: 'Onaylamak için RESTORE yaz',
      backupRestoreConfirmTitle: 'Geri yüklemeyi kesin olarak onaylıyor musun?',
      backupRestoreConfirmBody:
        'Yalnızca dört varsayılan vardiya şablonu bulunan temiz veritabanında işlem yapılır. Tüm kayıtlar tek işlemde yüklenecek, bir hata olursa geri alınacaktır. Dolu/özelleştirilmiş veritabanı reddedilir. Yedek dosyanı silme.',
      backupRestoreConfirmAction: 'Temiz kuruluma geri yükle',
      backupRestoreSuccess: 'Geri yükleme işlemi tamamlandı',
      backupRestoreRows:
        '{{count}} kayıt aktarıldı. Bildirimler güvenlik için kapatıldı; yeniden açık onay vermelisin. Gerçek cihaz kabulü henüz yapılmadı.',
      backupRestoreRejected: 'Geri yükleme reddedildi. Mevcut veriler korunuyor.',
      backupTitle: 'Şifreli yerel yedek (ilk sürüm)',
      backupDescription:
        'Uygulamanın mevcut SQLite v8 kayıtlarını yeni, rastgele üretilmiş AES-256-GCM anahtarıyla şifreler. Dosya yalnızca sen paylaşmayı seçersen uygulama dışına çıkar. Anahtar dosyanın içinde değildir.',
      backupCreate: 'Yeni şifreli yedek oluştur',
      backupRecoveryWarning:
        'UYARI: Bu 64 karakterlik kurtarma anahtarını yedek dosyasından AYRI ve güvenli bir yerde sakla. Kaybolursa bu yedeği açamayız. Anahtarı sohbetlere veya başkalarına gönderme.',
      backupRecoveryKey: 'Yedek kurtarma anahtarı (gizli)',
      backupKeySaved: 'Kurtarma anahtarını ayrı bir yere kaydettim.',
      backupShare: 'Şifreli yedek dosyasını paylaş',
      backupHideKey: 'Anahtarı ekrandan gizle',
      backupError: 'Yedek oluşturulamadı',
      backupShareError: 'Şifreli yedek paylaşılamadı',
      backupVerifyTitle: 'Yedek seç ve doğrula (yalnızca önizleme)',
      backupPreviewOnlyWarning:
        'Yedeği seçip anahtarı girerek şifre çözümünü, veri bütünlüğünü, tablo şemasını ve satır sayılarını kontrol edebilirsin. Bu aşamada hiçbir veri içeri alınmaz veya mevcut SQLite kayıtları değiştirilmez.',
      backupSelectFile: 'Şifreli .vdb dosyasını seç',
      backupSelected: 'Şifreli dosya seçildi. Kurtarma anahtarını gir.',
      backupEnterKey: '64 karakterlik kurtarma anahtarı',
      backupVerify: 'Anahtarla doğrula ve önizle',
      backupInvalidFile: 'Yedek dosyası kabul edilmedi',
      backupVerifyError: 'Yedek doğrulanamadı; anahtar, bütünlük veya sürüm uyuşmuyor',
      backupVerified: 'Yedek doğrulandı',
      backupPreviewCreated: 'Oluşturulma anı: {{date}}',
      backupPreviewRows: 'Toplam {{count}} satır, {{tables}} tablo',
      backupNoRestore:
        'DOĞRULAMA TAMAMLANDI. Geri yükleme/var olan verileri değiştirme işlevi henüz etkin değil. Lütfen dosya ve anahtarı güvenle sakla.',
      earnCorrectProfile: 'Mevcut ücret profilini düzelt',
      earnHideCorrection: 'Düzeltme formunu gizle',
      earnCorrectionWarning:
        'Bu değişiklik aynı geçerlilik ayı için YENİ ve silinemez bir sürüm oluşturur. Önceki ücret profili korunur. Güncel rapor yeni sürümle yeniden hesaplanır; geçmiş rapor görüntüleri otomatik arşivlenmiş sayılmaz.',
      earnRevisionReason: 'Düzeltme nedeni (zorunlu, 3–160 karakter)',
      earnSaveRevision: 'Yeni profil sürümünü kaydet',
      earnRevisionSaved:
        'Yeni ücret profili sürümü kaydedildi. Eski sürüm ve gerekçesi korunuyor.',
      earnHistoryTitle: 'Ücret profili sürüm geçmişi',
      earnHistoryWarning:
        'Bir sürümü seçerek bugünkü çalışma ve düzeltme kayıtlarıyla önceki ücret parametrelerini yeniden hesaplayabilirsin. Bu, geçmişte görülen raporun birebir dondurulmuş kopyası değildir.',
      earnHistoryRow: 'v{{revision}} · {{rate}} · {{reason}}',
      earnOriginal: 'İlk kayıt',
      earnShowLatest: 'Güncel profil ile hesapla',
      earnPreviewRevision: 'v{{revision}} ile yeniden hesapla',
      earnHistoricalPreview:
        'Gösterilen tahmin eski ücret profili v{{revision}} ile GÜNCEL çalışma verilerinden yeniden hesaplanmıştır. Dondurulmuş tarihî bordro değildir.',
      earnSplitCount:
        '{{count}} çalışma kaydı, kayıtlı IANA saat diliminde ay sınırına göre bölündü.',
      earnBreakSplitTitle: 'Ay sınırını aşan mola dağılımı',
      earnBreakSplitExplanation:
        'İki aya yayılan çalışmanın toplam mola dakikasından başlangıç ayına düşeni gir. Kalan dakika sonraki aya ayrılır. Sistem mola zamanını tahmin etmez.',
      earnBreakTotal: 'Beyan edilen toplam mola: {{minutes}} dakika',
      earnBreakStartMonth: '{{month}} ayına düşen mola dakikası',
      earnSaveBreakSplit: 'Mola dağılımını kaydet',
      earnBreakInvalid:
        'Mola dağılımı geçersiz. Çalışma süresi ve her iki ayın mola dakikasını kontrol et.',
      earnBreakSaved: 'Mola dağılımı kaydedildi. Her iki ay aynı kararı kullanacak.',
      earnBreakAuditHint:
        'Dağılımı değiştirdiğinde önceki sürümün kayıt izi korunur. İşveren tarafından onaylı ücretli mola değildir.',
      earnExportHeading: 'Tahmini raporu paylaş',
      earnExportConsentHint:
        'Paylaşmadan önce bilgileri incele. Rapor çalışma kimliklerini, UTC zamanlarını, ücret profilini, kullanıcı notlarını ve tutarları içerir. Otomatik gönderilmez; şifreli yedek değildir.',
      earnShareCsv: 'CSV metnini paylaş',
      earnShareJson: 'JSON metnini paylaş',
      earnExportPrivacyTitle: 'Finansal bilgileri paylaş?',
      earnExportPrivacyBody:
        'Seçtiğin uygulama tahmini raporu, çalışma kimliklerini, notları ve finansal ayrıntıları alabilir. Sistem paylaşım ekranında hedef seçmeden Vardiyum veri göndermez.',
      earnExportConfirm: 'Paylaşım ekranını aç',
      earnExportFailed: 'Tahmini rapor paylaşılamadı',
      earnSubtitle: 'Kayıtlarına dayanan, açıklanabilir tahmini kazanç',
      earnChooseMonth: 'Hesaplanacak ay',
      earnMonth: 'Ay (YYYY-AA)',
      earnViewMonth: 'Ayı görüntüle',
      earnSafetyWarning:
        'Yalnızca kendi beyan ettiğin çalışma kayıtları kullanılır. Vergi, SGK, resmî bordro, sözleşme yorumu veya işveren onayı hesaplanmaz.',
      earnNewProfile: 'Yeni ücret profili ekle',
      earnHideProfileEditor: 'Profil formunu gizle',
      earnImmutableProfileHint:
        'Profiller geçerli oldukları ayın ilk gününden itibaren uygulanır. Mevcut profili değiştirmek yerine yeni bir ay için yeni profil ekle.',
      earnEffectiveFrom: 'Profil başlangıcı (YYYY-AA-01)',
      earnModel: 'Ücret modeli',
      earnModelHourly: 'Saatlik ücret',
      earnModelMonthly: 'Sabit aylık tutar',
      earnCurrency: 'Para birimi (iki ondalıklı)',
      earnHourlyRate: 'Bir saatlik ücret',
      earnMonthlyBase: 'Tam ay için sabit tutar',
      earnThresholdMinutes: 'Fazla mesai hangi süreden sonra başlasın? (dakika)'
      earnThresholdPlaceholder: 'Boşsa fazla mesai katsayısı uygulanmaz',
      earnThresholdWarning:
        'Örnek: 180 saat = 10.800 dakika. Yalnız kaydedilmiş gerçek çalışmanın bu sınırı aşan kısmı mesai sayılır; yasal sınır otomatik belirlenmez.',
      earnOvertimeHourlyRate: 'Aylık modele ek mesai saatlik ücreti',
      earnMultiplierNumerator: 'Katsayının üst sayısı',
      earnMultiplierDenominator: 'Katsayının alt sayısı',
      earnMultiplierHelp:
        'Katsayı = üst sayı ÷ alt sayı. 3 ÷ 2 = 1,5 kat; 2 ÷ 1 = 2 kat. Şimdilik aynı dönemde tek katsayı vardır; normal ve bayram mesaileri ayrı sınıflandırılmaz.',
      earnSaveProfile: 'Ücret profilini kaydet',
      earnProfileSaved: 'Ücret profili kaydedildi.',
      earnProfileError: 'Ücret profili kaydedilemedi',
      earnProfileVersionWarning:
        'Tarihsel profil kimliği ve geçerlilik ayı korunur. Aynı ay için iki profil açılamaz.',
      earnInvalidMonth: 'Geçerli bir ay gir (YYYY-AA).',
      earnNoProfile: 'Bu aya uygun ücret profili bulunamadı',
      earnNoProfileHint:
        'Hesaplamaya başlamak için ilgili ay veya önceki bir ayın ilk gününden geçerli ücret profili oluştur.',
      earnBlocked: 'Tahmini hesap durduruldu',
      earnBlockedExplanation:
        'Eksik, çakışan ya da dönem sınırını aşan çalışma/para kayıtları var. Yanlış toplam göstermek yerine önce kayıtları incelemelisin.',
      earnEstimatedTotal: 'Vergi öncesi tahmini toplam',
      earnProfileDescription:
        'Kaynak profil: {{id}} · sürüm {{revision}} · {{effectiveFrom}} · {{model}}',
      earnLoggedHours:
        'Kullanıcı beyanı: {{minutes}} çalışma dakikası; {{overtime}} fazla mesai dakikası (seçilen eşik varsa).',
      earnFullMonthAssumption:
        'Aylık sabit tutar tam ay içindir, eksik çalışma veya ayın bir kısmı için otomatik oranlanmaz.',
      earnNotPayslip:
        'Bu resmî bordro veya ödenecek net ücret değildir. Vergi, sigorta, işveren onayı ve hukuki uygunluk hesaplanmaz.',
      earnLineItems: 'Kalem kalem açıklama',
      earnLine_monthly_base: 'Sabit aylık tahmin',
      earnLine_hourly_regular: 'Saatlik normal çalışma',
      earnLine_hourly_overtime: 'Saatlik fazla mesai',
      earnLine_monthly_overtime: 'Aylığa ek fazla mesai',
      earnLine_logged_work: 'Beyan edilen çalışma (bilgi amaçlı)',
      earnLine_adjustment: 'Elle eklenen düzeltme',
      earnLineSource:
        'Kaynak: {{source}} · profil {{profile}} (v{{revision}}) · {{seconds}} saniye',
      earnNoWork: 'Bu dönem için çalışma veya düzeltme kaydı bulunmuyor.',
      earnAddAdjustment: 'Prim, kesinti veya manuel düzeltme',
      earnAdjustmentImmutable:
        'Her tutar ayrı kayıt olarak korunur; hatalı tutarı yeni bir ters düzeltmeyle dengele.',
      earnKind_bonus: 'Prim / ek ödeme',
      earnKind_deduction: 'Kesinti',
      earnKind_correction: 'Manuel düzeltme (+/−)',
      earnAmount: 'Tutar ({{currency}})',
      earnAdjustmentNote: 'Açıklama (zorunlu)',
      earnSaveAdjustment: 'Düzeltmeyi kaydet',
      earnAdjustmentSaved: 'Tutar kaydı eklendi.',
      earnAdjustmentError: 'Tutar kaydedilemedi',
      offline: 'Çevrimdışı çalışır · Hesap gerekmez',
      foundation: 'Vardiyum geliştirme sürümü',
      opening: 'Açılış',
      setupSubtitle: 'Döngü gününe dokunarak vardiya türünü değiştir.',
      scheduleZone: 'Takvim saat dilimi: {{zone}}',
      shiftTypes: 'Vardiya türleri ve saatleri',
      shiftTypesHint:
        'İsimleri, saatleri ve molaları düzenle; döngü günlerine dokunarak türleri değiştir.',
      shiftName: 'Vardiya adı',
      startTime: 'Başlangıç',
      endTime: 'Bitiş',
      breakMinutes: 'Mola (dk)',
      restDay: 'Çalışılmayan gün',
      addShift: 'Vardiya ekle',
      addRest: 'İzin ekle',
      deleteShiftType: 'Bu türü sil',
      deleteShiftTypeTitle: 'Vardiya türünü sil',
      deleteShiftTypeConfirm: '{{name}} silinsin mi? Bu işlem Kaydet ile uygulanır.',
      deleteShiftTypeInUse:
        'Bu tür önce döngü günlerinden ve tek günlük değişikliklerden kaldırılmalı.',
      deleteShiftTypeReferenced:
        'Bu vardiya türüne bağlı kayıtlı rutinler veya özel günler var. Önce bağlantıları kaldır.',
      deleteShiftTypeFailed: 'Vardiya türü silinemedi. Kayıtları kontrol et.',
      overnightHint:
        'Bitiş saati başlangıçtan önce veya aynıysa vardiya ertesi gün biter; aynı saat 24 saatlik vardiyadır.',
      customName: 'Yeni vardiya',
      restName: 'Yeni izin',
      invalidSchedule: 'Vardiya düzenini kontrol et.',
      editedDay: 'Bu gün için özel değişiklik var.',
      monthView: 'Aylık vardiya takvimi',
      mon: 'Pt',
      tue: 'Sa',
      wed: 'Ça',
      thu: 'Pe',
      fri: 'Cu',
      sat: 'Ct',
      sun: 'Pa',
      previousMonth: 'Önceki ay',
      nextMonth: 'Sonraki ay',
      changeDay: 'Bu günün vardiyasını değiştir',
      overrideHint: 'Yalnızca bu gün değişir; tekrar eden düzen etkilenmez.',
      dayNote: 'İsteğe bağlı açıklama',
      restoreCycle: 'Normal döngüye döndür',
      hoursAndMinutes: '{{hours}} sa {{minutes}} dk{{seconds}}',
      wallClockDuration: 'Planlanan saat aralığı: {{duration}}',
      actualElapsedTime: 'Saat dilimine göre geçen süre: {{duration}}',
      unpaidBreakNotDeducted: 'Planlanan mola: {{breakMinutes}} dk (süreden düşülmedi)',
      scheduledTimeZone: 'Vardiyanın saat dilimi: {{timeZone}}',
      nonexistentStart: 'Başlangıç saati bu tarihte mevcut değil. Otomatik hesap yapılmadı.',
      nonexistentEnd: 'Bitiş saati bu tarihte mevcut değil. Otomatik hesap yapılmadı.',
      ambiguousStart:
        'Başlangıç saati iki farklı ana denk geliyor. Seçim yapılmadan hesaplanmaz.',
      ambiguousEnd: 'Bitiş saati iki farklı ana denk geliyor. Seçim yapılmadan hesaplanmaz.',
      invalidElapsedInterval: 'Bitiş, başlangıçtan sonra değil. Süre doğrulanamadı.',
      invalidScheduleTimeZone: 'Saat dilimi veya vardiya saati geçersiz; süre hesaplanamadı.',
      notActualWorkRecord:
        'Bu yalnızca planlanan zamanın karşılığıdır; fiilî çalışma/bordro kaydı değildir.',
      chooseRepeatedHour: 'Tekrarlanan saati seç',
      boundaryDayOnly: 'Seçim yalnızca bu tarih ve mevcut vardiya saatleri için saklanır.',
      shiftStartBoundary: 'Planlanan başlangıç saati',
      shiftEndBoundary: 'Planlanan bitiş saati',
      foldChoice_reject: 'Seçilmedi',
      foldChoice_earlier: 'İlk gerçekleşen',
      foldChoice_later: 'İkinci gerçekleşen',
      boundaryChoiceAccessible: '{{boundary}}: {{choice}}',
      possibleUtcInstants: 'Olası UTC anları: {{values}}',
      chosenUtcInterval: 'Seçilen UTC: {{start}} – {{end}}',
      boundaryChoiceSaved: 'Bu günün saat seçimi kaydedildi.',
      invalidBoundaryChoice: 'Önce belirsiz başlangıç/bitiş saatlerini çöz.',
      saveBoundaryChoice: 'Bu güne özel seçimi kaydet',
      clearBoundaryChoice: 'Saat seçimini sıfırla',
      scheduleTimeZoneTitle: 'Programın saat dilimi',
      currentTimeZone: 'Kayıtlı saat dilimi: {{zone}}',
      timeZoneIdentifier: 'IANA saat dilimi',
      chooseTimeZone: 'Şehir veya saat dilimi seç',
      timeZoneSearch: 'Şehir / bölge ara',
      noTimeZones: 'Eşleşen şehir bulunamadı.',
      deviceTimeZone: 'Telefonun saat dilimi',
      zoneChangeWarning:
        'Saat dilimini değiştirmek planlanan saatlerin UTC karşılığını değiştirir. Gerçek mesai kayıtları değişmez.',
      changeTimeZone: 'Saat dilimini değiştir',
      confirmTimeZone: 'Program saat dilimi değişikliği',
      fromZoneToZone: '{{from}} → {{to}}',
      timeZoneCyclePreserved: 'Döngünün yerel tarihleri ve vardiya saatleri korunacak.',
      zonePreviewDate: 'Örnek program günü: {{date}}',
      zonePreviewFromUtc: 'Önceki UTC başlangıç: {{start}}',
      zonePreviewToUtc: 'Yeni UTC başlangıç: {{start}}',
      zoneActualRecordsUnchanged:
        'Geçmiş gerçek giriş-çıkış kayıtlarının UTC anları değişmeyecek.',
      invalidTimeZone: 'Geçerli bir IANA saat dilimi gir.',
      zoneSaved: 'Programın saat dilimi güncellendi.',
      cancel: 'İptal',
      confirm: 'Onayla',
      delete: 'Sil',
      actualWorkTitle: 'Gerçek çalışma kaydı',
      actualSelfReportedWarning:
        'Bu kayıt kendi beyanındır; işveren onaylı puantaj veya bordro değildir.',
      actualRecordingZone: 'Giriş ve çıkış saat dilimi: {{timeZone}}',
      actualStartClock: 'Gerçek giriş (SS:DD)',
      actualEndClock: 'Gerçek çıkış (SS:DD)',
      actualEndDate: 'Gerçek çıkış tarihi (YYYY-AA-GG)',
      actualBreak: 'Gerçek mola (dk)',
      actualNote: 'Çalışma notu',
      actualRepeatedTime: '{{boundary}} iki kez yaşanıyor; hangisini kastettiğini seç.',
      invalidActualEntry: 'Çalışma kaydı kaydedilemedi.',
      actualBreakInvalid: 'Mola süresi sıfır veya pozitif tam sayı olmalı.',
      saveActualEntry: 'Gerçek çalışmayı kaydet',
      actualEntrySaved: 'Kendi beyanına dayalı çalışma kaydı kaydedildi.',
      recordedActualWork: 'Bu gün kaydedilen çalışmalar',
      actualNetDuration: 'Mola sonrası bildirilen süre: {{minutes}} dakika (kesin ücret değil)',
      actualSessionZone: 'Kayıt anındaki bölge: {{zone}}',
      confirmDeleteActual: 'Kaydı sil',
      actualDeleteWarning: 'Bu çalışma kaydı silinecek.',
      noActualEntries: 'Bu gün için gerçek çalışma kaydı bulunmuyor.',
      notPaySlip: 'Bunlar kullanıcı kayıtlarıdır, otomatik bordro veya ücret hesabı yapılmaz.',
      actualError_INVALID_ACTUAL_DATE:
        'Çıkış tarihi giriş gününden önce veya üç günden fazla sonra olamaz.',
      actualError_INVALID_ACTUAL_BREAK: 'Mola süresi geçersiz.',
      actualError_INVALID_ACTUAL_NOTE: 'Not çok uzun.',
      actualError_AMBIGUOUS_ACTUAL_START:
        'Gerçek giriş saati iki farklı ana denk geliyor. Seçim yap.',
      actualError_AMBIGUOUS_ACTUAL_END:
        'Gerçek çıkış saati iki farklı ana denk geliyor. Seçim yap.',
      actualError_NONEXISTENT_ACTUAL_START: 'Gerçek giriş saati bu tarihte mevcut değil.',
      actualError_NONEXISTENT_ACTUAL_END: 'Gerçek çıkış saati bu tarihte mevcut değil.',
      actualError_INVALID_ACTUAL_INTERVAL:
        'Çıkış girişten sonra olmalı, mola aralıktan kısa olmalı ve süre 72 saati aşmamalı.',
    },
  },
  en: {
    translation: {
      today: 'Today',
      todayEarningsTitle: 'Estimated earnings for this pay period',
      todayEarningsCalendarPeriod: 'Calendar month: {{from}} – {{to}}',
      todayEarningsCustomPeriod: 'Custom pay period: {{from}} – {{to}}',
      todayEarningsNeedsProfile: 'No pay profile for this period. Create one in Earnings.',
      todayEarningsNoEntries:
        'No logged actual work or adjustment is available to calculate this period yet.',
      todayEarningsBlocked:
        'No amount shown: your saved pay or work sources need explicit review. Check Earnings.',
      todayEarningsError:
        'The estimate could not be read. Retry instead of showing an unverified amount.',
      todayEarningsFixedAssumption:
        'Fixed monthly base uses your saved full-month amount; it is not prorated by logged work.',
      todayEarningsDisclaimer:
        'Self-reported PRE-TAX estimate only, not official payroll or take-home pay. Never add calendar and custom-period totals.',
      todayEarningsViewDetails: 'Open earnings details',
      calendar: 'Calendar',
      routines: 'Routines',
      earnings: 'Earnings',
      settings: 'Settings',
      earnTwoFixedOtTitle: 'Fixed salary transition: overtime policy',
      earnTwoFixedOtExplanation:
        'Explicitly choose how logged overtime should be treated across the two FIXED salary sources. If included, decide whether time worked before the boundary counts toward the second source’s own threshold. This is NOT payroll, overtime pricing or a legal threshold.',
      earnTwoFixedOtRequiresBase:
        'First save a current, explicit BASE declaration for both fixed salary segments.',
      earnTwoFixedOtBlocked:
        'Two verified fixed salary profiles are required for this overtime policy.',
      earnTwoFixedOtBaseSource:
        'Source BASE total: {{base}} · immutable decision revision {{revision}}',
      earnTwoFixedOtProfile:
        'Profile {{index}}: {{id}} · revision {{revision}} · overtime threshold {{minutes}} minutes · additional hourly rate {{rate}} · multiplier {{numerator}}/{{denominator}}',
      earnTwoFixedOtUnconfigured: 'unconfigured',
      earnTwoFixedOtStale:
        'Previous overtime policy is STALE because BASE, profile or schedule zone changed. Explicitly decide again.',
      earnTwoFixedOtCurrent:
        'Saved overtime decision: {{decision}} · counter {{mode}} · revision {{revision}}',
      earnTwoFixedOtNoMode: 'not applicable',
      earnTwoFixedOtMissing:
        'No explicit overtime consent exists. No automatic inclusion or calculation.',
      earnTwoFixedOtDecisionLabel:
        'Your decision about recorded overtime in this custom pay period',
      earnTwoFixedOtExclude: 'EXCLUDE overtime from this period',
      earnTwoFixedOtInclude: 'Approve including logged overtime',
      earnTwoFixedOtNeedRates:
        'Both salary profiles need a valid overtime threshold and additional hourly rate before inclusion can be approved.',
      earnTwoFixedOtThresholdLabel:
        'When the second fixed salary source starts, what happens to the overtime counter?',
      earnTwoFixedOtCarry:
        'CARRY: prior logged time counts toward the second profile’s threshold',
      earnTwoFixedOtReset: 'RESET: count starts anew for the second segment',
      earnTwoFixedOtReason: 'Reason for your choice (3–160 characters)',
      earnTwoFixedOtReasonPlaceholder: 'E.g. overtime approach in my contract',
      earnTwoFixedOtSave: 'Save source-bound overtime policy',
      earnTwoFixedOtSaved: 'Overtime consent and threshold policy saved with revision.',
      earnTwoFixedOtSaveFailed: 'Could not save overtime policy',
      earnTwoFixedOtNoPayYet:
        'CAUTION: this records a decision ONLY; the app does NOT YET PRICE overtime across two fixed profiles. Full combined earnings and CSV/JSON for this case remain BLOCKED until actual work and breaks are source-verified in a later phase. Not an official payslip.',
      earnFixedTransitionTitle: 'Fixed salary change: two-source BASE declaration',
      earnFixedTransitionExplanation:
        'When your monthly fixed salary changes on the 1st within a custom pay period, YOU enter an explicit BASE amount for each old/new source segment (from zero up to its own source full monthly BASE). No day or hour prorating. This is NOT a complete earnings estimate.',
      earnFixedTransitionPeriod: 'Period {{start}} – {{end}} · saved schedule zone {{zone}}',
      earnFixedTransitionBlocked:
        'The change could not be validated as two fixed monthly profiles in the same currency. Fixed/hourly mixtures and currency conversion are not supported.',
      earnFixedTransitionStale:
        'Your previous declaration is STALE because the pay profile or time zone changed. No amount is shown until you make a new explicit declaration.',
      earnFixedTransitionSegment: 'Source segment {{index}}: {{start}} – {{end}}',
      earnFixedTransitionProfile:
        'Profile {{id}} · immutable revision {{revision}} · full monthly BASE {{amount}}',
      earnFixedTransitionPreviouslyDeclared: 'Previously declared segment BASE: {{amount}}',
      earnFixedTransitionInput: 'BASE you declare for segment {{index}} ({{currency}})',
      earnFixedTransitionDeclaredTotal:
        'Declared BASE-only sum of both segments: {{amount}} · decision revision {{revision}}',
      earnFixedTransitionNeedsDecision:
        'No current declaration. No amount is produced; explicitly enter both amounts and a reason.',
      earnFixedTransitionReason: 'Reason for these two BASE amounts (3–160 characters)',
      earnFixedTransitionReasonPlaceholder: 'E.g. contractual partial-period base',
      earnFixedTransitionSave: 'Save both BASE declarations',
      earnFixedTransitionSaved: 'Source-bound BASE declarations saved.',
      earnFixedTransitionSaveFailed: 'Unable to save fixed-transition BASE declarations',
      earnFixedTransitionNotPayslip:
        'This is ONLY a user-declared pair of fixed-salary BASE amounts. It excludes logged work, overtime, bonuses, deductions, corrections, net/tax/social insurance and official payroll. The complete custom pay-period estimate remains BLOCKED until a separate overtime policy is approved.',
      earnCustomExportHeading: 'Custom period report: CSV/JSON',
      earnCustomExportHint:
        'Only the latest validated combined estimate can be shared. The file includes work IDs, original UTC times and time zones, profile/audit revisions, adjustment notes and exact minor units. Sensitive financial data; not encrypted backup and never sent automatically.',
      earnCustomExportCsv: 'Share custom period CSV file',
      earnCustomExportJson: 'Share custom period JSON file',
      earnCustomExportPrivacyTitle: 'Share this sensitive custom pay-period file?',
      earnCustomExportPrivacyBody:
        'Period: {{from}} – {{to}}\nEstimated total: {{total}}\nWork lines: {{work}} · adjustment lines: {{adjustments}}\nThis file includes source IDs, UTC times, salary amounts and notes. The receiving app may access them. Do not add calendar-month totals. This is not an official payslip. Sources are re-read after confirmation; changed sources cancel sharing.',
      earnCustomExportConfirm: 'Share this file',
      earnCustomExportFailed: 'Unable to share custom period report',
      earnCombinedTitle: 'Custom pay period: combined earnings estimate',
      earnCombinedExplanation:
        'Only verified logged hourly work OR an explicitly chosen fixed base plus separately approved overtime is combined with bonuses, deductions and corrections expressly assigned to this pay period. Missing provenance, currency mismatch or stale revisions block the total.',
      earnCombinedBlocked:
        'The combined custom-period amount is unavailable until all source records are verified.',
      earnCombinedPeriod:
        'Custom period: {{from}} – {{to}} · start day {{day}} · time zone {{zone}}',
      earnCombinedModel: 'Earnings model: {{mode}}',
      earnCombinedHourly: 'Logged actual hourly work',
      earnCombinedFixed: 'Your expressly selected fixed salary base',
      earnCombinedTotalLabel: 'Your user-reported PRE-TAX combined estimated amount:',
      earnCombinedBase: 'Selected fixed BASE pay: {{amount}}',
      earnCombinedRegular: 'Hourly logged regular work: {{amount}}',
      earnCombinedOvertime: 'Logged overtime above the saved threshold: {{amount}}',
      earnCombinedAdjustment: 'Explicitly allocated signed adjustments: {{amount}}',
      earnCombinedTrace:
        'Fixed base statement {{baseRev}} · overtime consent {{otRev}} ({{otPolicy}}) · verified net {{netSeconds}} sec · overtime {{overtimeSeconds}} sec',
      earnCombinedProfileSources: 'Pay profile sources',
      earnCombinedProfile: 'Profile {{id}} · immutable source revision {{revision}}',
      earnCombinedWorkSources: 'Actual-work source lines',
      earnCombinedWork_hourly_regular: 'Hourly regular work',
      earnCombinedWork_hourly_overtime: 'Hourly overtime',
      earnCombinedWork_fixed_overtime: 'Fixed salary overtime',
      earnCombinedWorkLine:
        '{{kind}} · source {{id}} · {{seconds}} sec · {{amount}} · profile {{profile}}/v{{revision}} · pay break audit {{audit}} · rate break audit {{rateAudit}}',
      earnCombinedWorkOrigin: 'Original UTC source: {{from}} – {{to}}',
      earnCombinedNoWorkRows: 'No extra paid actual-work lines in this combined model.',
      earnCombinedAdjustmentSources: 'Bonus, deduction and correction sources',
      earnCombinedAdjustmentLine:
        '{{kind}} · source {{id}} ({{month}}) · selected share {{amount}} · original total {{sourceAmount}} · allocation revision {{revision}}',
      earnCombinedAdjustmentPeriodSplit:
        'Earlier {{earlier}}: {{earlierAmount}} · later {{later}}: {{laterAmount}}',
      earnCombinedAuditReason: 'Allocation reason: {{reason}} · {{recordedAt}}',
      earnCombinedNoAdjustmentRows:
        'No additional allocated earning/deduction sources in this pay period.',
      earnCombinedNotPayslip:
        'User-reported approximate PRE-TAX estimate ONLY: not official payroll, employer approval, net salary, tax/social insurance or a statutory overtime claim. This combines sources for THIS special pay period only. The calendar-month report includes the same underlying sources: do NOT ADD monthly and custom period totals. Custom CSV/JSON is shared only with explicit consent.',
      earnAttribTitle: 'Custom pay period: bonus, deduction and correction allocation',
      earnAttribExplanation:
        'You explicitly assign each calendar-month bonus, deduction or correction between its two eligible custom pay periods. Enter the earlier period amount in exact minor currency units; the remainder belongs to the later period. No day-based proration and no double allocation of a source.',
      earnAttribPeriod: 'Selected pay period: {{start}} – {{end}}',
      earnAttribEmpty:
        'There are no calendar-month adjustments relevant to this custom pay period.',
      earnAttribPending:
        '{{count}} source allocations are missing or their source changed. No verified period total is shown.',
      earnAttribVerified:
        'Explicitly allocated bonus/deduction/correction subtotals, by currency:',
      earnAttribSource: '{{kind}} · source amount {{amount}}',
      earnAttribKind_bonus: 'Bonus',
      earnAttribKind_deduction: 'Deduction',
      earnAttribKind_correction: 'Correction',
      earnAttribPeriods:
        'Two eligible custom periods for this source: {{earlier}} and {{later}}',
      earnAttribSavedAmounts:
        'Earlier {{earlier}} · later {{later}} · selected period {{current}}',
      earnAttribEarlierAmount:
        'Amount assigned to earlier custom period {{period}} ({{currency}})',
      earnAttribRemainder:
        'The rest is assigned to later custom period {{period}}. For a negative deduction or correction, you may enter its positive magnitude; the app preserves the original negative sign.',
      earnAttribReason: 'Allocation or correction reason (3–160 characters)',
      earnAttribReasonPlaceholder:
        'Example: I verified which custom period this November bonus belongs to',
      earnAttribRevision: 'Source allocation revision: {{revision}}',
      earnAttribSave: 'Save versioned allocation across two periods',
      earnAttribSaved: 'Allocation saved; both custom periods share the same source split.',
      earnAttribInvalid: 'Invalid, inconsistent or stale allocation',
      earnAttribStale:
        'The calendar-month source record changed. Previous allocation cannot be used; verify the source.',
      earnAttribSeparate:
        'This total contains only explicitly allocated calendar-month adjustments. The original monthly report still shows the SAME source records: NEVER add monthly and custom reports together. Not yet added to fixed or hourly base earnings. This is user-reported pre-tax information, not an official payslip.',
      earnFixedOtTitle: 'Custom period: logged overtime on top of fixed base',
      earnFixedOtExplanation:
        'First declare the fixed salary base. You can then explicitly authorize adding overtime only for recorded actual work above your own selected threshold, using the saved profile overtime hourly rate and multiplier. Regular hours are not paid a second time.',
      earnFixedOtState_requires_base:
        'First record or update your fixed salary base statement.',
      earnFixedOtState_needs_configuration:
        'Your fixed salary profile needs an explicit overtime threshold and a positive overtime hourly rate. Correct the profile first.',
      earnFixedOtState_blocked:
        'Overtime estimate blocked by invalid source or calendar-month adjustments.',
      earnFixedOtState_not_applicable: 'Not applicable to this period.',
      earnFixedOtSource:
        'Fixed source: {{id}} · profile revision {{revision}} · base statement {{baseRevision}} · chosen base {{base}}',
      earnFixedOtRate:
        'Your selected threshold: {{threshold}} net min per custom period · overtime hourly {{rate}} × {{numerator}}/{{denominator}}',
      earnFixedOtStale:
        'The base statement or pay profile changed. Prior overtime consent is stale; explicitly record a new decision.',
      earnFixedOtCombinedScope:
        'Estimate of selected fixed BASE plus reported actual overtime ONLY:',
      earnFixedOtSum: 'Fixed base {{base}} + additional overtime {{overtime}}',
      earnFixedOtSeconds:
        'Reported net work {{logged}} sec · regular {{regular}} sec (not paid again) · overtime {{overtime}} sec',
      earnFixedOtLine:
        'Actual work {{work}} · additional overtime {{seconds}} sec · {{amount}} · pay break audit {{audit}}',
      earnFixedOtExcluded:
        'You explicitly chose not to include overtime in this custom period. No combined amount is shown.',
      earnFixedOtNeedsConsent:
        'Overtime inclusion has not been explicitly authorized for this period. No combined amount is shown.',
      earnFixedOtBlocked:
        'Actual work or boundary break provenance could not be verified. No combined amount is shown.',
      earnFixedOtSelection: 'Make an explicit overtime inclusion decision',
      earnFixedOtInclude: 'Include recorded overtime',
      earnFixedOtExclude: 'Do not include this period',
      earnFixedOtReason: 'Reason for this consent or correction (3–160 characters)',
      earnFixedOtReasonPlaceholder:
        'Example: I verified my logged-work threshold and hourly overtime rate',
      earnFixedOtRevision: 'Overtime consent revision: {{revision}}',
      earnFixedOtSave: 'Save versioned overtime decision',
      earnFixedOtSaved: 'Versioned overtime decision saved; the estimate will refresh.',
      earnFixedOtInvalid: 'Invalid or stale overtime decision',
      earnFixedOtNotPayslip:
        'User-reported PRE-TAX estimate only. Your chosen threshold is not a statutory overtime rule. Calendar bonuses, deductions, corrections, tax, social insurance and net pay are excluded; this is not an official payslip. Edited work records reprice the estimate.',
      earnFixedTitle: 'Custom pay period: fixed salary base only',
      earnFixedExplanation:
        'This section shows only the fixed-salary base amount that you explicitly choose for a custom period. No automatic daily or hourly prorating is inferred from calendar dates or logged work. A period with two effective profiles stays blocked.',
      earnFixedPeriod: 'Custom pay period: {{start}} – {{end}}',
      earnFixedProfile:
        'Pay profile {{profile}} · revision {{revision}} · full monthly source {{amount}}',
      earnFixedSavedScope: 'Your explicitly chosen fixed salary BASE-ONLY estimate:',
      earnFixedSavedChoice: '{{mode}} · statement revision {{revision}}',
      earnFixedStale:
        'Your pay profile or time zone changed. The previous statement no longer matches; make a fresh explicit choice.',
      earnFixedNeedsChoice:
        'No fixed salary base assumption has been declared for this custom period.',
      earnFixedSelection: 'Choose the fixed base amount for this period explicitly',
      earnFixedFull: 'Full fixed base',
      earnFixedPartial: 'Partial period: enter my own amount',
      earnFixedAmount: 'Your explicitly stated base amount for this period ({{currency}})',
      earnFixedAmountHint:
        'Enter zero or a positive amount strictly lower than the full monthly source. The app does not prorate by calendar days or work hours.',
      earnFixedReason: 'Reason for this statement or correction (3–160 characters)',
      earnFixedReasonPlaceholder: 'Example: I confirmed my partial period base amount',
      earnFixedRevision: 'Saved statement revision: {{revision}}',
      earnFixedSave: 'Save versioned fixed base amount statement',
      earnFixedSaved: 'Fixed base amount statement saved with revision history.',
      earnFixedInvalid: 'Invalid or stale fixed base salary choice',
      earnFixedBlocked: 'Custom-period fixed salary base is currently blocked.',
      earnFixedNotPayslip:
        'This is only your self-reported PRE-TAX FIXED SALARY BASE AMOUNT. Overtime, bonuses, deductions, corrections, taxes, social insurance and net pay are EXCLUDED. It is not a payslip or payment promise. Existing calendar adjustments or a pay-profile transition block this amount.',
      earnCustomHourlyTitle: 'Custom period: logged actual-work earnings',
      earnRateBreakTitle: 'Break allocation at an hourly rate change',
      earnDualBreakLineAudit:
        'Pay-period + rate-boundary break statement revision {{revision}}',
      earnRateBreakLineAudit: 'Rate-change break statement revision {{revision}}',
      earnDualBreakTitle: 'Break allocation when one shift crosses two boundaries',
      earnDualBreakExplanation:
        'First record the break split across custom pay periods above. Here, separately assign the break within the rate-changing part of the same shift to the old and new hourly rates. Each statement is tied to the specific revision of the pay-period break declaration.',
      earnDualBreakNeedsFirst:
        '{{count}} shifts require a pay-period break statement above before a rate-boundary declaration can be saved or earnings calculated.',
      earnDualBreakNone:
        'No recorded shift in this period requires a second break attribution.',
      earnDualBreakContext:
        'Pay period: {{period}} · rate changes: {{rate}} (UTC {{utc}}) · first statement revision: {{audit}}',
      earnDualBreakAmounts:
        'Original break: {{original}} min · break within this period: {{portion}} min · old-rate capacity {{before}} min · new-rate capacity {{after}} min',
      earnDualBreakStale:
        'The first break statement changed. The prior second statement is stale; record a fresh rate allocation.',
      earnDualBreakBefore: 'Break minutes before the new hourly rate in this pay period',
      earnDualBreakReason: 'Statement or correction reason (3–160 characters)',
      earnDualBreakReasonPlaceholder:
        'Example: verified the break position across both boundaries',
      earnDualBreakRevision: 'Second statement revision: {{revision}}',
      earnDualBreakSave: 'Save versioned two-boundary break allocation',
      earnDualBreakSaved: 'Statement saved; custom hourly estimate refreshed.',
      earnDualBreakInvalid: 'Invalid, inconsistent or stale two-boundary break statement',
      earnDualBreakNotPayslip:
        'Break timing is never assumed. Dual-boundary shifts need a separate versioned statement. Every segment uses its original UTC and IANA zone; this is not an official payslip.',

      earnRateBreakExplanation:
        'When hourly pay changes on the 1st, you can declare how a break spanning both rates is allocated to the old and new rate intervals. This is a separate source-linked, versioned statement used only for custom-period work-only estimates.',
      earnRateBreakNone:
        'No work with a break crossing an hourly rate-change midnight needs attribution in this period.',
      earnRateBreakCrossPeriodUnavailable:
        '{{count}} sessions cross both boundaries. Complete the pay-period break declaration and then the separate two-boundary declaration above; missing attribution blocks estimation.',
      earnRateBreakMidnight: 'Rate change: {{date}} · UTC boundary: {{utc}}',
      earnRateBreakTotal: 'Original reported break: {{minutes}} minutes',
      earnRateBreakLimits:
        'Old-rate portion can hold at most {{before}} min; new-rate portion at most {{after}} min.',
      earnRateBreakBefore: 'Break minutes taken before the new hourly rate began',
      earnRateBreakReason: 'Statement or correction reason (3–160 characters)',
      earnRateBreakReasonPlaceholder: 'Example: first portion of my break was at the old rate',
      earnRateBreakRevision: 'Statement revision: {{revision}} (0: not recorded)',
      earnRateBreakSave: 'Save versioned rate-change break allocation',
      earnRateBreakSaved: 'Statement saved with revision history. Custom estimate refreshed.',
      earnRateBreakInvalid: 'Invalid or stale rate-boundary break statement',
      earnRateBreakNotPayslip:
        'Breaks without an explicit statement and sessions crossing both boundaries are never allocated automatically. This is not an official payslip; previous revisions remain in app-level history.',

      earnCustomHourlyScope:
        'Computed from self-reported actual hourly work. When hourly rates change, each portion uses the rate effective in the saved IANA zone of the actual work record, with one unchanged period-wide overtime threshold. A break spanning a rate-change midnight requires a separate versioned statement; mixed currencies/thresholds or existing monthly adjustments block the estimate. Fixed salary, tax, social security and net pay are excluded.',
      earnCustomHourlyPeriod: 'Custom period: {{start}} – {{end}} (inclusive)',
      earnCustomHourlyTotals:
        'Net logged work: {{minutes}} minutes · Above custom-period threshold: {{overtime}} minutes',
      earnCustomHourlyProfile: 'Pay source: {{profile}} · revision {{revision}}',
      earnCustomHourlyMixedRates:
        '{{count}} distinct hourly rate profiles apply in this period; one overtime threshold is shared.',
      earnCustomHourlyLineProfile:
        'Rate source for this portion: {{profile}} · revision {{revision}}',
      earnCustomHourlySources: 'Calculated work by original source',
      earnCustomHourlyKind_regular: 'Regular hourly work',
      earnCustomHourlyKind_overtime: 'Hourly work above period threshold',
      earnCustomHourlyLine:
        'Actual work {{work}} · {{seconds}} seconds · Break in this portion {{breakMinutes}} min · Break audit revision {{revision}}',
      earnCustomHourlyOriginal: 'Original work UTC: {{start}} → {{end}}',
      earnCustomHourlyStatus_blocked:
        'Custom-period estimate blocked: profile, break, work or calendar-month adjustment requires an explicit policy.',
      earnCustomHourlyStatus_needs_profile:
        'An active hourly pay profile is required at the beginning of the custom period.',
      earnCustomHourlyStatus_no_work:
        'No self-reported actual work exists in this custom period.',
      earnCustomHourlyStatus_disabled: 'Start day 1: use the existing calendar-month report.',
      earnCustomHourlyNotPayslip:
        'This is a user-reported pre-tax estimate of WORK ONLY, not full pay, a payslip or a payment commitment. An existing calendar-month bonus, deduction or correction blocks the estimate. Custom-period CSV/JSON exports are not yet enabled.',
      earnCustomProfileTitle: 'Custom-period pay profile review',
      earnCustomProfileExplanation:
        'A custom pay period can span two calendar months. A new rate may become effective on the 1st. This preview identifies immutable profile revisions for each date range without silently blending rates.',
      earnCustomProfilePeriod: 'Custom pay period: {{start}} – {{end}} ({{zone}})',
      earnCustomProfileStatus_needs_profile:
        'No pay profile covers the start of this period. Estimation is blocked.',
      earnCustomProfileStatus_single_hourly_profile:
        'One hourly pay profile covers this period. This is not a calculation or payroll approval.',
      earnCustomProfileStatus_fixed_salary_assumption_required:
        'Fixed pay: a full/partial custom-period payment assumption is required before estimating.',
      earnCustomProfileStatus_profile_transition_review_required:
        'A pay profile changes inside the period. Two hourly rates can be applied to separate work portions only if currency and period overtime threshold agree; ambiguous breaks or differing thresholds block payment estimation.',
      earnCustomProfileSource:
        'Profile source: {{id}} · revision {{revision}} · effective {{effective}}',
      earnCustomProfileModel: '{{model}} · saved amount: {{amount}}',
      earnCustomProfileUtc: 'Projected UTC boundaries: {{start}} → {{end}} (end exclusive)',
      earnCustomProfileZoneWarning:
        'This preview uses the schedule time zone. Actual work earnings must use each record’s original IANA zone and UTC instants.',
      earnCustomProfileNotApplied:
        'Important: This panel reviews pay profile transitions only. Existing calendar-month Earnings totals, breaks, adjustments and CSV/JSON are not recalculated for the custom period.',
      earnCustomBreakTitle: 'Custom-period break split (preparation)',
      earnCustomBreakExplanation:
        'For a period such as 26–25, you can declare how a break in actual work crossing the period boundary is split. These declarations do not automatically change existing monthly earnings.',
      earnCustomBreakSelectedPeriod:
        'Custom period: start day {{day}} · starting month {{period}}',
      earnCustomBreakNone: 'No break-bearing work crosses this custom period boundary.',
      earnCustomBreakTotal: 'Original reported break: {{minutes}} minutes',
      earnCustomBreakFirst: 'Break minutes assigned to the first part of {{period}}',
      earnCustomBreakReason: 'Declaration or correction reason (3–160 characters)',
      earnCustomBreakReasonPlaceholder: 'Example: corrected the break duration',
      earnCustomBreakRevision: 'Saved revision: {{revision}} (0: not yet declared)',
      earnCustomBreakSave: 'Save custom-period break allocation',
      earnCustomBreakSaved:
        'Versioned break allocation saved. Prior corrections remain recorded.',
      earnCustomBreakInvalid: 'Invalid or stale custom-period break allocation',
      earnCustomBreakNotEnabled:
        'Earnings reports, pay profiles and CSV/JSON exports do not yet use this custom-period declaration. Calendar-month reports and existing break history are unchanged.',
      payPeriodPreferenceTitle: 'Pay period start (preparation)',
      payPeriodPreferenceExplanation:
        'Your pay period can start after the 1st. Calendar-month reports stay unchanged; verified custom-period estimates are shown separately.',
      payPeriodPreferenceStartDay: 'Period start day (1–28)',
      payPeriodPreferenceHint:
        'For example, 26 means the period starts on the 26th and closes on the 25th of the following month. Days 29–31 are not supported yet because of February.',
      payPeriodPreferenceInvalid: 'Choose a whole-number day from 1 to 28.',
      payPeriodPreviewDates: 'Sample current period: {{start}} – {{end}} ({{zone}})',
      payPeriodPreviewUnavailable: 'Cannot preview the period in this time zone.',
      payPeriodPreferenceSave: 'Save pay period preference',
      payPeriodPreferenceSaved: 'Your pay period start preference was saved on this device.',
      payPeriodPreferenceError: 'Could not read or save pay period preference',
      payPeriodPreferenceNotEnabled:
        'Calendar-month reports remain available. When you choose day 2–28, a separate custom-period estimate appears only with verified pay and break sources. Unsupported profile transitions never show an amount.',
      greeting: 'Your plan today',
      nextShift: 'Next day',
      shiftToday: "Today's shift",
      configure: 'Set up your shift schedule',
      configureDescription: 'Create your own recurring cycle to start using your calendar.',
      date: 'Date',
      day: 'Day',
      shift: 'Shift',
      off: 'Off',
      morning: 'Morning',
      evening: 'Evening',
      night: 'Night',
      noPattern: 'No shift schedule yet.',
      anchorDate: 'Cycle start date (YYYY-MM-DD)',
      cycle: 'Shift cycle',
      addDay: 'Add day',
      removeDay: 'Remove last day',
      save: 'Save',
      saved: 'Shift schedule saved.',
      example: 'Load sample 8-day cycle',
      exampleHint: 'The sample starts today.',
      invalidDate: 'Enter a valid date and at least one cycle day.',
      loading: 'Loading local data…',
      databaseError: 'Local data could not be loaded.',
      retry: 'Retry',
      upcoming: 'Next 14 days',
      noRoutines: 'No routine rules yet.',
      reminderGlobalTitle: 'Local routine reminders',
      reminderGlobalExplanation:
        'Give routines an optional reminder time. Notification permission is requested only after tapping Enable; no internet or account is needed.',
      reminderPermissionOn: 'Reminders enabled. Upcoming tasks are scheduled on this device.',
      reminderPermissionOff: 'Reminders are off; your checklists still work.',
      reminderPermissionDenied:
        'Notifications are denied or restricted. Enable them in system settings; tasks remain available.',
      enableReminders: 'Enable reminders',
      disableReminders: 'Disable reminders',
      reminderBestEffort:
        'Up to 48 reminders are scheduled across 14 days (max 6 per day). The OS may delay delivery; these are not exact alarms.',
      reminderTimeTitle: 'Reminder time (HH:mm, optional)',
      reminderTimeHint:
        'Leave blank for no reminder. Clock time uses {{timeZone}}; ambiguous or nonexistent DST times are skipped.',
      routinePageSubtitle: 'Tasks automatically filtered by shift and date',
      dailyRoutineTitle: '{{date}} · Tasks',
      routineProgress: '{{done}} / {{total}} complete',
      noTasksToday: 'No active tasks for this day.',
      routineError: 'Unable to update routine data',
      routineHistory: 'Completion history',
      noRoutineHistory: 'No task actions recorded for this date.',
      historyIsPreserved: 'Action history remains after a routine is renamed or archived.',
      wasCompleted: 'Completed',
      wasUndone: 'Undone',
      viewRoutineDate: 'Choose date (YYYY-MM-DD)',
      showDate: 'Show date',
      manageRoutineRules: 'Manage routine rules',
      noRoutineRules: 'No routine rules yet.',
      addRoutine: 'Create routine',
      newRoutine: 'New routine',
      editRoutine: 'Edit routine',
      routineTitle: 'Routine / task name',
      routineInvalid: 'Invalid routine rule',
      routineRuleSemantics: 'Filters combine with AND across groups and OR within a group.',
      routineShiftFilter: 'Shift types',
      routineWeekdayFilter: 'Days of week',
      routineCycleFilter: 'Cycle-day numbers',
      routineCycleHint:
        'Comma-separated numbers from 1 to {{length}}. Blank means all cycle days.',
      routineCycleExample: 'Example: 1,3,8',
      routineEmptyAny: 'Nothing selected means any.',
      routineRestOnly: 'Only scheduled rest days',
      routineEnabled: 'Routine enabled',
      saveRoutine: 'Save routine',
      routineActive: 'Enabled',
      routineDisabled: 'Disabled',
      toggleRoutine: 'Enable / disable',
      archiveRoutine: 'Archive',
      routineArchiveWarning: 'Hides the routine without deleting completion history.',
      archivedRoutines: 'Archived routines',
      restoreRoutine: 'Restore as disabled',
      noEarnings: 'No earnings data yet.',
      backupRestoreTitle: 'Restore to a fresh install (experimental)',
      backupRestoreLimitedWarning:
        'Restore only works on a completely untouched app with the four default shift templates. If existing data is found, it is rejected. Native Android/iOS acceptance tests are still pending.',
      backupRestoreNotice:
        'IMPORTANT: This feature has not been validated on a physical device. Keep the backup and recovery key safe. Only a pristine/empty installation can be restored, with NO merge or overwrite of existing user data. Notification consent must be granted again after restore. Type RESTORE to confirm.',
      backupRestoreTypeToConfirm: 'Type RESTORE to confirm',
      backupRestoreConfirmTitle: 'Confirm restore to a fresh installation?',
      backupRestoreConfirmBody:
        'Only a clean database with four default templates is eligible. All records are inserted in one transaction and rolled back on any failure. A populated or modified database is rejected. Do not delete the backup file.',
      backupRestoreConfirmAction: 'Restore to clean installation',
      backupRestoreSuccess: 'Restore transaction completed',
      backupRestoreRows:
        '{{count}} records imported. Notifications were switched off pending fresh consent. Native-device acceptance is not yet complete.',
      backupRestoreRejected: 'Restore rejected. Existing data remains protected.',
      backupTitle: 'Encrypted local backup (first release)',
      backupDescription:
        'Encrypts your current SQLite v8 records with a fresh, random AES-256-GCM key. The file only leaves the app when you explicitly share it. The key is not in the file.',
      backupCreate: 'Create encrypted backup',
      backupRecoveryWarning:
        'WARNING: Store this 64-character recovery key SECURELY and SEPARATELY from the encrypted file. Losing it makes the backup unrecoverable. Do not send the key in chats or share it.',
      backupRecoveryKey: 'Backup recovery key (secret)',
      backupKeySaved: 'I saved the recovery key separately.',
      backupShare: 'Share encrypted backup file',
      backupHideKey: 'Hide recovery key',
      backupError: 'Failed to create backup',
      backupShareError: 'Unable to share encrypted file',
      backupVerifyTitle: 'Select and verify backup (preview only)',
      backupPreviewOnlyWarning:
        'Choose a backup and enter its key to verify decryption, integrity, local schema compatibility and record counts. This phase never imports data or changes the existing SQLite database.',
      backupSelectFile: 'Choose encrypted .vdb file',
      backupSelected: 'Encrypted file selected. Enter its recovery key.',
      backupEnterKey: '64-character recovery key',
      backupVerify: 'Verify key and preview',
      backupInvalidFile: 'Backup file not accepted',
      backupVerifyError: 'Backup not verified; key, integrity or version mismatch',
      backupVerified: 'Backup verified',
      backupPreviewCreated: 'Created: {{date}}',
      backupPreviewRows: '{{count}} rows across {{tables}} tables',
      backupNoRestore:
        'VERIFICATION COMPLETE. Restoring or overwriting data is not yet enabled. Keep your encrypted file and recovery key safe.',
      earnCorrectProfile: 'Correct existing pay profile',
      earnHideCorrection: 'Hide correction editor',
      earnCorrectionWarning:
        'This creates a NEW, immutable version for the same effective month. Earlier pay profile versions remain available. Current estimates recalculate; previous displayed reports are not automatically frozen or archived.',
      earnRevisionReason: 'Reason for correction (required, 3–160 characters)',
      earnSaveRevision: 'Save new pay profile revision',
      earnRevisionSaved:
        'New pay profile revision saved; prior values and reason remain available.',
      earnHistoryTitle: 'Pay profile revision history',
      earnHistoryWarning:
        'Select a version to recalculate using its old pay settings and CURRENT work and adjustment records. This is not a frozen copy of the report displayed in the past.',
      earnHistoryRow: 'v{{revision}} · {{rate}} · {{reason}}',
      earnOriginal: 'Original entry',
      earnShowLatest: 'Calculate with latest profile',
      earnPreviewRevision: 'Recalculate with v{{revision}}',
      earnHistoricalPreview:
        'This estimate uses historical pay settings v{{revision}} with CURRENT work data. It is not a frozen historical payslip.',
      earnSplitCount:
        '{{count}} work record(s) were apportioned across month boundaries in their recorded IANA zone.',
      earnBreakSplitTitle: 'Month-crossing break allocation',
      earnBreakSplitExplanation:
        'For a shift crossing months, enter how many of the total break minutes belonged to its START month. The rest belongs to the next month. No allocation is guessed.',
      earnBreakTotal: 'Total self-reported break: {{minutes}} minutes',
      earnBreakStartMonth: 'Break minutes in {{month}}',
      earnSaveBreakSplit: 'Save explicit allocation',
      earnBreakInvalid:
        'Break allocation invalid; check the work duration, total break and minutes in each month.',
      earnBreakSaved: 'Break allocation saved. Both months will use the same choice.',
      earnBreakAuditHint:
        'Changing an allocation preserves a revision audit. This is not employer-approved paid break time.',
      earnExportHeading: 'Share report summary',
      earnExportConsentHint:
        'Only share after reviewing the information. Export contains work identifiers, UTC segment times, pay profile, user notes and amounts; never sent automatically. This is not an encrypted backup.',
      earnShareCsv: 'Share CSV text',
      earnShareJson: 'Share JSON text',
      earnExportPrivacyTitle: 'Share financial information?',
      earnExportPrivacyBody:
        'The selected app may receive the estimate, work identifiers, note text and financial details. No data leaves Vardiyum unless you choose a destination in the system share sheet.',
      earnExportConfirm: 'Open share sheet',
      earnExportFailed: 'Unable to share estimated report',
      earnSubtitle: 'Explainable earnings estimates based on your own records',
      earnChooseMonth: 'Reporting month',
      earnMonth: 'Month (YYYY-MM)',
      earnViewMonth: 'View month',
      earnSafetyWarning:
        'Only your own reported work is used. No taxes, social insurance, official payslip, contract interpretation or employer approval is calculated.',
      earnNewProfile: 'Create pay profile',
      earnHideProfileEditor: 'Hide profile form',
      earnImmutableProfileHint:
        'Profiles start on the first day of their effective month. Create a new profile for a later month instead of rewriting a historical one.',
      earnEffectiveFrom: 'Effective date (YYYY-MM-01)',
      earnModel: 'Pay model',
      earnModelHourly: 'Hourly rate',
      earnModelMonthly: 'Fixed monthly amount',
      earnCurrency: 'Currency (two decimal places)',
      earnHourlyRate: 'Pay per hour',
      earnMonthlyBase: 'Fixed full-month amount',
      earnThresholdMinutes: 'Start overtime after how many minutes in this period?'
      earnThresholdPlaceholder: 'Blank means no overtime multiplier',
      earnThresholdWarning:
        'Example: 180 hours = 10,800 minutes. Only logged actual work above this threshold is treated as overtime; no legal threshold is assumed.',
      earnOvertimeHourlyRate: 'Additional overtime hourly rate for fixed monthly model',
      earnMultiplierNumerator: 'Multiplier top number',
      earnMultiplierDenominator: 'Multiplier bottom number',
      earnMultiplierHelp:
        'Multiplier = top ÷ bottom: 3 ÷ 2 = 1.5x, 2 ÷ 1 = 2x. Only one rate applies to a period for now; regular versus holiday overtime is not yet classified.',
      earnSaveProfile: 'Save pay profile',
      earnProfileSaved: 'Pay profile saved.',
      earnProfileError: 'Could not save pay profile',
      earnProfileVersionWarning:
        'Historical profile IDs and effective months are preserved. Only one profile is allowed per month.',
      earnInvalidMonth: 'Enter a valid month (YYYY-MM).',
      earnNoProfile: 'No applicable pay profile',
      earnNoProfileHint:
        'Create a pay profile effective from the first day of this month or an earlier month.',
      earnBlocked: 'Estimate blocked',
      earnBlockedExplanation:
        'Work or money entries are invalid, overlapping or cross the period boundary. Review them instead of displaying a misleading total.',
      earnEstimatedTotal: 'Estimated pre-tax total',
      earnProfileDescription:
        'Source profile: {{id}} · revision {{revision}} · {{effectiveFrom}} · {{model}}',
      earnLoggedHours:
        'Self-reported: {{minutes}} work minutes; {{overtime}} overtime minutes (if a threshold was selected).',
      earnFullMonthAssumption:
        'The fixed amount assumes a full month. Missing or partial-month work is not automatically prorated.',
      earnNotPayslip:
        'Not an official payslip or take-home pay. Taxes, insurance, employer approval and legal compliance are not calculated.',
      earnLineItems: 'Itemized estimate',
      earnLine_monthly_base: 'Fixed monthly estimate',
      earnLine_hourly_regular: 'Regular hourly work',
      earnLine_hourly_overtime: 'Hourly overtime',
      earnLine_monthly_overtime: 'Extra monthly overtime',
      earnLine_logged_work: 'Self-reported work (information only)',
      earnLine_adjustment: 'User-entered adjustment',
      earnLineSource:
        'Source: {{source}} · profile {{profile}} (v{{revision}}) · {{seconds}} seconds',
      earnNoWork: 'No logged work or adjustments for this period.',
      earnAddAdjustment: 'Bonus, deduction or manual correction',
      earnAdjustmentImmutable:
        'Each amount is preserved as a separate record. Add a reversing correction if an amount was wrong.',
      earnKind_bonus: 'Bonus / addition',
      earnKind_deduction: 'Deduction',
      earnKind_correction: 'Manual correction (+/−)',
      earnAmount: 'Amount ({{currency}})',
      earnAdjustmentNote: 'Description (required)',
      earnSaveAdjustment: 'Save adjustment',
      earnAdjustmentSaved: 'Adjustment saved.',
      earnAdjustmentError: 'Could not save adjustment',
      offline: 'Works offline · No account needed',
      foundation: 'Vardiyum development build',
      opening: 'Opening',
      setupSubtitle: 'Tap a cycle day to change its shift.',
      scheduleZone: 'Schedule time zone: {{zone}}',
      shiftTypes: 'Shift types and hours',
      shiftTypesHint: 'Edit names, hours and breaks. Tap a cycle day to change its shift type.',
      shiftName: 'Shift name',
      startTime: 'Start',
      endTime: 'End',
      breakMinutes: 'Break (min)',
      restDay: 'Non-working day',
      addShift: 'Add shift',
      addRest: 'Add day off',
      deleteShiftType: 'Delete this type',
      deleteShiftTypeTitle: 'Remove shift type',
      deleteShiftTypeConfirm: 'Remove {{name}}? This is applied when you tap Save.',
      deleteShiftTypeInUse:
        'First replace this type in the rotation and any daily overrides.',
      deleteShiftTypeReferenced:
        'Saved routines or date overrides still reference this type. Remove those links first.',
      deleteShiftTypeFailed: 'Shift type could not be removed. Check its references.',
      overnightHint:
        'If the end time is at or before the start, the shift ends next day; equal hours mean a 24-hour shift.',
      customName: 'New shift',
      restName: 'New day off',
      invalidSchedule: 'Check your shift schedule.',
      editedDay: 'This day has a custom change.',
      monthView: 'Monthly shift calendar',
      mon: 'Mo',
      tue: 'Tu',
      wed: 'We',
      thu: 'Th',
      fri: 'Fr',
      sat: 'Sa',
      sun: 'Su',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      changeDay: 'Change this day’s shift',
      overrideHint: 'Only this day changes; the repeating cycle stays the same.',
      dayNote: 'Optional note',
      restoreCycle: 'Restore repeating cycle',
      hoursAndMinutes: '{{hours}}h {{minutes}}m{{seconds}}',
      wallClockDuration: 'Scheduled wall-clock duration: {{duration}}',
      actualElapsedTime: 'Elapsed time by time zone: {{duration}}',
      unpaidBreakNotDeducted: 'Planned break: {{breakMinutes}} min (not deducted)',
      scheduledTimeZone: 'Schedule time zone: {{timeZone}}',
      nonexistentStart: 'Start time does not exist on this date. No duration was inferred.',
      nonexistentEnd: 'End time does not exist on this date. No duration was inferred.',
      ambiguousStart: 'Start time occurs twice. Choose an instant before calculating.',
      ambiguousEnd: 'End time occurs twice. Choose an instant before calculating.',
      invalidElapsedInterval: 'End is not after start. Duration cannot be confirmed.',
      invalidScheduleTimeZone:
        'Invalid time zone or shift time; duration cannot be calculated.',
      notActualWorkRecord:
        'Scheduled time only, not an actual work record or a payroll result.',
      chooseRepeatedHour: 'Choose repeated clock time',
      boundaryDayOnly:
        'The choice applies only to this date and the current shift-hour configuration.',
      shiftStartBoundary: 'Scheduled start boundary',
      shiftEndBoundary: 'Scheduled end boundary',
      foldChoice_reject: 'Not chosen',
      foldChoice_earlier: 'First occurrence',
      foldChoice_later: 'Second occurrence',
      boundaryChoiceAccessible: '{{boundary}}: {{choice}}',
      possibleUtcInstants: 'Possible UTC instants: {{values}}',
      chosenUtcInterval: 'Selected UTC: {{start}} – {{end}}',
      boundaryChoiceSaved: 'The clock-time choice for this date was saved.',
      invalidBoundaryChoice: 'Resolve all ambiguous start and end clocks first.',
      saveBoundaryChoice: 'Save choice for this day',
      clearBoundaryChoice: 'Clear clock-time choice',
      scheduleTimeZoneTitle: 'Schedule time zone',
      currentTimeZone: 'Stored schedule zone: {{zone}}',
      timeZoneIdentifier: 'IANA time zone',
      chooseTimeZone: 'Choose city or time zone',
      timeZoneSearch: 'Search city or region',
      noTimeZones: 'No matching cities found.',
      deviceTimeZone: 'Device time zone',
      zoneChangeWarning:
        'Changing the schedule zone changes planned UTC times. Past actual work records are unchanged.',
      changeTimeZone: 'Change schedule time zone',
      confirmTimeZone: 'Confirm schedule time zone change',
      fromZoneToZone: '{{from}} → {{to}}',
      timeZoneCyclePreserved:
        'The local dates and clock hours in the cycle will stay the same.',
      zonePreviewDate: 'Sample schedule date: {{date}}',
      zonePreviewFromUtc: 'Previous UTC start: {{start}}',
      zonePreviewToUtc: 'New UTC start: {{start}}',
      zoneActualRecordsUnchanged:
        'Past self-reported actual UTC check-ins and check-outs will not change.',
      invalidTimeZone: 'Enter a valid IANA time zone.',
      zoneSaved: 'Schedule time zone was updated.',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      actualWorkTitle: 'Actual work log',
      actualSelfReportedWarning:
        'This is your own report, not employer-verified timesheets or a payslip.',
      actualRecordingZone: 'Check-in and check-out time zone: {{timeZone}}',
      actualStartClock: 'Actual start (HH:mm)',
      actualEndClock: 'Actual end (HH:mm)',
      actualEndDate: 'Actual end date (YYYY-MM-DD)',
      actualBreak: 'Actual break (min)',
      actualNote: 'Work note',
      actualRepeatedTime: '{{boundary}} occurs twice. Choose the intended occurrence.',
      invalidActualEntry: 'Work entry was not saved.',
      actualBreakInvalid: 'The break must be a nonnegative whole number.',
      saveActualEntry: 'Save actual work',
      actualEntrySaved: 'Self-reported work record saved.',
      recordedActualWork: 'Work logged for this date',
      actualNetDuration: 'Reported time after break: {{minutes}} minutes (not verified pay)',
      actualSessionZone: 'Zone at recording: {{zone}}',
      confirmDeleteActual: 'Delete record',
      actualDeleteWarning: 'This work record will be deleted.',
      noActualEntries: 'No actual work recorded for this day.',
      notPaySlip: 'These are user records, not automatic payroll or wages.',
      actualError_INVALID_ACTUAL_DATE: 'End date must be within three days after start.',
      actualError_INVALID_ACTUAL_BREAK: 'Invalid break length.',
      actualError_INVALID_ACTUAL_NOTE: 'The note is too long.',
      actualError_AMBIGUOUS_ACTUAL_START: 'Actual start occurs twice. Choose an occurrence.',
      actualError_AMBIGUOUS_ACTUAL_END: 'Actual end occurs twice. Choose an occurrence.',
      actualError_NONEXISTENT_ACTUAL_START: 'Actual start does not exist on this date.',
      actualError_NONEXISTENT_ACTUAL_END: 'Actual end does not exist on this date.',
      actualError_INVALID_ACTUAL_INTERVAL:
        'End must follow start, break must be shorter, and the interval cannot exceed 72 hours.',
    },
  },
};

const language = getLocales()[0]?.languageCode === 'en' ? 'en' : 'tr';

void i18n.use(initReactI18next).init({
  resources,
  lng: language,
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

export default i18n;
