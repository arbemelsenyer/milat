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
    # Mahkeme Kararları
    {'url': 'https://karararama.yargitay.gov.tr', 'alan': 'yargitay'},
    {'url': 'https://emsal.yargitay.gov.tr', 'alan': 'yargitay_emsal'},
    {'url': 'https://www.danistay.gov.tr', 'alan': 'danistay'},
    {'url': 'https://www.anayasa.gov.tr/tr/kararlar', 'alan': 'anayasa'},
    {'url': 'https://www.sayistay.gov.tr', 'alan': 'sayistay'},
    # Mevzuat
    {'url': 'https://www.mevzuat.gov.tr', 'alan': 'mevzuat'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/1', 'alan': 'kanunlar'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/3', 'alan': 'khk'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/7', 'alan': 'yonetmelikler'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/9', 'alan': 'tebligler'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/19', 'alan': 'cumhurbaskanligi_kararname'},
    {'url': 'https://www.resmigazete.gov.tr', 'alan': 'resmi_gazete'},
    {'url': 'https://ua.mfa.gov.tr', 'alan': 'uluslararasi_anlasma'},
    {'url': 'https://www.tbmm.gov.tr', 'alan': 'tbmm'},
    # Kurumlar
    {'url': 'https://www.rekabet.gov.tr/tr/Sayfa/kararlar', 'alan': 'rekabet'},
    {'url': 'https://www.kvkk.gov.tr', 'alan': 'kvkk'},
    {'url': 'https://www.bddk.org.tr', 'alan': 'bddk'},
    {'url': 'https://www.epdk.gov.tr', 'alan': 'epdk'},
    {'url': 'https://www.spk.gov.tr', 'alan': 'spk'},
    {'url': 'https://www.rtuk.gov.tr', 'alan': 'rtuk'},
    {'url': 'https://www.rdk.org.tr', 'alan': 'rdk'},
    # Meslek Kuruluşları
    {'url': 'https://www.barobirlik.org.tr', 'alan': 'tbb'},
    {'url': 'https://adb.adalet.gov.tr', 'alan': 'adalet_bakanligi'},
    # Akademik
    {'url': 'https://kanunum.com', 'alan': 'kanunum'},
    {'url': 'https://dergipark.org.tr', 'alan': 'dergipark'},
    {'url': 'https://tez.yok.gov.tr', 'alan': 'yok_tez'},
    {'url': 'https://kezana.com', 'alan': 'kezana'},
    {'url': 'https://acikbilim.yok.gov.tr', 'alan': 'acik_bilim'},
    # Uluslararası
    {'url': 'https://www.wipo.int/amc/en/mediation', 'alan': 'wipo'},
    {'url': 'https://icsid.worldbank.org/cases/case-database', 'alan': 'icsid'},
    {'url': 'https://uncitral.un.org/en/cases', 'alan': 'uncitral'},
    {'url': 'https://eur-lex.europa.eu', 'alan': 'eurlex'},
    {'url': 'https://hudoc.echr.coe.int', 'alan': 'echr'},
    {'url': 'https://www.worldlii.org/tr', 'alan': 'worldlii_tr'},
    {'url': 'https://www.worldlii.org', 'alan': 'worldlii'},
    {'url': 'https://www.nyulawglobal.org/globalex/turkey1.html', 'alan': 'nyu_turkey'},
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
