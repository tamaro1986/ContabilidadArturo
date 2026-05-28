import re
from collections import Counter

file_path = r'c:\Desarrollo_Aplicaciones\ContabilidadArturo\frontend\src\app\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match declarations like: const [name, setName] = ... or const name = ...
# This is a bit rough but should catch basic duplicates
declarations = re.findall(r'const\s+\[?(\w+)', content)
# Filter out common things like sidebarOpen if they are nested, but this is a flat component mostly
counts = Counter(declarations)

duplicates = {name: count for name, count in counts.items() if count > 1}
print(f"Duplicates found: {duplicates}")
