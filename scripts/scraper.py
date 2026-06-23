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
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/cases_vector_pool?content_hash=eq.{h}", headers=headers_sb, timeout=10)
        if r.status_code == 200:
            return len(r.json()) > 0
    except:
        pass
    return False

def metin_embedding_uret(metin):
    """Gemini ile embedding üretir - hallüsinasyon önleme için kritik."""
    if not GEMINI_API_KEY:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GEMINI_API_KEY}"
    data = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": metin}]}
    }
    try:
        r = requests.post(url, json=data, timeout=15)
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
                if len(ham_metin) < 300:
                    continue
                parcalar = akilli_parcala(ham_metin)
                for p in parcalar:
                    if len(p) < 200:
                        continue
                    h = metin_hash(p)
                    if zaten_var_mi(h):
                        atlandi += 1
                        continue
                    vektor = metin_embedding_uret(p)
                    if not vektor:
                        continue
                    data = {'anonymized_text': p, 'niche_area': kaynak['alan'], 'content_hash': h, 'embedding': vektor}
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
            if not vektor:
                continue
            data = {'anonymized_text': parca, 'niche_area': kaynak['alan'], 'content_hash': h, 'embedding': vektor}
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
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/1', 'alan': 'kanunlar'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/3', 'alan': 'khk'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/7', 'alan': 'yonetmelikler'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/9', 'alan': 'tebligler'},
    {'url': 'https://www.mevzuat.gov.tr/MevzuatMetin/19', 'alan': 'cumhurbaskanligi_kararname'},
    {'url': 'https://www.resmigazete.gov.tr', 'alan': 'resmi_gazete'},
    {'url': 'https://ua.mfa.gov.tr', 'alan': 'uluslararasi_anlasma'},
    {'url': 'https://www.tbmm.gov.tr', 'alan': 'tbmm'},
    {'url': 'https://www.rekabet.gov.tr/tr/Sayfa/kararlar', 'alan': 'rekabet'},
    {'url': 'https://www.kvkk.gov.tr', 'alan': 'kvkk'},
    {'url': 'https://www.bddk.org.tr', 'alan': 'bddk'},
    {'url': 'https://www.epdk.gov.tr', 'alan': 'epdk'},
    {'url': 'https://www.spk.gov.tr', 'alan': 'spk'},
    {'url': 'https://www.rtuk.gov.tr', 'alan': 'rtuk'},
    {'url': 'https://www.sigortacilik.gov.tr', 'alan': 'sigortacilik'},
    {'url': 'https://bilirkisilik.adalet.gov.tr', 'alan': 'bilirkisilik'},
    {'url': 'https://www.adlitip.gov.tr', 'alan': 'adli_tip'},
    {'url': 'https://adb.adalet.gov.tr', 'alan': 'adalet_bakanligi'},
    {'url': 'https://www.barobirlik.org.tr', 'alan': 'tbb'},
    {'url': 'https://tbbdergisi.barobirlik.org.tr', 'alan': 'tbb_dergi'},
    {'url': 'https://medya.barobirlik.org.tr', 'alan': 'tbb_yayinlari'},
    {'url': 'https://lawandjustice.taa.gov.tr', 'alan': 'adalet_akademisi'},
    {'url': 'https://www.sgk.gov.tr', 'alan': 'sgk'},
    {'url': 'https://www.calisma.gov.tr', 'alan': 'calisma_bakanligi'},
    {'url': 'https://www.csgb.gov.tr', 'alan': 'csgb'},
    {'url': 'https://www.turkis.org.tr', 'alan': 'turkis'},
    {'url': 'https://www.gtb.gov.tr', 'alan': 'ticaret_bakanligi'},
    {'url': 'https://www.tobb.org.tr', 'alan': 'tobb'},
    {'url': 'https://tuketici.ticaret.gov.tr', 'alan': 'tuketici'},
    {'url': 'https://www.btk.gov.tr', 'alan': 'btk'},
    {'url': 'https://www.saglik.gov.tr', 'alan': 'saglik_bakanligi'},
    {'url': 'https://www.titck.gov.tr', 'alan': 'titck'},
    {'url': 'https://www.ttb.org.tr', 'alan': 'ttb'},
    {'url': 'https://www.tsb.org.tr', 'alan': 'sigorta_birligi'},
    {'url': 'https://www.sbm.org.tr', 'alan': 'sigorta_bilgi_merkezi'},
    {'url': 'https://www.tse.org.tr', 'alan': 'tse'},
    {'url': 'https://www.turkpatent.gov.tr', 'alan': 'turkpatent'},
    {'url': 'https://www.wipo.int/portal/tr', 'alan': 'wipo_tr'},
    {'url': 'https://dergipark.org.tr', 'alan': 'dergipark'},
    {'url': 'https://tez.yok.gov.tr', 'alan': 'yok_tez'},
    {'url': 'https://kezana.com', 'alan': 'kezana'},
    {'url': 'https://acikbilim.yok.gov.tr', 'alan': 'acik_bilim'},
    {'url': 'https://search.trdizin.gov.tr', 'alan': 'trdizin'},
    {'url': 'https://kanunum.com', 'alan': 'kanunum'},
    {'url': 'https://dergipark.org.tr/tr/search?q=is+hukuku', 'alan': 'akademik_is_hukuku'},
    {'url': 'https://dergipark.org.tr/tr/search?q=ticaret+hukuku', 'alan': 'akademik_ticaret'},
    {'url': 'https://dergipark.org.tr/tr/search?q=tuketici+hukuku', 'alan': 'akademik_tuketici'},
    {'url': 'https://dergipark.org.tr/tr/search?q=saglik+hukuku', 'alan': 'akademik_saglik'},
    {'url': 'https://dergipark.org.tr/tr/search?q=sigorta+hukuku', 'alan': 'akademik_sigorta'},
    {'url': 'https://dergipark.org.tr/tr/search?q=insaat+hukuku', 'alan': 'akademik_insaat'},
    {'url': 'https://dergipark.org.tr/tr/search?q=fikri+mulkiyet', 'alan': 'akademik_fikri_mulkiyet'},
    {'url': 'https://dergipark.org.tr/tr/search?q=arabuluculuk', 'alan': 'akademik_arabuluculuk'},
    {'url': 'https://www.wipo.int/amc/en/mediation', 'alan': 'wipo_mediation'},
    {'url': 'https://icsid.worldbank.org/cases/case-database', 'alan': 'icsid'},
    {'url': 'https://uncitral.un.org/en/cases', 'alan': 'uncitral'},
    {'url': 'https://eur-lex.europa.eu', 'alan': 'eurlex'},
    {'url': 'https://hudoc.echr.coe.int', 'alan': 'echr'},
    {'url': 'https://www.worldlii.org/tr', 'alan': 'worldlii_tr'},
    {'url': 'https://www.worldlii.org', 'alan': 'worldlii'},
    {'url': 'https://www.ssrn.com/index.cfm/en/turkey', 'alan': 'ssrn_turkey'},
]

if __name__ == "__main__":
    if not GEMINI_API_KEY:
        print("UYARI: GEMINI_API_KEY bulunamadi. Embedding uretilemez.")
    else:
        toplam_yeni = 0
        toplam_atlandi = 0
        for kaynak in kaynaklar:
            if "dergipark" in kaynak['url'] or "yok" in kaynak['url'] or "ssrn" in kaynak['url']:
                yeni, atlandi = dergipark_ve_pdf_isle(kaynak)
            else:
                yeni, atlandi = standart_web_isle(kaynak)
            toplam_yeni += yeni
            toplam_atlandi += atlandi
            print(f"{kaynak['alan']}: {yeni} yeni, {atlandi} atlandı")
        print(f"\nToplam: {toplam_yeni} yeni kayıt, {toplam_atlandi} duplicate atlandı")
