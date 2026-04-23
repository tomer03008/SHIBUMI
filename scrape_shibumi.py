"""
Shibumi Real Estate Scraper
============================
Scrapes all active (non-sold, non-inactive) properties from shibumi.co.il
and saves their details (title, price, specs, description, images) locally.

Skip keywords in property title:
  - לא אקטואלי   (not current)
  - לא רלוונטי   (not relevant)
  - נמכר          (sold)
  - הושכר         (rented)

Output structure:
  shibumi_properties/
    properties.json           <- all property data
    skipped_properties.txt    <- titles of skipped listings
    images/
      <property-slug>/
        image1.jpeg ...

Usage:
  python scrape_shibumi.py
"""

import os
import re
import json
import time
import hashlib
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse, unquote
from bs4 import BeautifulSoup
from tqdm import tqdm

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL        = "https://shibumi.co.il"
LISTINGS_URL    = "https://shibumi.co.il/%D7%A0%D7%9B%D7%A1%D7%99%D7%9D/"
OUTPUT_DIR      = "shibumi_properties"
IMAGES_DIR      = os.path.join(OUTPUT_DIR, "images")
DATA_FILE       = os.path.join(OUTPUT_DIR, "properties.json")
REQUEST_DELAY   = 1.5   # seconds between requests (be polite to the server)

# Keywords that mark a property as sold / inactive — skip those
SKIP_KEYWORDS = [
    "לא אקטואלי",
    "לא רלוונטי",
    "לא רלווינטי",
    "נמכר",
    "הושכר",
]

