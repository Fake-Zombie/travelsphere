import os, re, subprocess

src = "."
api_path_abs = os.path.abspath("services/api.js")

# Fix services/api.js
with open(api_path_abs, 'r') as f:
    content = f.read()
if 'API_URL' not in content:
    content = '// services/api.js\nexport const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";\n\n' + content.replace('// services/api.js\n', '')
    with open(api_path_abs, 'w') as f:
        f.write(content)

result = subprocess.run(['grep', '-rl', 'localhost:5000', src, '--include=*.js', '--include=*.jsx'], capture_output=True, text=True, shell=True)
files = [f for f in result.stdout.strip().split('\n') if f]

for filepath in files:
    file_dir = os.path.dirname(os.path.abspath(filepath))
    rel = os.path.relpath(api_path_abs, file_dir).replace('\\', '/')[:-3]
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    import_line = f'import {{ API_URL }} from "{rel}";'
    if 'API_URL' not in content:
        lines = content.split('\n')
        last_import = max((i for i,l in enumerate(lines) if l.strip().startswith('import ')), default=-1)
        if last_import >= 0:
            lines.insert(last_import + 1, import_line)
            content = '\n'.join(lines)
    content = re.sub(r'"http://localhost:5000(/[^"]*)"', r'`${API_URL}\1`', content)
    content = re.sub(r'"http://localhost:5000"', r'API_URL', content)
    content = re.sub(r"'http://localhost:5000(/[^']*)'", r'`${API_URL}\1`', content)
    content = re.sub(r"'http://localhost:5000'", r'API_URL', content)
    content = re.sub(r'`([^`]*)http://localhost:5000(\$\{[^}]+\}[^`]*)`', r'`\1${API_URL}\2`', content)
    content = re.sub(r'`([^`]*)http://localhost:5000(/[^`$]*)`', r'`\1${API_URL}\2`', content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ {filepath}")

print("\nDone!")