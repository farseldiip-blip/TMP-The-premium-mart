with open('D:/code/TMP-The premium mart/site/css/style.css', 'rb') as f:
    data = f.read()

# Find .can-strawberry and print exact bytes
idx = data.find(b'.can-strawberry{')
chunk = data[idx:idx+100].decode('utf-8', errors='replace')
print(f'Strawberry chunk (decoded): {chunk}')

# Try the exact string from the chunk
# The chunk shows: .can-strawberry{\r\n  right:1%; top:54px;\r\n  width:310px; height:345px;\r\n  z-index:2;\r\n}
old = b'.can-strawberry{\r\n  right:1%; top:54px;\r\n  width:310px; height:345px;\r\n  z-index:2;\r\n}'
print(f'Old strawberry in data: {old in data}')

if old in data:
    new = b'.can-strawberry{\r\n  position:relative; right:2%; top:48px; width:280px; height:320px; z-index:2;}'
    data = data.replace(old, new)
    with open('D:/code/TMP-The premium mart/site/css/style.css', 'wb') as f:
        f.write(data)
    print('Strawberry replacement done')
else:
    # Try without the final \r\n
    old2 = b'.can-strawberry{\r\n  right:1%; top:54px;\r\n  width:310px; height:345px;\r\n  z-index:2;\r\n'
    print(f'Strawberry old2 in data: {old2 in data}')
    if old2 in data:
        new2 = b'.can-strawberry{\r\n  position:relative; right:2%; top:48px; width:280px; height:320px; z-index:2;\r\n}'
        data = data.replace(old2, new2)
        with open('D:/code/TMP-The premium mart/site/css/style.css', 'wb') as f:
            f.write(data)
        print('Strawberry replacement 2 done')
    else:
        print('Strawberry old2 not found')
"