from pathlib import Path
import subprocess
import sys

ROOT = Path(".")
SOURCE = subprocess.run(
    ["git", "show", "origin/main:BusinessSpaceScreen.tsx"],
    check=True, capture_output=True, text=True
).stdout
lines = SOURCE.splitlines(keepends=True)

# Each range is zero-based [start, end), corresponding to the exact original
# source blocks moved into each module. The entry file retains the app shell.
ranges = {
    "src/features/businessSpace/BusinessSpaceShared.tsx": [(0, 974), (1064, 1081), (1197, 1267)],
    "src/features/businessSpace/BusinessSpaceHomeScreen.tsx": [(974, 1064)],
    "src/features/businessSpace/BusinessSpaceActivityScreens.tsx": [(1081, 1197)],
    "src/features/businessSpace/BusinessSpaceMarketplaceScreens.tsx": [(1267, 1376)],
    "src/features/businessSpace/BusinessSpaceCommunicationScreens.tsx": [(1376, 1488)],
    "src/features/businessSpace/BusinessSpaceAccountScreens.tsx": [(1488, 1657)],
    "src/features/businessSpace/BusinessSpaceSheets.tsx": [(1657, 1870)],
    "BusinessSpaceScreen.tsx": [(1871, len(lines))],
}

def normalize_module(text):
    # The only permitted source-line modification is adding "export " to
    # top-level declarations so the original declarations can be imported.
    result = []
    for line in text.splitlines(keepends=True):
        if line.startswith("export ") and line[len("export "):].startswith(
            ("const ", "function ", "type ", "interface ", "enum ", "class ")
        ):
            line = line[len("export "):]
        result.append(line)
    return "".join(result)

errors = []
for filename, blocks in ranges.items():
    path = ROOT / filename
    if not path.is_file():
        errors.append(f"MISSING FILE: {filename}")
        continue
    content = normalize_module(path.read_text())
    for start, end in blocks:
        expected = "".join(lines[start:end]).rstrip("\n")
        if expected not in content:
            errors.append(
                f"VERBATIM CHECK FAILED: {filename} does not contain original "
                f"BusinessSpaceScreen.tsx lines {start + 1}-{end} exactly."
            )

if errors:
    print("\n".join(errors))
    sys.exit(1)

print("Verbatim-preservation check passed: all 8 source blocks match main exactly,")
print("apart from the required export prefixes on moved top-level declarations.")
