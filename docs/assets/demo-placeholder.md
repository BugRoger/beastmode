# Demo Recording Guide

Record a terminal session showing beastmode in action:
1. Install asciinema: `brew install asciinema`
2. Record: `asciinema rec demo.cast`
3. Run a quick /design → /plan → /implement cycle
4. Convert to SVG: `npx svg-term-cli --in demo.cast --out assets/demo.svg`

Place the resulting `demo.svg` in this directory and update README.md.
