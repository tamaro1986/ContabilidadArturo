import os
import re

def find_hardcoded_colors(root_dir):
    # Standard Tailwind colors
    color_patterns = [
        r'slate-\d+', r'emerald-\d+', r'cyan-\d+', r'amber-\d+', 
        r'blue-\d+', r'red-\d+', r'green-\d+', r'gray-\d+',
        r'purple-\d+', r'indigo-\d+', r'rose-\d+', r'orange-\d+',
        r'yellow-\d+', r'lime-\d+', r'teal-\d+', r'sky-\d+',
        r'pink-\d+', r'fuchsia-\d+', r'violet-\d+', r'zinc-\d+',
        r'neutral-\d+', r'stone-\d+',
        r'bg-white', r'text-white', r'border-white',
        r'bg-black', r'text-black', r'border-black'
    ]
    regex = re.compile('|'.join(color_patterns))
    
    results = []
    for root, dirs, files in os.walk(root_dir):
        if 'node_modules' in root or '.next' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css', '.html')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        for i, line in enumerate(f, 1):
                            # Exclude lines that already use CSS variables or are in comments
                            if regex.search(line) and 'var(--' not in line:
                                results.append(f"{path}:{i}: {line.strip()}")
                except Exception as e:
                    pass
    return results

if __name__ == "__main__":
    root = r'c:\Desarrollo_Aplicaciones\ContabilidadArturo\frontend\src'
    problems = find_hardcoded_colors(root)
    for p in problems:
        print(p)
