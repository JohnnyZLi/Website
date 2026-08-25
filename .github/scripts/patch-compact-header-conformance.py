from pathlib import Path

path = Path('design-system.conformance.json')
content = path.read_text()
content = content.replace('"expectedInnerHeight",\n            "expectedOuterHeight"', '"expectedInnerHeights",\n            "expectedOuterHeights"')
content = content.replace('class=\\"jl-global-header\\"', 'class=\\"jl-global-header jl-global-header--compact-utility\\"')
path.write_text(content)
