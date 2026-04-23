import os, json, sys
sys.stdout.reconfigure(encoding='utf-8')

images_dir = 'shibumi_properties/images'
folders = sorted(os.listdir(images_dir))
total_imgs = 0
print("תיקיות נכסים:")
print("-" * 55)
for folder in folders:
    path = os.path.join(images_dir, folder)
    imgs = [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
    total_imgs += len(imgs)
    print(f"  [{len(imgs):>3}]  {folder}")

with open('shibumi_properties/properties.json', encoding='utf-8') as f:
    props = json.load(f)

one_img = [p['title'] for p in props if p.get('image_count', 0) <= 1]

print(f"\n{'=' * 55}")
print(f"  סה\"כ נכסים פעילים : {len(props)}")
print(f"  סה\"כ תמונות       : {total_imgs}")
print(f"  תיקיות            : {len(folders)}")
print(f"  נכסים עם תמונה אחת: {len(one_img)}")
print(f"{'=' * 55}")
if one_img:
    print("\nנכסים עם תמונה אחת בלבד (יתכן שאין להם יותר באתר):")
    for t in one_img:
        print(f"  - {t}")
