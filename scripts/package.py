"""Create a self-contained static release, with no concept-map or screenshot assets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
files = [root / p for p in ['index.html', 'style.css', 'art/icon.svg', 'art/terrain-atlas.png', 'art/ground-textures.png', 'art/ocean.png']]
files += sorted((root / 'src').glob('*.js'))
files += [root / 'docs' / p for p in ['PLAY.md', 'DEPLOYMENT.md', 'VISUAL-COMPROMISES.md']]
output = root / 'release/Wonderlands-v1.0.0.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, Path('Wonderlands') / path.relative_to(root))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert not any('island.png' in n or '/proof/' in n or '/evidence/' in n for n in archive.namelist())
print(f'{output.name}: {len(files)} files; {output.stat().st_size:,} bytes; integrity OK')
