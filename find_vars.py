import re
with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    content = f.read()
for var in ['--container', '--gutter', '--c-mint']:
    m = re.search(r':root\s*\{[^}]*\}', content)
    if m:
        root = m.group(0)
        vm = re.search(rf'{var}\s*:\s*[^;]+', root)
        if vm:
            print(f'{var}: {vm.group(0)}')
    # Also check for :root
    m2 = re.search(rf'{var}\s*:\s*[^;]+;', content)
    if m2:
        print(f'{var} (found): {m2.group(0)[:80]}')