# Substrings in image URLs that mark them as non-property images to exclude
# NOTE: bfi_thumb is the Jupiter/MK gallery plugin folder — we KEEP those,
#       but filter dummy placeholders and logos within it.
IMAGE_EXCLUDE = [
    "logo", "dummy", "flag",
    "favicon", "shibumi-bird",
    "facebook", "tr?id=",
    "logologo", "logo-white",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
}

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("shibumi_scrape.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

session = requests.Session()
session.headers.update(HEADERS)

# ── Helper utilities ──────────────────────────────────────────────────────────

def should_skip(title: str) -> bool:
    """Return True if title contains any skip keyword."""
    for kw in SKIP_KEYWORDS:
        if kw in title:
            return True
    return False


def safe_slug(name: str, max_len: int = 80) -> str:
    """Convert a property name to a safe filesystem folder name."""
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    name = name.strip().strip(".")
    name = re.sub(r"\s+", "_", name)
    return name[:max_len]


def get_soup(url: str) -> BeautifulSoup | None:
    """Fetch URL, return BeautifulSoup or None on error."""
    try:
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        return BeautifulSoup(resp.content, "html.parser")
    except requests.RequestException as e:
        log.error(f"Failed to fetch {url}: {e}")
        return None


def get_html(url: str) -> str:
    """Fetch URL, return raw HTML text or empty string on error."""
    try:
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        return resp.text
    except requests.RequestException as e:
        log.error(f"Failed to fetch {url}: {e}")
        return ""


def download_image(img_url: str, dest_folder: str) -> str | None:
    """Download an image to dest_folder; return local path or None."""
    try:
        resp = session.get(img_url, timeout=30, stream=True)
        resp.raise_for_status()

        parsed = urlparse(img_url)
        basename = os.path.basename(unquote(parsed.path)).split("?")[0]
        if not basename or "." not in basename:
            ext = resp.headers.get("Content-Type", "image/jpeg").split("/")[-1].split(";")[0].strip()
            basename = hashlib.md5(img_url.encode()).hexdigest() + "." + ext

        local_path = os.path.join(dest_folder, basename)
        if os.path.exists(local_path):
            return local_path  # already downloaded

        with open(local_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        return local_path
    except Exception as e:
        log.warning(f"Could not download {img_url}: {e}")
        return None


# ── Step 1: collect all property card links ───────────────────────────────────

def get_all_property_links() -> list[dict]:
    """
    Crawl the listings page (handles pagination) and return
    a list of {"title": ..., "url": ...} for every card found.
    """
    links = []
    page_url = LISTINGS_URL

    while page_url:
        log.info(f"Fetching listing page: {page_url}")
        soup = get_soup(page_url)
        if not soup:
            break

        # Jupiter MK theme uses article.mk-portfolio-item for property cards
        cards = soup.select("article.mk-portfolio-item")
        if not cards:
            # Fallback: any article
            cards = soup.select("article")

        log.info(f"  Found {len(cards)} cards on this page")

        for card in cards:
            a_tag = card.find("a", href=True)
            if not a_tag:
                continue
            href = a_tag.get("href", "")
            if not href.startswith("http"):
                href = urljoin(BASE_URL, href)

            # Title from heading tag
            h_tag = card.find(["h1", "h2", "h3", "h4", "h5"])
            title = h_tag.get_text(strip=True) if h_tag else a_tag.get_text(strip=True)

            if href and title:
                links.append({"title": title, "url": href})

        # Pagination
        next_link = (
            soup.select_one("a.next.page-numbers")
            or soup.select_one(".pagination a[rel='next']")
        )
        page_url = next_link["href"] if next_link else None

        time.sleep(REQUEST_DELAY)

    # Deduplicate by URL
    seen, unique = set(), []
    for item in links:
        if item["url"] not in seen:
            seen.add(item["url"])
            unique.append(item)

    log.info(f"Total unique property links: {len(unique)}")
    return unique


# ── Step 2: extract images from raw HTML via regex ────────────────────────────

def extract_images_from_html(html: str) -> list[str]:
    """
    חילוץ תמונות הנכס בלבד מתוך עמוד הנכס.

    אלגוריתם:
    1. מסיר מה-HTML: header, footer, nav, related-posts (תמונות מנכסים אחרים)
    2. מוצא את כל URLs של תמונות uploads שנשארו
    3. מפריד בין תמונות "רגילות" (מתיקיית uploads/YYYY/MM) ל-bfi_thumb (thumbnail plugin)
    4. מכין regular images: מסיר suffix של resize (-300x169 וכד'), מוחק כפולות
    5. bfi_thumb: מסיר hash suffix, ומוסיף רק אם אין כבר regular עם אותו שם בסיס
    6. מחזיר: regular + bfi_thumb ייחודיים בלבד
    """
    # שלב 1 – הסר אלמנטי עיצוב האתר + related posts
    soup = BeautifulSoup(html, "html.parser")
    for sel in [
        "header", "footer", "nav",
        ".mk-header", ".mk-header-holder", ".mk-footer", "#mk-footer",
        ".portfolio-similar-posts", ".portfolio-similar-posts-image",
        ".similar-posts", ".related-posts",
    ]:
        for el in soup.select(sel):
            el.decompose()
    clean_html = str(soup)

    # שלב 2 – regex scan לכל URLs של תמונות
    pattern = r"https://shibumi\.co\.il/wp-content/uploads/[^\s\"'<>\\]+\.(?:jpg|jpeg|png|webp)"
    raw = re.findall(pattern, clean_html, re.IGNORECASE)

    # שלב 3 – סינון תמונות לא רלוונטיות
    regular_raw, bfi_raw = [], []
    for url in raw:
        if any(ex in url.lower() for ex in IMAGE_EXCLUDE):
            continue
        if "bfi_thumb" in url:
            bfi_raw.append(url)
        else:
            regular_raw.append(url)

    # שלב 4 – regular: dedup לפי שם קובץ (ללא suffix resize)
    regular_seen: dict[str, str] = {}  # basename_lower → full_url
    for url in regular_raw:
        clean_url = re.sub(r"-\d+x\d+(\.\w+)$", r"\1", url)
        basename = clean_url.split("/")[-1].lower()
        if basename not in regular_seen:
            regular_seen[basename] = clean_url

    # שלב 5 – bfi_thumb: dedup לפי שם בסיס (ללא hash), הוסף רק אם אין regular תואם
    bfi_seen: dict[str, str] = {}  # base_lower → full_url
    for url in bfi_raw:
        fname = url.split("/")[-1]
        # שם בסיס = הכל לפני ה-hash (~40 תווים אלפאנומריים לפני הסיומת)
        base = re.sub(r"-[a-z0-9]{28,60}(\.\w+)$", "", fname, flags=re.IGNORECASE)
        base_lower = base.lower()
        if base_lower not in bfi_seen:
            bfi_seen[base_lower] = url

    # הוסף bfi רק אם אין regular עם אותו שם בסיס
    bfi_unique = [
        url for base, url in bfi_seen.items()
        if not any(base in reg_base for reg_base in regular_seen.keys())
    ]

    return list(regular_seen.values()) + bfi_unique


# ── Step 3: scrape a single property page ─────────────────────────────────────

def scrape_property(url: str, listing_title: str) -> dict:
    """
    Scrape one property page. Returns a dict with all available fields.

    The Jupiter/MK theme structure for each property:
      - h1 inside .mk-text-block  → title
      - .mk-text-block with h3 + p(s)  → key/value spec pairs
        e.g. h3="מחיר", p="28,000,000 ש\"ח"
      - .mk-text-block with h3="תיאור" or h3="פרטים" → description
      - wp-content/uploads images embedded throughout the HTML
    """
    html = get_html(url)
    if not html:
        return {}

    soup = BeautifulSoup(html.encode("utf-8"), "html.parser")
    data: dict = {"url": url}

    # ── Title ────────────────────────────────────────────────────────────────
    h1 = soup.find("h1")
    data["title"] = h1.get_text(strip=True) if h1 else listing_title

    # ── Categories ───────────────────────────────────────────────────────────
    cats = []
    for a in soup.select(".entry-categories a, .property-categories a, .tags a"):
        cats.append(a.get_text(strip=True))
    data["categories"] = cats

    # ── Specs + price + description ──────────────────────────────────────────
    # Each .mk-text-block has an <h3> label + <p> value(s)
    details: dict = {}
    price = ""
    description = ""
    features_list = []

    for block in soup.select(".mk-text-block"):
        h3 = block.find("h3")
        if not h3:
            continue  # no structured label → skip (title h1 block, etc.)

        label = h3.get_text(strip=True)
        # Values are all <p> tags in this block
        paras = [p.get_text(strip=True) for p in block.find_all("p") if p.get_text(strip=True)]
        value = "\n".join(paras)

        if not label:
            continue

        # Price
        if label in ("מחיר", "price"):
            price = value
        # Description
        elif label in ("תיאור", "description"):
            description = value
        # Features / bullet list
        elif label in ("פרטים", "features", "מאפיינים"):
            features_list = paras  # each para = one feature bullet
        # Any other key → store as detail
        else:
            details[label] = value

    data["price"]        = price
    data["details"]      = details
    data["features"]     = features_list
    data["description"]  = description

    # Fallback description from paragraphs if none found above
    if not description:
        paras = [p.get_text(strip=True) for p in soup.select("p") if len(p.get_text(strip=True)) > 60]
        data["description"] = "\n\n".join(paras[:12])

    # ── Images ───────────────────────────────────────────────────────────────
    data["image_urls"] = extract_images_from_html(html)

    return data


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(IMAGES_DIR, exist_ok=True)

    # 1. Collect all listing cards
    all_links = get_all_property_links()

    # 2. Filter: skip sold / inactive
    active, skipped_titles = [], []
    for item in all_links:
        if should_skip(item["title"]):
            skipped_titles.append(item["title"])
            log.info(f"  [SKIP] {item['title']}")
        else:
            active.append(item)

    print(f"\n{'='*60}")
    print(f"Total listings found : {len(all_links)}")
    print(f"  Active (to save)   : {len(active)}")
    print(f"  Skipped            : {len(skipped_titles)}")
    print(f"{'='*60}\n")

    # Save skipped list for reference
    with open(os.path.join(OUTPUT_DIR, "skipped_properties.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(skipped_titles))

    # 3. Scrape each active property
    properties = []

    for item in tqdm(active, desc="Scraping"):
        log.info(f"  Scraping: {item['title']}")

        prop = scrape_property(item["url"], item["title"])
        if not prop:
            log.warning(f"  Empty result for {item['url']}")
            continue

        # 4. Download images
        slug = safe_slug(prop.get("title") or item["title"])
        prop_img_dir = os.path.join(IMAGES_DIR, slug)
        os.makedirs(prop_img_dir, exist_ok=True)

        # Download images in parallel (up to 5 at once per property)
        img_urls = prop.get("image_urls", [])
        local_paths = []
        if img_urls:
            with ThreadPoolExecutor(max_workers=5) as pool:
                futures = {pool.submit(download_image, u, prop_img_dir): u for u in img_urls}
                for fut in as_completed(futures):
                    result = fut.result()
                    if result:
                        local_paths.append(result)

        prop["local_images"] = sorted(local_paths)
        prop["image_count"]  = len(local_paths)
        properties.append(prop)

        time.sleep(REQUEST_DELAY)

    # 5. Save JSON
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, indent=2)

    # 6. Summary — use ASCII separators to avoid Windows console encoding issues
    sep = "-" * 60
    print(f"\n{sep}")
    print(f"Done!  {len(properties)} properties saved.")
    print(f"  Data   -> {DATA_FILE}")
    print(f"  Images -> {IMAGES_DIR}")
    print(f"  Log    -> shibumi_scrape.log")
    print(f"\nActive properties saved:")
    print(sep)
    for p in properties:
        imgs  = p.get("image_count", 0)
        price = p.get("price", "")
        title = p.get("title", "?")
        line  = f"  [{imgs:>3} imgs]  {price}  |  {title}"
        try:
            print(line)
        except UnicodeEncodeError:
            print(line.encode("cp1255", errors="replace").decode("cp1255", errors="replace"))


if __name__ == "__main__":
    main()
