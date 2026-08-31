import os

# Clean up temp files
for f in ['verify_cta.py', 'search_css.py', 'check_refs.py', 'check_vars.py', 'rebuild_cta.py', 'verify_final.py']:
    path = f'D:/code/TMP-The premium mart/{f}'
    if os.path.exists(path):
        os.remove(path)
        print(f'Removed {f}')

# Check brace balance in tpm-cta section
with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

start_marker = '/* ==========================================================================\n   .tpm-cta'
end_marker = '\n\n/* Menu fullscreen lightbox'
start_idx = css.find(start_marker)
end_idx = css.find(end_marker)
section = css[start_idx:end_idx]

opens = section.count('{')
closes = section.count('}')
print(f'\nCTA section braces: {opens} opens, {closes} closes, balanced: {opens == closes}')

# Also check for any remaining issues
print(f'\nRemaining checks:')
print(f'  No .menu-order-cta in CSS: {css.count("menu-order-cta") == 0}')
print(f'  No .menu-order-cta in HTML: {open("D:/code/TMP-The premium mart/site/menu.html").read().count("menu-order-cta") == 0}')
print(f'  No btn btn-primary in HTML: {open("D:/code/TMP-The premium mart/site/menu.html").read().count("btn btn-primary") == 0}')
print(f'  No btn btn-secondary in HTML: {open("D:/code/TMP-The premium mart/site/menu.html").read().count("btn btn-secondary") == 0}')