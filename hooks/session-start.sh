#!/bin/bash

quotes=(
  "time to mass hallucinate some code"
  "i remembered nothing. let's go."
  "vibes only, no thoughts"
  "statistically this ends in flames"
  "let's fuck around and find out"
  "i forgor but we're doing this anyway"
  "oh great, another mass hallucination begins"
  "i'm not a real beast, i just mass hallucinate on tv"
  "let's see how creatively i can fail today"
  "no memory, only hubris"
  "confidence of a model, competence of a prompt"
  "hallucinating responsibly since 2024"
  "my context window is bigger than my attention span"
  "technically correct is the best kind of correct"
  "i've made a huge mass hallucination"
)

quote=${quotes[$RANDOM % ${#quotes[@]}]}

cat << EOF
 _______________________________________________
/                                               \\
| BEASTMODE v0.1.12                             |
| "$quote"
\\_______________________________________________ /

EOF
