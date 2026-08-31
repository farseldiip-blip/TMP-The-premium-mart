import re
with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

patterns = ['menu-images-wrap', 'menu-images-container', 'tpm-cta', 'menu-page-caption', 'menu-page-figure', '.container']
for p in patterns:
    matches = list(re.finditer(re.escape(p), css))
    print(f"\n=== {p}: {len(matches)} matches ===")
    for m in matches:
        start = max(0, m.start()-3)
        end = min(len(css), m.end()+150)
        ctx = css[start:end].replace('\n', ' ').strip()
        print(f"  @{m.start()}: ...{ctx}...")