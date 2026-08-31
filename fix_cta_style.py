import re

with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

# Add width: 100% and display: block to .menu-foot-note for mobile CTA
# This makes the CTA take full width of the menu content area, independent of the grid
pattern = r'(\.menu-foot-note\s*\{[^}]*)\n(\s*margin-top:4px)'
replacement = r'\1\n  width: 100%;\n  display: block;\n  margin-top:4px'

new_css = re.sub(pattern, replacement, css)

# Also ensure .menu-actions has proper flex for mobile buttons
pattern2 = r'(\.menu-actions\s*\{[^}]*)\n(\s*flex-wrap:wrap)'
replacement2 = r'\1\n  flex-direction: row;\n  justify-content: center;'

new_css2 = re.sub(pattern2, replacement2, new_css)

with open('D:/code/TMP-The premium mart/site/css/style.css', 'w') as f:
    f.write(new_css2)

print('CSS updated')