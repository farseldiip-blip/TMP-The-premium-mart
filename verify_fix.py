with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

with open('D:/code/TMP-The premium mart/site/menu.html', 'r') as f:
    html = f.read()

print('=== .tpm-cta CSS (relevant section) ===')
# Find and print .tpm-cta rule
start = css.find('.tpm-cta{')
end = css.find('}\n\n/* Menu fullscreen')
section = css[start:end+1]
# Just print the first part showing grid-column
for line in section.split('\n')[:15]:
    print(line)

print()
print('=== Verification ===')
checks = [
    ('grid-column: 1 / -1 in CSS', 'grid-column: 1 / -1' in css),
    ('No .menu-order-cta in CSS', css.count('menu-order-cta') == 0),
    ('No .menu-order-cta in HTML', html.count('menu-order-cta') == 0),
    ('No btn btn-primary in HTML', html.count('btn btn-primary') == 0),
    ('No btn btn-secondary in HTML', html.count('btn btn-secondary') == 0),
]
for desc, result in checks:
    print(f'  {desc}: {"PASS" if result else "FAIL"}')