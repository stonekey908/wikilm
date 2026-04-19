import os
import re

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

# 1. Orphans
orphans = []
for path in files:
    if path in ['wiki/index.md', 'wiki/log.md']:
        continue
    basename = os.path.basename(path).replace('.md', '')
    title = basename.replace('-', ' ')
    
    is_linked = False
    for other_path, content in contents.items():
        if path == other_path:
            continue
        # Check explicit links or mentions
        if f'[[{title}]]' in content or f'[[{basename}]]' in content or path in content or title.lower() in content.lower():
            is_linked = True
            break
            
    if not is_linked:
        print(f'FINDING:{{"category":"orphan","severity":"warn","title":"Orphaned page","description":"The page {path} has no inbound links.","target_page":"{path}","suggested_action":"Link to this page from related concepts, entities, or index.md","dedupe_key":"orphan:{path}"}}')

# 2. Missing Concepts
term_counts = {}
for path, content in contents.items():
    if 'wiki/sources/' in path or 'wiki/entities/' in path:
        # Find Title Case phrases
        matches = re.findall(r'\b[A-Z][a-z]+ (?:[A-Z][a-z]+ )*[A-Z][a-z]+\b', content)
        for m in matches:
            term_counts[m] = term_counts.get(m, 0) + 1

existing_concepts = [os.path.basename(p).replace('.md', '').replace('-', ' ').lower() for p in files if 'wiki/concepts/' in p]

for term, count in term_counts.items():
    if count >= 3:
        if term.lower() not in existing_concepts:
            # Filter some common generic terms
            if term.lower() not in ['key takeaways', 'global trade', 'trade finance', 'new york', 'artificial intelligence', 'machine learning', 'san francisco']:
                slug = term.lower().replace(' ', '-')
                print(f'FINDING:{{"category":"missing_concept","severity":"info","title":"Missing concept: {term}","description":"The term \'{term}\' is mentioned {count} times but has no concept page.","target_page":null,"suggested_action":"Create wiki/concepts/{slug}.md","dedupe_key":"missing_concept:{slug}"}}')

# 3. Missing Cross Refs
for path, content in contents.items():
    if 'wiki/concepts/' in path:
        for other_path in files:
            if 'wiki/concepts/' in other_path and other_path != path:
                other_title = os.path.basename(other_path).replace('.md', '').replace('-', ' ')
                if other_title in content.lower() and f'[[{other_title}]]' not in content:
                    print(f'FINDING:{{"category":"missing_cross_ref","severity":"info","title":"Missing cross-reference","description":"Page mentions \'{other_title}\' but does not link to it.","target_page":"{path}","suggested_action":"Add link to {other_path}","dedupe_key":"missing_cross_ref:{path}->{other_path}"}}')

