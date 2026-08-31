with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

import re

# Find .menu-foot-note rule
print('=== .menu-foot-note ===')
for m in re.finditer(r'\.menu-foot-note\s*\{', css):
    start = m.start()
    end = css.find('}', start) + 1
    ctx = css[start:end].replace('\n', ' ').strip()
    print(f'  {ctx}')

print()

# Find .menu-actions rule
print('=== .menu-actions ===')
for m in re.finditer(r'\.menu-actions\s*\{', css):
    start = m.start()
    end = css.find('}', start) + 1
    ctx = css[start:end].replace('\n', ' ').strip()
    print(f'  {ctx}')

print()

# Find .btn-primary and .btn-secondary within .menu-foot-note
print('=== .btn-primary within .menu-foot-note ===')
# Search for .btn-primary near .menu-foot-note
idx = css.find('.menu-foot-note')
if idx >= 0:
    section = css[idx:idx+500]
    print(f'  Near .menu-foot-note: {section[:300]}')

print()

# Show .btn-primary rule
print('=== .btn-primary ===')
for m in re.finditer(r'\.btn-primary\s*\{', css):
    start = m.start()
    end = css.find('}', start) + 1
    ctx = css[start:end].replace('\n', ' ').strip()
    print(f'  {ctx}')

print()

# Show .btn-secondary rule
print('=== .btn-secondary ===')
for m in re.finditer(r'\.btn-secondary\s*\{', css):
    start = m.start()
    end = css.find('}', start) + 1
    ctx = css[start:end].replace('\n', ' ').strip()
    print(f'  {ctx}')