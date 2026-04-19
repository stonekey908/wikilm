import os

wiki_dir = 'wiki'
files = []
for root, _, filenames in os.walk(wiki_dir):
    for f in filenames:
        if f.endswith('.md'):
            files.append(os.path.join(root, f))

contents = {}
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        contents[path] = f.read()

for path in files:
    if path in ['wiki/index.md', 'wiki/log.md']:
        continue
    
    basename = os.path.basename(path).replace('.md', '')
    title_slug = basename
    
    # Check if this slug appears in any other file inside [[ ]] or ()
    # Actually, let's just check if `basename` appears in any other file's text at all.
    is_linked = False
    for other_path, content in contents.items():
        if other_path == path:
            continue
        if basename in content:
            is_linked = True
            break
            
    if not is_linked:
        print(path)

