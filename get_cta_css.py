import subprocess, sys

result = subprocess.run(['git', 'show', '6364cfd:site/css/style.css'], capture_output=True, text=True)
css = result.stdout

import re

print('=== .menu-foot-note ===')
for m in re.finditer(r'\.menu-foot-note\s*\{', css):
    start = m.start()
    end = css.find('}', start) + 1
    ctx = css[start:end].replace('\n', ' ').strip()
    print(f'  {ctx}')

print('=== .menu-actions ===')
for m in re.finditer(r'\.menu-actions\s*\{', css):
    start = m.start()
    end = css.find('}', start) + 1
    ctx = css[start:end].replace('\n', ' ').strip()
    print(f'  {ctx}')

print('=== .btn-primary ===')
for m in re.finditer(r'\.btn-primary\s*\{', css):
    start = m.start()
    end = css.find('}', start) + 1
    ctx = css[start:end].replace('\n', ' ').strip()
    print(f'  {ctx}')

print('=== .btn-secondary ===')
for m in re.finditer(r'\.btn-secondary\s*\{', css):
    start = m.start()
    end = css.find('}', start) + 1
    ctx = css[start:end].replace('\n', ' ').strip()
    print(f'  {ctx}')