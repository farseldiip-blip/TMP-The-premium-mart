import struct, zlib, os

def png_chunks(data):
    """Parse PNG chunks"""
    pos = 8  # Skip PNG signature
    while pos < len(data) - 12:
        length = struct.unpack('>I', data[pos:pos+4])[0]
        chunk_type = data[pos+4:pos+8].decode('ascii', errors='replace')
        chunk_data = data[pos+8:pos+8+length]
        crc = struct.unpack('>I', data[pos+8+length:pos+12+length])[0]
        yield chunk_type, chunk_data, crc
        pos += 12 + length

def optimize_png(path):
    with open(path, 'rb') as f:
        data = f.read()
    
    original_size = len(data)
    
    for chunk_type, chunk_data, crc in png_chunks(data):
        if chunk_type == 'IDAT':
            try:
                decompressed = zlib.decompress(chunk_data)
                print(f"{path}: IDAT compressed={len(chunk_data)}, decompressed={len(decompressed)}")
            except:
                pass
    
    print(f"{path}: original={original_size} bytes")
    print()

optimize_png(r'D:\code\TMP-The premium mart\site\assets\cans\mixfruotf.png')
optimize_png(r'D:\code\TMP-The premium mart\site\assets\cans\BLUE PERRE.png')
optimize_png(r'D:\code\TMP-The premium mart\site\assets\cans\tpmm beef.png')