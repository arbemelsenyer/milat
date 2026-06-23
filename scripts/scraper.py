python
import os
import io
import json
import hashlib
import requests
from bs4 import BeautifulSoup
import pypdf

SUPABASE_URL = "https://oijdnfibboiinogdmlcj.supabase.co"
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '') 

headers_sb = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def metin_hash(metin):
    return hashlib.md5(metin.encode('utf-8')).hexdigest()

def zaten_var_mi(h):
    url = f"{SUPABASE_URL}/rest/v1/cases_vector_pool?content_hash=eq.{h}"
    try:
        r = requests.get(url, headers=headers_sb, timeout=10)
        if r.status_code == 200:
            return len(r.json()) > 0
    except:
        pass
    return False

def metin_embedding_uret(metin):
    if not GEMINI_API_KEY:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": metin}]},
        "outputDimensionality": 1536 
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=15)
        return r.json()['embedding']['values']
    except:
        return None

def akilli_parcala(metin, chunk_size=1500, overlap=200):
    sentences = metin.split('. ')
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) < chunk_size:
            current_chunk += sentence + ". "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + ". "
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks

def pdf_metin_ayikla(pdf_content):
    try:
        pdf_file = io.BytesIO(pdf_content)
        reader = pypdf.PdfReader(pdf_file)
        tam_metin = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                tam_metin += text + "\n"
        return tam_metin
    except:
        return ""

def dergipark_ve_pdf_isle(kaynak):
    yeni, atlandi = 0, 0
    try:
        res = requests.get(kaynak['url'], timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, 'html.parser')
        linkler = set()
        for a in soup.find_all('a', href=True):
            if "/pub/" in a['href'] or "/download/" in a['href'] or "pdf" in a['href'].lower():
                linkler.add(a['href'] if a['href'].startswith("http") else "https:" + a['href'])
        for link in list(linkler)[:3]:
            try:
                if "download" in link or link.endswith(".pdf"):
                    pdf_res = requests.get(link, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
                    ham_metin = pdf_metin_ayikla(pdf_res.content)
                else:
                    detay = requests.get(link, timeout=20, headers={'User-Agent': 'Mozilla/5.0'})
                    d_soup = BeautifulSoup(detay.text, 'html.parser')
                    pdf_url = None
                    for aa in d_soup.find_all('a', href=True):
                        if "/download/article-file/" in aa['href']:
                            pdf_url = aa['href'] if aa['href'].startswith("http") else "https:" + aa['href']
                            break
                    if pdf_url:
                        pdf_res = requests.get(pdf_url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
                        ham_metin = pdf_metin_ayikla(pdf_res.content)
                    else:
                        continue
                if len(ham_metin) < 300: continue
                parcalar = akilli_parcala(ham_metin)
                for p in parcalar:
                    if len(p) < 200: continue
                    h = metin_hash(p)
                    if zaten_var_mi(h):
                        atlandi += 1
                        continue
                    vektor = metin_embedding_uret(p)
                    if not vektor: continue 
                    data = {
                        'anonymized_text': p, 
                        'niche_area': kaynak['alan'], 
                        'content_hash': h,
                        'embedding': vektor 
                    }
                    requests.post(f"{SUPABASE_URL}/rest/v1/cases_vector_pool", headers=headers_sb, json=data)
                    yeni += 1
            except:
                continue
    except Exception as e:
        print(f"Hata ({kaynak['alan']}): {e}")
    return yeni, atlandi

def standart_web_isle(kaynak):
    yeni, atlandi = 0, 0
    try:
        res = requests.get(kaynak['url'], timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, 'html.parser')
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()
        metinler = [p.get_text(strip=True) for p in soup.find_all(['p', 'div', 'td']) if len(p.get_text(strip=True)) > 300]
        tum_metin = " ".join(metinler)
        parcalar = akilli_parcala(tum_metin)
        for parca in parcalar[:10]:
            h = metin_hash(parca)
            if zaten_var_mi(h):
                atlandi += 1
                continue
            vektor = metin_embedding_uret(parca)
            if not vektor: continue
            data = {
                'anonymized_text': parca, 
                'niche_area': kaynak['alan'], 
                'content_hash': h,
                'embedding': vektor
            }
            requests.post(f"{SUPABASE_URL}/rest/v1/cases_vector_pool", headers=headers_sb, json=data)
            yeni += 1
    except Exception as e:
        print(f"Hata ({kaynak['alan']}): {e}")
    return yeni, atlandi

kaynaklar = [
    {'url': 'https://karararama.yargitay.gov.tr', 'alan': 'yargitay'},
    {'url': 'https://emsal.yargitay.gov.tr', 'alan': 'yargitay_emsal'},
    {'url': 'https://www.danistay.gov.tr', 'alan': 'danistay'},
    {'url': 'https://www.anayasa.gov.tr/tr/kararlar', 'alan': 'anayasa'},
    {'url': 'https://www.sayistay.gov.tr', 'alan': 'sayistay'},
    {'url': 'https://www.mevzuat.gov.tr', 'alan': 'mevzuat'},
    {'url': 'https://www.resmigazete.gov.tr', 'alan': 'resmi_gazete'},
    {'url': 'https://www.rekabet.gov.tr/tr/Sayfa/kararlar', 'alan': 'rekabet'},
    {'url': 'https://www.kvkk.gov.tr', 'alan': 'kvkk'},
    {'url': 'https://bilirikisilik.adalet.gov.tr', 'alan': 'bilirkisilik'},
    {'url': 'https://www.barobirlik.org.tr', 'alan': 'tbb'},
    {'url': 'https://tbbdergisi.barobirlik.org.tr', 'alan': 'tbb_dergi'},
    {'url': 'https://www.sgk.gov.tr', 'alan': 'sgk'},
    {'url': 'https://www.calisma.gov.tr', 'alan': 'calisma_bakanligi'},
    {'url': 'https://www.gtb.gov.tr', 'alan': 'ticaret_bakanligi'},
    {'url': 'https://tuketici.ticaret.gov.tr', 'alan': 'tuketici'},
    {'url': 'https://www.saglik.gov.tr', 'alan': 'saglik_bakanligi'},
    {'url': 'https://www.tsb.org.tr', 'alan': 'sigorta_birligi'},
    {'url': 'https://www.tse.org.tr', 'alan': 'tse'},
    {'url': 'https://www.turkpatent.gov.tr', 'alan': 'turkpatent'},
    {'url': 'https://dergipark.org.tr', 'alan': 'dergipark'},
    {'url': 'https://dergipark.org.tr/tr/search?q=is+hukuku', 'alan': 'akademik_is_hukuku'},
    {'url': 'https://dergipark.org.tr/tr/search?q=ticaret+hukuku', 'alan': 'akademik_ticaret'},
    {'url': 'https://dergipark.org.tr/tr/search?q=saglik+hukuku', 'alan': 'akademik_saglik'},
    {'url': 'https://dergipark.org.tr/tr/search?q=insaat+hukuku', 'alan': 'akademik_insaat'}
]

if __name__ == "__main__":
    if not GEMINI_API_KEY:
        print("⚠️ UYARI: 'GEMINI_API_KEY' bulunamadı. Lütfen terminale tokenı tanımlayın.")
    else:
        print("🚀 Gemini destekli Veri Avcısı başlatıldı...")
        for kaynak in kaynaklar:
            if "dergipark" in kaynak['url']:
                yeni, atlandi = dergipark_ve_pdf_isle(kaynak)
            else:
                yeni, atlandi = standart_web_isle(kaynak)
            print(f"{kaynak['alan']}: {yeni} yeni veri, {atlandi} atlandı")
