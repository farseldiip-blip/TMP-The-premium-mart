with open('D:/code/TMP-The premium mart/site/index.html', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'tpm-hero' in line.lower() or 'hero-visual' in line.lower() or 'hero-content' in line.lower() or 'hero-text' in line.lower():
        for j in range(max(0,i-2), min(i+3, len(lines))):
            print(f'{j+1}: {lines[j]}', end='')
        print('---')