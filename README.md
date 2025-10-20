# size-limit-action 📦✨

A GitHub Action that runs [size-limit](https://github.com/ai/size-limit) to analyze bundle sizes and reports results as PR comments.

> [!NOTE]
> This project is based on the awesome [andresz1/size-limit-action](https://github.com/andresz1/size-limit-action).
> See [NOTICE.md](NOTICE.md) for attribution details.

## Usage 🚀

```yaml
name: size

on:
  pull_request:
    branches:
      - main

# This will depend on your project's permissions
# But this is good to have
permissions:
  contents: read
  pull-requests: write

jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      # 
      - uses: actions/checkout@v4

      - name: run size-limit
        # You should always pin the action to a specific version
        # `main` is used here as an example
        uses: yuckabug/size-limit-action@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs 📥

See [action.yaml](action.yaml) for the full list of inputs.

| Parameter | Required | Default | Description | Example |
|-----------|----------|---------|-------------|---------|
| `github_token` | **Yes** | - | GitHub access token for PR comments | `${{ secrets.GITHUB_TOKEN }}` |
| `build_script` | No | `build` | Build script name to run before size-limit | `build` |
| `clean_script` | No | - | Cleanup script to run after analysis | `clean` |
| `skip_step` | No | - | Skip either `install` or `build` step | `install` or `build` |
| `directory` | No | - | Subdirectory to run commands in | `packages/app` |
| `windows_verbatim_arguments` | No | `true` | Use verbatim arguments on Windows | `true` |
| `script` | No | `npx size-limit --json` | Command to generate size-limit results | `npx size-limit --json` |
| `package_manager` | No | auto-detected | Package manager to use (auto-detected if not provided) | `bun`, `npm`, `yarn`, `pnpm`, `deno` |

## Example with Custom Configuration 🎯

```yaml
- name: Run size-limit
  uses: yuckabug/size-limit-action@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    package_manager: bun
    build_script: build:prod
    skip_step: install
    directory: packages/frontend
```

## How It Works 🤔⚙️

1. **Checkout** - Analyzes both the base branch and current PR branch
2. **Install & Build** - Runs install and build commands (unless skipped)
3. **Analyze** - Executes `size-limit` on both branches
4. **Compare** - Calculates size differences with emoji indicators (🔴 increases, 🟢 decreases)
5. **Report** - Posts or updates a PR comment with detailed comparison tables

## Acknowledgments 🙏💚

This project is based on [andresz1/size-limit-action](https://github.com/andresz1/size-limit-action) (ISC License). 

See [NOTICE.md](NOTICE.md) for full attribution details.

## License 📜

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
