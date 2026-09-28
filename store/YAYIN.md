# Chrome Web Store yayın hazırlığı

28 Eylül 2026: Kullanıcı mağaza başvurusunu incelemeye gönderdiğini bildirdi.
Hazırlanan son sürüm 0.0.4'tür. Mağaza onayı henüz doğrulanmadı.

Mağaza bağlantısı: [YoutubeGlance](https://chromewebstore.google.com/detail/bnmelfbenpookpgolmnaiipmicmfbbpb).

## Doğrulama

- Derleme başarılı.
- TypeScript denetimi başarılı.
- On bir test grubundaki 67 test başarılı.
- Canlı test ve düzeltme ayrıntıları: [0.0.4 doğrulama raporu](DOGRULAMA-0.0.4.md).

## Paketleme

Proje klasöründe `powershell -ExecutionPolicy Bypass -File scripts/package-store.ps1`
çalıştırılır. Paket `build/` altında oluşur; test dosyaları, eski derleme
kalıntıları, kaynak haritaları ve geliştirme bağımlılıkları pakete alınmaz.
Bu dosya teknik yükleme paketidir; yayın onayı anlamına gelmez.

## Mağaza başvurusu

İngilizce mağaza alanlarının taslağı [listing.json](listing.json) dosyasındadır.
Canlı tarayıcı kontrolü tamamlandı; sonuçlar yukarıdaki rapordadır. Mağaza
formunun son içeriği ve gizlilik politikası adresi bu depoda doğrulanmadı.
İzin listesinde `openai.com`,
`anthropic.com`, `x.com` ve yinelenen/örtüşen alan kalıpları bulunduğundan,
gerekli izinler bir sonraki güncellemede canlı kullanım akışına göre gözden geçirilmelidir.

Gizlilik beyanı yalnızca “veri toplamıyor” denilerek geçilmemelidir: video
başlığı, altyazı ve özel istem içeriği seçilen yapay zekâ sitesine yapıştırılır;
otomatik gönderme seçeneği açıksa gönderilir. Tercihler tarayıcıda yerel olarak
tutulur. Üçüncü taraf sitelerinin veriyi işlemesi kendi politikalarına bağlıdır.

Kaynaklar: [Geliştirici kaydı](https://developer.chrome.com/docs/webstore/register),
[yayın süreci](https://developer.chrome.com/docs/webstore/publish).
