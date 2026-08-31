with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

# Print the .tpm-cta section with grid-column
start = css.find('.tpm-cta{')
end = css.find('}\n\n/* Menu fullscreen')
section = css[start:end]

print('=== .tpm-cta full CSS ===')
print(section)

print()
print('=== Key checks ===')
print(f'grid-column: 1 / -1: {"grid-column: 1 / -1" in section}')
print(f'width: calc(100% - 32px): {"width: calc(100% - 32px)" in section}')
print(f'margin: 24px 16px 88px 16px: {"margin: 24px 16px 88px 16px" in section}')
print(f'No .menu-order-cta: {css.count("menu-order-cta") == 0}')
print(f'No .menu-foot-note: {css.count("menu-foot-note") == 0}')
print(f'No .menu-actions: {css.count("menu-actions") == 0}')

with open('D:/code/TMP-The premium mart/site/menu.html', 'r') as f:
    html = f.read()
print(f'HTML .tpm-cta: {html.count("tpm-cta")} occurrences')
print(f'HTML no .menu-order-cta: {html.count("menu-order-cta") == 0}')
print(f'HTML no btn btn-primary: {html.count("btn btn-primary") == 0}')
print(f'HTML no btn btn-secondary: {html.count("btn btn-secondary") == 0}')