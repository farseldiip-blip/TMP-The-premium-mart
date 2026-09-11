#!/usr/bin/env python3
import urllib.request
import json

url = "https://zxgnrccralodllqqcsup.supabase.co"
api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z25yY2NyYWxvZGxscXFjc3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTc5MDEsImV4cCI6MjEwMzg5MzkwMX0.IGuqpT0RTbzd6qYPzyuXWIhXsqlVQRjxd7dq1bohh-c'

headers = {
    "apikey": api_key,
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

# Try inserting with role=postgres metadata
category_data = json.dumps({
    "slug": "fruits",
    "name": "Fruits",
    "description": "Fresh and seasonal fruits selection.",
    "sort_order": 10,
    "is_active": True
}).encode('utf-8')

req = urllib.request.Request(
    f"{url}/rest/v1/categories",
    headers={**headers, "Prefer": "set-metadata=role=postgres"},
    data=category_data,
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=15) as response:
        result = response.read().decode('utf-8')
        print("Category insert SUCCESS with role=postgres metadata:", result)
except urllib.error.HTTPError as e:
    print(f"Category insert HTTP error: {e.code} - {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Category insert error: {e}")