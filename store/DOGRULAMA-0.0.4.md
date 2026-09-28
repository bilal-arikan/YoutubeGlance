# 0.0.4 düzeltme ve doğrulama

Tarih: 28 Eylül 2026. Ortam: Windows 11, kullanıcının Chrome profili.

## Düzeltilen akış

- İçerik betiği YouTube ana sayfası dahil tüm YouTube yollarında başlatılır.
- Tek bir gezinme/DOM yaşam döngüsü, video sayfasındaki düğmeyi geç yüklenen
  oynatıcıya ekler; oynatıcı değişince yeniden ekler ve video dışındaki
  sayfalardan kaldırır. İlk 15 saniyeyle sınırlı gözlem kaldırıldı.
- Video değişirken devam eden eski altyazı sonucu AI sitesine aktarılmaz.
- Panoya erişilememesi doğrudan AI aktarımını durdurmaz.
- Mesaj kanalı kapanması, geçersiz uzantı bağlamı ve yanıt zaman aşımı görünür
  hata verir; düğme yükleniyor durumunda takılı kalmaz.
- AI sekmesi yüklenirken dinleyici yarışı giderildi. Sekme kapanması,
  yükleme zaman aşımı, editörün bulunamaması ve metni reddetmesi raporlanır.
- Aktarımın dönüş değeri eksik/olumsuzsa hedef editördeki tam istem salt okunur
  kontrolle doğrulanır. Bu kontrol tekrar yapıştırmaz veya tekrar göndermez.

## Otomatik doğrulama

- `npm test -- --runInBand`: 11 grup, 67 test başarılı.
- `npx tsc --noEmit`: başarılı.
- `npm run build`: başarılı.
- `git diff --check`: başarılı.
- ZIP: 11 dosya; manifest hedefleri mevcut; paket güncel derlemeyle eşleşiyor.
- Paket içinde test, kaynak haritası, bağımlılık veya ortam dosyası yok.

Yeni testler ana sayfada gerçek başlangıç, video geçişi, geç oynatıcı,
oynatıcı değişimi, tek düğme, eski altyazı sonucunu reddetme, clipboard reddi,
mesaj kanalı hatası, yükleme yarışı, editör doğrulaması ve otomatik gönderimin
kapalı kalmasını kapsar.

## Canlı kanıt

- Önceki sürümde ana sayfa → video geçişinde düğme yoktu; aynı videoyu tam
  yenilemek düğmeyi getiriyordu.
- 0.0.3 ile ana sayfa/arama → video ve video değiştirme akışlarında tek Glance
  düğmesi görüldü.
- 0.0.3 ile Gemini editöründe doğru video başlığı, özet talimatı ve 237 zaman
  damgası içeren 22.163 karakterlik istem görüldü. Buna rağmen yanlış hata
  bildirimi çıktı; bu nedenle 0.0.4 doğrulama kontrolü eklendi.
- Kullanıcı 0.0.4 sürümünü Chrome'da yeniden yüklediğini doğruladı.
- 0.0.4 canlı denemesinde düğme yükleniyor durumundan çıktı ve
  “AI tab opened. Prompt copied as a backup.” başarı bildirimi görüldü.
- Aynı 0.0.4 denemesinin yeni Gemini sekmesinde görünür editör, doğru başlık,
  özet talimatı, 22.163 karakter ve 237 zaman damgası ayrıca doğrulandı.
- Hiçbir testte AI gönder düğmesine basılmadı; otomatik gönderim kapalı tutuldu.

Chrome'un eklenti yönetimi sayfasına araç erişimi engellendiğinden yeniden
yükleme kullanıcı tarafından yapıldı. Canlı kontrol, bütün desteklenen AI
sağlayıcılarının veya bütün YouTube video türlerinin doğrulandığı anlamına
gelmez.

## Yayın paketi

`../build/youtube-glance-0.0.4-20260928-225026.zip`

SHA-256: `A0F38C18A12550B3E66901C8A09497F5B541A09EE14F8EEA16EBCE5992F21C82`

Mağazadaki önceki paket yerine bu paket yüklenmelidir. Bu çalışma mağazada
incelemeye gönderim veya yayına alma içermez.
