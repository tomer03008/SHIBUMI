"""Print a summary of all scraped properties from the saved JSON."""
import json, os

DATA_FILE = "shibumi_properties/properties.json"
IMAGES_DIR = "shibumi_properties/images"

with open(DATA_FILE, encoding="utf-8") as f:
    props = json.load(f)

total_imgs = sum(p.get("image_count", 0) for p in props)
folders = [d for d in os.listdir(IMAGES_DIR) if os.path.isdir(os.path.join(IMAGES_DIR, d))]

print("=" * 70)
print(f"  SHIBUMI SCRAPER - SUMMARY")
print("=" * 70)
print(f"  Total active properties : {len(props)}")
print(f"  Total images downloaded : {total_imgs}")
print(f"  Property folders        : {len(folders)}")
print(f"  Data file               : {DATA_FILE}")
print(f"  Images folder           : {IMAGES_DIR}")
print("=" * 70)
print()

for i, p in enumerate(props, 1):
    title = p.get("title", "?")
    price = p.get("price", "")
    imgs  = p.get("image_count", 0)
    desc  = p.get("description", "")[:80].replace("\n", " ")
    details = p.get("details", {})

    print(f"[{i:02d}] {title}")
    if price:
        print(f"      Price   : {price}")
    for k, v in list(details.items())[:3]:
        v_short = str(v).replace("\n", " ")[:60]
        print(f"      {k}: {v_short}")
    if imgs:
        img_folder = os.path.join(IMAGES_DIR, p.get("local_images", [""])[0].split(os.sep)[-2] if p.get("local_images") else "")
        print(f"      Images  : {imgs}")
    if desc:
        print(f"      Desc    : {desc}...")
    print()
