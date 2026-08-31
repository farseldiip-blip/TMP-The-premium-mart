with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()
import re

for term in ['.can-mango', '.can-blue', '.can-strawberry']:
    print(f'=== {term} ===')
    for m in re.finditer(re.escape(term), css):
        start = max(0, m.start()-5)
        end = min(len(css), m.end()+200)
        ctx = css[start:end].replace('\n', ' ').strip()
        print(f'  @{m.start()}: ...{ctx}...')
    print()