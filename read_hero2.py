with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'tpm-hero-inner' in line or 'tpm-hero-copy' in line or 'tpm-hero-visual' in line:
        for j in range(max(0,i-1), min(i+3, len(lines))):
            print(f'{j+1}: {lines[j]}', end='')
        print('---')