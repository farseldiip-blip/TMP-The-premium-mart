with open('D:/code/TMP-The premium mart/site/css/style.css', 'rb') as f:
    data = f.read()

# Replace .can-blue
old = b'.can-blue{\r\n  left:50%; top:-4px;\r\n  width:345px; height:391px;\r\n  z-index:3;\r\n}'
new = b'.can-blue{\r\n  position:relative; left:50%; margin-left:-150px; width:300px; height:340px; z-index:3;}'

print(f'Old in data: {old in data}')
if old in data:
    data = data.replace(old, new)
    with open('D:/code/TMP-The premium mart/site/css/style.css', 'wb') as f:
        f.write(data)
    print('Blue replacement done')
else:
    print('Blue old not found')
"