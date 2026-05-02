#!/usr/bin/env python3
"""
Restrukturiranje Bodulica projekta
Izvlaci CSS i JS iz inline HTML-a u odvojene fileove
"""

import re
from pathlib import Path

# Read the HTML file
html_path = Path('/home/sovereign/linux/Bodulica/bodulica-deploy/index.html')
html_content = html_path.read_text()

# Extract CSS between <style> tags
style_match = re.search(r'<style>(.*?)</style>', html_content, re.DOTALL)
css_content = style_match.group(1).strip() if style_match else ''

# Extract JS between <script> tags
script_matches = re.findall(r'<script>(.*?)</script>', html_content, re.DOTALL)
js_content = '\n\n'.join(script_matches) if script_matches else ''

# Create CSS file
src_dir = Path('/home/sovereign/linux/Bodulica/src')
src_dir.mkdir(parents=True, exist_ok=True)

with open(src_dir / 'styles.css', 'w', encoding='utf-8') as f:
    f.write(css_content)

# Create JS file
with open(src_dir / 'app.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

# Clean HTML - remove inline styles and scripts
# Keep only the style tag with link replacement comment
clean_html = re.sub(r'<style>.*?</style>',
                      '<link rel="stylesheet" href="styles.css">',
                      html_content, flags=re.DOTALL)
clean_html = re.sub(r'<script>.*?</script>',
                      '<script src="app.js"></script>',
                      clean_html, flags=re.DOTALL)

# Write clean HTML
with open(src_dir / 'index.html', 'w', encoding='utf-8') as f:
    f.write(clean_html)

print("✅ Restrukturiranje zavrseno:")
print(f"   - CSS: src/styles.css ({len(css_content)} chars)")
print(f"   - JS: src/app.js ({len(js_content)} chars)")
print(f"   - HTML: src/index.html ({len(clean_html)} chars)")
