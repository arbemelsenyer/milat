import requests
from bs4 import BeautifulSoup
import os
import json
import hashlib

SUPABASE_URL = "https://oijdnfibboiinogdmlcj.supabase.co"
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

headers_sb = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def metin_hash(metin):
    return hashlib.md5(metin.encode()).hexdigest()

def zaten_var_mi(h):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/cases_vector_pool?content_hash=eq.{h}",
        headers=headers_sb
    )
    try:
        return len(r.json()) > 0
    except:
        return False

kaynaklar = [
    # MAHKEME KARARLARI
    {'url': 'https://karararama.yargitay.gov.tr', 'alan': 'yargitay'},
    {'url': 'https://emsal.yargitay.gov.tr', 'alan': 'yargitay_emsal'},
    {'url': 'https://www.danistay.gov.tr', 'alan': 'danistay'},
    {'url': 'https://www.anayasa.gov.tr/tr/kararlar', 'alan': 'anayasa'},
    {'url': 'https://www.sayistay.gov.tr', 'alan': 'sayistay'},

    # MEVZUAT
    {'url': 'https://www.mevzuat.gov.tr', 'alan': 'mevzuat'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/1', 'alan': 'kanunlar'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/3', 'alan': 'khk'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/7', 'alan': 'yonetmelikler'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/9', 'alan': 'tebligler'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/19', 'alan': 'cumhurbaskanligi_kararname'},
    {'url': 'https://www.resmigazete.gov.tr', 'alan': 'resmi_gazete'},
    {'url': 'https://ua.mfa.gov.tr', 'alan': 'uluslararasi_anlasma'},
    {'url': 'https://www.tbmm.gov.tr', 'alan': 'tbmm'},

    # KURUMLAR
    {'url': 'https://www.rekabet.gov.tr/tr/Sayfa/kararlar', 'alan': 'rekabet'},
    {'url': 'https://www.kvkk.gov.tr', 'alan': 'kvkk'},
    {'url': 'https://www.bddk.org.tr', 'alan': 'bddk'},
    {'url': 'https://www.epdk.gov.tr', 'alan': 'epdk'},
    {'url': 'https://www.spk.gov.tr', 'alan': 'spk'},
    {'url': 'https://www.rtuk.gov.tr', 'alan': 'rtuk'},
    {'url': 'https://www.sigortacilik.gov.tr', 'alan': 'sigortacilik'},

    # BILIRKISI & MUTALAALAR
    {'url': 'https://bilirkisilik.adalet.gov.tr', 'alan': 'bilirkisilik'},
    {'url': 'https://www.adlitip.gov.tr', 'alan': 'adli_tip'},
    {'url': 'https://adb.adalet.gov.tr', 'alan': 'adalet_bakanligi'},

    # MESLEK KURULUSLARI
    {'url': 'https://www.barobirlik.org.tr', 'alan': 'tbb'},
    {'url': 'https://tbbdergisi.barobirlik.org.tr', 'alan': 'tbb_dergi'},
    {'url': 'https://medya.barobirlik.org.tr', 'alan': 'tbb_yayinlari'},
    {'url': 'https://lawandjustice.taa.gov.tr', 'alan': 'adalet_akademisi'},

    # ISCI-ISVEREN UYUSMAZLIKLARI
    {'url': 'https://www.sgk.gov.tr', 'alan': 'sgk'},
    {'url': 'https://www.calisma.gov.tr', 'alan': 'calisma_bakanligi'},
    {'url': 'https://www.csgb.gov.tr', 'alan': 'csgb'},
    {'url': 'https://www.turkis.org.tr', 'alan': 'turkis'},
    {'url': 'https://calismahayatidergisi.gov.tr', 'alan': 'calisma_hayati_dergi'},

    # TICARI UYUSMAZLIKLAR
    {'url': 'https://www.gtb.gov.tr', 'alan': 'ticaret_bakanligi'},
    {'url': 'https://www.tobb.org.tr', 'alan': 'tobb'},
    {'url': 'https://www.tesk.org.tr', 'alan': 'tesk'},

    # TUKETICI UYUSMAZLIKLARI
    {'url': 'https://tuketici.ticaret.gov.tr', 'alan': 'tuketici'},
    {'url': 'https://www.btk.gov.tr', 'alan': 'btk'},

    # SAGLIK HUKUKU
    {'url': 'https://www.saglik.gov.tr', 'alan': 'saglik_bakanligi'},
    {'url': 'https://www.titck.gov.tr', 'alan': 'titck'},
    {'url': 'https://www.ttb.org.tr', 'alan': 'ttb'},
    {'url': 'https://www.thsk.gov.tr', 'alan': 'thsk'},

    # SIGORTA UYUSMAZLIKLARI
    {'url': 'https://www.tsb.org.tr', 'alan': 'sigorta_birligi'},
    {'url': 'https://www.sbm.org.tr', 'alan': 'sigorta_bilgi_merkezi'},

    # INSAAT & YAPI
    {'url': 'https://www.tse.org.tr', 'alan': 'tse'},
    {'url': 'https://www.csb.gov.tr', 'alan': 'cevre_bakanligi'},
    {'url': 'https://www.tmb.org.tr', 'alan': 'mimarlar_birligi'},

    # FIKRI SINAI MULKIYET
    {'url': 'https://www.turkpatent.gov.tr', 'alan': 'turkpatent'},
    {'url': 'https://www.wipo.int/portal/tr', 'alan': 'wipo_tr'},

    # AKADEMIK - GENEL
    {'url': 'https://dergipark.org.tr', 'alan': 'dergipark'},
    {'url': 'https://tez.yok.gov.tr', 'alan': 'yok_tez'},
    {'url': 'https://kezana.com', 'alan': 'kezana'},
    {'url': 'https://acikbilim.yok.gov.tr', 'alan': 'acik_bilim'},
    {'url': 'https://search.trdizin.gov.tr', 'alan': 'trdizin'},
    {'url': 'https://kanunum.com', 'alan': 'kanunum'},

    # AKADEMIK - ISCI-ISVEREN
    {'url': 'https://dergipark.org.tr/tr/search?q=is+hukuku', 'alan': 'akademik_is_hukuku'},
    {'url': 'https://dergipark.org.tr/tr/search?q=sozyal+guvenlik', 'alan': 'akademik_sosyal_guvenlik'},

    # AKADEMIK - TICARI
    {'url': 'https://dergipark.org.tr/tr/search?q=ticaret+hukuku', 'alan': 'akademik_ticaret'},
    {'url': 'https://dergipark.org.tr/tr/search?q=sirketler+hukuku', 'alan': 'akademik_sirket'},

    # AKADEMIK - TUKETICI
    {'url': 'https://dergipark.org.tr/tr/search?q=tuketici+hukuku', 'alan': 'akademik_tuketici'},

    # AKADEMIK - SAGLIK
    {'url': 'https://dergipark.org.tr/tr/search?q=saglik+hukuku', 'alan': 'akademik_saglik'},
    {'url': 'https://dergipark.org.tr/tr/search?q=tibbi+uygulama', 'alan': 'akademik_tip'},

    # AKADEMIK - SIGORTA
    {'url': 'https://dergipark.org.tr/tr/search?q=sigorta+hukuku', 'alan': 'akademik_sigorta'},

    # AKADEMIK - INSAAT
    {'url': 'https://dergipark.org.tr/tr/search?q=insaat+hukuku', 'alan': 'akademik_insaat'},
    {'url': 'https://dergipark.org.tr/tr/search?q=yapi+denetim', 'alan': 'akademik_yapi'},

    # AKADEMIK - FIKRI MULKIYET
    {'url': 'https://dergipark.org.tr/tr/search?q=fikri+mulkiyet', 'alan': 'akademik_fikri_mulkiyet'},
    {'url': 'https://dergipark.org.tr/tr/search?q=patent+marka', 'alan': 'akademik_patent'},

    # AKADEMIK - ARABULUCULUK
    {'url': 'https://dergipark.org.tr/tr/search?q=arabuluculuk', 'alan': 'akademik_arabuluculuk'},
    {'url': 'https://dergipark.org.tr/tr/search?q=alternatif+uyusmazlik', 'alan': 'akademik_adr'},

    # ULUSLARARASI - TAHKIM
    {'url': 'https://www.wipo.int/amc/en/mediation', 'alan': 'wipo_mediation'},
    {'url': 'https://icsid.worldbank.org/cases/case-database', 'alan': 'icsid'},
    {'url': 'https://uncitral.un.org/en/cases', 'alan': 'uncitral'},
    {'url': 'https://iccwbo.org/dispute-resolution', 'alan': 'icc'},
    {'url': 'https://legal.un.org', 'alan': 'un_hukuk'},

    # ULUSLARARASI - AB VE AIHM
    {'url': 'https://eur-lex.europa.eu', 'alan': 'eurlex'},
    {'url': 'https://hudoc.echr.coe.int', 'alan': 'echr'},

    # ULUSLARARASI - GENEL
    {'url': 'https://www.worldlii.org/tr', 'alan': 'worldlii_tr'},
    {'url': 'https://www.worldlii.org', 'alan': 'worldlii'},
    {'url': 'https://www.nyulawglobal.org/globalex/turkey1.html', 'alan': 'nyu_turkey'},
    {'url': 'https://jus.uio.no/pluricourts', 'alan': 'pluricourts'},
    {'url': 'https://www.ssrn.com/index.cfm/en/turkey', 'alan': 'ssrn_turkey'},
    {'url': 'https://academic.oup.com/jiplp', 'alan': 'oxford_ip'},
]

toplam_yeni = 0
toplam_atlandi = 0

for kaynak in kaynaklar:
    try:
        res = requests.get(kaynak['url'], timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, 'html.parser')
        metinler = [p.get_text(strip=True) for p in soup.find_all(['p','div','td']) if len(p.get_text(strip=True)) > 300]
        yeni = 0
        atlandi = 0
        for metin in metinler[:20]:
            h = metin_hash(metin)
            if zaten_var_mi(h):
                atlandi += 1
                continue
            data = {'anonymized_text': metin[:2000], 'niche_area': kaynak['alan'], 'content_hash': h}
            requests.post(f"{SUPABASE_URL}/rest/v1/cases_vector_pool", headers=headers_sb, data=json.dumps(data))
            yeni += 1
        toplam_yeni += yeni
        toplam_atlandi += atlandi
        print(f"{kaynak['alan']}: {yeni} yeni, {atlandi} atlandı")
    except Exception as e:
        print(f"Hata {kaynak['alan']}: {e}")

print(f"\nToplam: {toplam_yeni} yeni kayıt, {toplam_atlandi} duplicate atlandı")
