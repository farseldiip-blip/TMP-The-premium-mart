import re

with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

# Step 1: Replace .can-mango positioning
css = re.sub(
    r'(\.can-mango\s*\{[^}]*)\n\s*left:\s*[0-9.]+%;\n\s*top:\s*[0-9.]+px;\n\s*width:\s*[0-9.]+px;\n\s*height:\s*[0-9]+px',
    r'.can-mango{\n  position:relative;\n  left:2%;\n  top:48px;\n  width:280px;\n  height:320px;',
    css
)

# Step 2: Replace .can-blue positioning
css = re.sub(
    r'(\.can-blue\s*\{[^}]*)\n\s*left:\s*[0-9.]+%;\n\s*top:\s*-?[0-9]+px;\n\s*width:\s*[0-9.]+px;\n\s*height:\s*[0-9]+px',
    r'.can-blue{\n  position:relative;\n  left:50%;\n  margin-left:-150px;\n  width:300px;\n  height:340px;',
    css
)

# Step 3: Replace .can-strawberry positioning
css = re.sub(
    r'(\.can-strawberry\s*\{[^}]*)\n\s*right:\s*[0-9.]+%;\n\s*top:\s*[0-9.]+px;\n\s*width:\s*[0-9.]+px;\n\s*height:\s*[0-9]+px',
    r'.can-strawberry{\n  position:relative;\n  right:2%;\n  top:48px;\n  width:280px;\n  height:320px;',
    css
)

with open('D:/code/TMP-The premium mart/site/css/style.css', 'w') as f:
    f.write(css)

print('CSS updated successfully')
print(f'New CSS length: {len(css)}')