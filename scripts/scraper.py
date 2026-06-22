import requests
from bs4 import BeautifulSoup
from supabase import create_client
import os

supabase = create_client(
    os.environ['SUPABASE_URL'],
    os.environ['SUPABASE_KEY']
)

kaynaklar = [
    {'url': 'https://karararama.yargitay.gov.tr', 'alan': 'yargitay'},
    {'url': 'https://www.danistay.gov.tr/kararlar', 'alan': 'danistay'},
    {'url': 'https://www.anayasa.gov.tr/tr/kararlar', 'alan': 'anayasa'},
    {'url': 'https://www.rekabet.gov.tr/tr/Sayfa/kararlar', 'alan': 'rekabet'},
    {'url': 'https://www.kvkk.gov.tr/Icerik/6883/Kararlari', 'alan': 'kvkk'},
]

for kaynak in kaynaklar:
    try:
        res = requests.get(kaynak['url'], timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, 'html.parser')
        kararlar = soup.find_all(['div', 'p', 'td'])
        for karar in kararlar[:50]:
            metin = karar.get_text(strip=True)
            if len(metin) > 200:
                supabase.table('cases_vector_pool').insert({
                    'anonymized_text': metin,
                    'niche_area': kaynak['alan'],
                }).execute()
        print(f"{kaynak['alan']} tamamlandi")
    except Exception as e:
        print(f"Hata: {kaynak['alan']} - {e}")
