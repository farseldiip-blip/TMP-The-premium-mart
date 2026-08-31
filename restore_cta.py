import re, sys

with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

# Find .tpm-cta rule and remove grid-column/grid-row properties
pattern = r'(\.tpm-cta\s*\{[^}]*\n)'
match = re.search(pattern, css)
if match:
    block = match.group(1)
    # Remove grid-column and grid-row lines
    cleaned = re.sub(r'\s*grid-column[^;]*;?\s*', '', block)
    cleaned = re.sub(r'\s*grid-row[^;]*;?\s*', '', cleaned)
    
    # Replace in css
    new_css = css[:match.start()] + cleaned + css[match.end():]
    
    with open('D:/code/TMP-The premium mart/site/css/style.css', 'w') as f:
        f.write(new_css)
    print("Removed grid-column/grid-row from .tpm-cta")
    print(f"Original block had {block.count('grid')} grid references")
else:
    print("No .tpm-cta block found or no grid properties")