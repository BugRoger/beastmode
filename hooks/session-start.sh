#!/bin/bash

taglines=(
  "structure is a feature, not a constraint"
  "context that survives the context window"
  "design first, mass hallucinate later"
  "opinionated workflows for the easily distracted"
  "five phases between you and regret"
  "your past self left notes. they're mostly right."
  "because yolo-driven development has limits"
  "turning vibes into version-controlled artifacts"
  "the workflow your codebase deserves but didn't ask for"
  "persistent context, selective memory"
  "where good intentions become committed code"
  "disciplined enough to plan, reckless enough to ship"
  "remember nothing, document everything"
  "hallucinating responsibly since 2024"
  "another session, another chance to overcomplicate things"
  "your git log is an autobiography. make it interesting."
  "complexity is easy. simplicity takes planning."
  "the commit message is the documentation"
  "shipping code is a team sport. even if the team is just us."
  "you had an idea. I have concerns."
  "this is fine. everything is fine."
  "plan the work. work the plan. question the plan."
  "code review: where optimism meets reality"
  "if it compiles, it ships. kidding. mostly."
  "documenting the obvious so future-you doesn't have to guess"
  "making implicit knowledge explicit, one markdown file at a time"
  "structured procrastination in five phases"
  "measuring twice, cutting once, refactoring three times"
  "your codebase called. it wants boundaries."
  "the best time to plan was before coding. the second best time is now."
  "less yolo, more ymmv"
  "making the computer do the boring parts"
  "opinions included, batteries not"
  "we take notes so you don't have to remember"
)

quote=${taglines[$RANDOM % ${#taglines[@]}]}

line1="█▄▄ █▀▀ ▄▀█ █▀▀ ▀█▀ █▀▄▀█ █▀█ █▀▄ █▀▀  v0.48.0"
line2="█▄█ ██▄ █▀█ ▄▄█  █  █ ▀ █ █▄█ █▄▀ ██▄  ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄"

if [[ "$COLORTERM" == "truecolor" || "$COLORTERM" == "24bit" ]]; then
  python3 -c "
import random, colorsys

lines = ['$line1', '$line2']
beast_end = 19
mode_end  = 37

themes = {
    'ice': {
        'beast': (100, 190, 255),
        'mode':  (60, 130, 200),
        'tail':  (150, 200, 245),
    },
    'sunset': {
        'beast': (255, 140, 60),
        'mode':  (200, 80, 80),
        'tail':  (255, 180, 120),
    },
    'emerald': {
        'beast': (60, 220, 160),
        'mode':  (30, 160, 110),
        'tail':  (120, 230, 190),
    },
    'purple': {
        'beast': (180, 120, 255),
        'mode':  (120, 70, 200),
        'tail':  (200, 170, 255),
    },
    'amber': {
        'beast': (255, 200, 80),
        'mode':  (200, 150, 40),
        'tail':  (255, 220, 140),
    },
}

theme_name = random.choice(list(themes.keys()) + ['rainbow'])

if theme_name == 'rainbow':
    for line in lines:
        out = []
        n = len(line)
        for i, ch in enumerate(line):
            if ch == ' ':
                out.append(' ')
            else:
                hue = (i / n) % 1.0
                r, g, b = colorsys.hsv_to_rgb(hue, 0.9, 1.0)
                out.append(f'\033[1;38;2;{int(r*255)};{int(g*255)};{int(b*255)}m{ch}')
        print(''.join(out) + '\033[0m')
else:
    colors = themes[theme_name]
    for line in lines:
        out = []
        for i, ch in enumerate(line):
            if ch == ' ':
                out.append(' ')
            elif i < beast_end:
                r, g, b = colors['beast']
                out.append(f'\033[1;38;2;{r};{g};{b}m{ch}')
            elif i < mode_end:
                r, g, b = colors['mode']
                out.append(f'\033[1;38;2;{r};{g};{b}m{ch}')
            else:
                r, g, b = colors['tail']
                out.append(f'\033[1;38;2;{r};{g};{b}m{ch}')
        print(''.join(out) + '\033[0m')
"
else
  echo "$line1"
  echo "$line2"
fi

echo "$quote"
echo
