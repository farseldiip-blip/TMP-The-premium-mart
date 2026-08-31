with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

# Add grid-column: 1 / -1 to .tpm-cta to make it span both grid columns
# Find the .tpm-cta rule and add the grid-column property
# The .tpm-cta rule starts at @media(max-width:767px){ line

# We need to add grid-column: 1 / -1 inside the .tpm-cta rule, before the closing brace
# Let me find the exact location

# Pattern: .tpm-cta{ followed by properties and }
# I need to add grid-column: 1 / -1; after width: calc(100% - 32px); or after the first few properties

# Let me just insert it after the margin property, or better, I'll replace the .tpm-cta rule entirely

# Actually, the simplest approach: find .tpm-cta{ and add grid-column: 1 / -1; as a new property
import re

# Find .tpm-cta{ and its content
pattern = r'(\.tpm-cta\s*\{[^}]*)(\})'
match = re.search(pattern, css)
if match:
    before = match.group(1)
    after = match.group(2)
    
    # Add grid-column property after the margin line
    # Current margin line: "  margin: 24px 16px 88px 16px;"
    # New: add grid-column: 1 / -1; after it
    
    new_before = before.replace(
        'margin: 24px 16px 88px 16px;',
        'margin: 24px 16px 88px 16px;\n  grid-column: 1 / -1;'
    )
    
    new_css = new_before + after
    
    # Check if replacement changed anything
    if new_css != css:
        with open('D:/code/TMP-The premium mart/site/css/style.css', 'w') as f:
            f.write(new_css)
        print('Added grid-column: 1 / -1 to .tpm-cta')
    else:
        print('No change needed - property already present')
else:
    print('Could not find .tpm-cta rule')
    
# Verify
with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    check_css = f.read()
    if 'grid-column: 1 / -1' in check_css:
        print('Confirmed: grid-column: 1 / -1 is now in the CSS')
    else:
        print('Warning: grid-column not found')