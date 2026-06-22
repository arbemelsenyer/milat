import requests
from bs4 import BeautifulSoup
import os
import json

SUPABASE_URL = "https://oijdnfibboiinogdmlcj.supabase.co"
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

headers_sb = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

kaynaklar = [
    # Türkiye — Mahkeme Kararları
    {'url': 'https://karararama.yargitay.gov.tr', 'alan': 'yargitay'},
    {'url': 'https://emsal.yargitay.gov.tr', 'alan': 'yargitay_emsal'},
    {'url': 'https://www.danistay.gov.tr', 'alan': 'danistay'},
    {'url': 'https://www.anayasa.gov.tr/tr/kararlar', 'alan': 'anayasa'},
    {'url': 'https://www.sayistay.gov.tr', 'alan': 'sayistay'},
    # Türkiye — Mevzuat
    {'url': 'https://mevzuat.gov.tr', 'alan': 'mevzuat'},
    {'url': 'https://www.resmigazete.gov.tr', 'alan': 'resmi_gazete'},
    {'url': 'https://ua.mfa.gov.tr', 'alan': 'uluslararasi_anlasma'},
    {'url': 'https://www.tbmm.gov.tr', 'alan': 'tbmm'},
    # Türkiye — Kurumlar
    {'url': 'https://www.rekabet.gov.tr/tr/Sayfa/kararlar', 'alan': 'rekabet'},
    {'url': 'https://www.kvkk.gov.tr', 'alan': 'kvkk'},
    {'url': 'https://www.bddk.org.tr', 'alan': 'bddk'},
    {'url': 'https://www.epdk.gov.tr', 'alan': 'epdk'},
    {'url': 'https://www.spk.gov.tr', 'alan': 'spk'},
    {'url': 'https://www.rtuk.gov.tr', 'alan': 'rtuk'},
    {'url': 'https://www.rdk.org.tr', 'alan': 'rdk'},
    # Türkiye — Akademik
    {'url': 'https://kanunum.com', 'alan': 'kanunum'},
    {'url': 'https://dergipark.org.tr', 'alan': 'dergipark'},
    {'url': 'https://tez.yok.gov.tr', 'alan': 'yok_tez'},
    {'url': 'https://kezana.com', 'alan': 'kezana'},
    # Uluslararası — Tahkim
    {'url': 'https://www.wipo.int/amc/en/mediation', 'alan': 'wipo'},
    {'url': 'https://icsid.worldbank.org/cases/case-database', 'alan': 'icsid'},
    {'url': 'https://uncitral.un.org/en/cases', 'alan': 'uncitral'},
    # Uluslararası — AB ve AİHM
    {'url': 'https://eur-lex.europa.eu', 'alan': 'eurlex'},
    {'url': 'https://hudoc.echr.coe.int', 'alan': 'echr'},
    # Uluslararası — Genel
    {'url': 'https://www.worldlii.org/tr', 'alan': 'worldlii_tr'},
    {'url': 'https://www.worldlii.org', 'alan': 'worldlii'},
    {'url': 'https://www.nyulawglobal.org/globalex/turkey1.html', 'alan': 'nyu_turkey'},
]

for kaynak in kaynaklar:
    try:
        res = requests.get(kaynak['url'], timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, 'html.parser')
        metinler = [p.get_text(strip=True) for p in soup.find_all(['p','div','td']) if len(p.get_text(strip=True)) > 300]
        print(f"{kaynak['alan']}: {len(metinler)} metin bulundu")
        for metin in metinler[:20]:
            data = {'anonymized_text': metin[:2000], 'niche_area': kaynak['alan']}
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/cases_vector_pool",
                headers=headers_sb,
                data=json.dumps(data)
            )
        print(f"{kaynak['alan']} tamamlandi")
    except Exception as e:
        print(f"Hata {kaynak['alan']}: {e}")

print("Tum kaynaklar tamamlandi!")
