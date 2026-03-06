# install

Copy `.beastmode/` skeleton to project root.

## Preconditions

None

## Steps

### 1. Check if already installed

```bash
if [ -d ".beastmode" ]; then
  echo "Error: .beastmode/ already exists."
  exit 1
fi
```

### 2. Find plugin path

```bash
PLUGIN_DIR="$(dirname "$(dirname "$(dirname "$0")")")"
ASSETS_DIR="$PLUGIN_DIR/assets/.beastmode"
```

### 3. Copy skeleton

```bash
cp -r "$ASSETS_DIR" .beastmode
```

### 4. Report success

```
.beastmode/ skeleton installed.

Next steps:
- For new projects: /beastmode init --greenfield
- For existing codebases: /beastmode init --brownfield
```
