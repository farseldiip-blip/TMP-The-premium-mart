import re
with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    content = f.read()
m = re.search(r'\.container\s*\{[^}]*\}', content)
if m:
    print('container:', m.group(0)[:300])
m2 = re.search(r'\.tpm-hero-visual\s*\{[^}]*\}', content)
if m2:
    print('hero-visual:', m2.group(0)[:300])