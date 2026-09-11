#!/usr/bin/env python3
import urllib.request

url = 'https://zxgnrccralodllqqcsup.supabase.co'
service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

headers = {
    'apikey': service_role_key,
    'Authorization': f'Bearer {service_role_key}',
    'Content-Type': 'application/json'
}

# Try inserting the fruits category
category_data = json.dumps({
    'slug': 'fruits',
    'name': 'Fruits',
    'description': 'Fresh and seasonal fruits selection.',
    'sort_order': 10,
    'is_active': True
}).encode('utf-8')

req = urllib.request.Request(
    f'{url}/rest/v1/categories',
    headers=headers,
    data=category_data,
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=15) as response:
        result = response.read().decode('utf-8')
        print('Category insert SUCCESS:', result)
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8')
    print(f'Category insert HTTP error: {e.code} - {body}')
except Exception as e:
    print(f'Category insert error: {e}')