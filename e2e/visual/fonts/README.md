The visual-test font files are pinned Latin WOFF2 subsets from Google Fonts:

- Inter v20 normal and italic (`inter*-latin-variable.woff2`)
- Playpen Sans v22 (`playpen-sans-latin-variable.woff2`)

Their SIL Open Font License 1.1 notices are included alongside the files. The
visual fixture replaces the remote stylesheet with embedded font data under
the same production font-family names. It does not override production font
tokens.

Inter sources (normal and italic, weights 400-700, optical size 14-32):

- https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcviYwYZ8UA3.woff2
- https://fonts.gstatic.com/s/inter/v20/UcCm3FwrK3iLTcvnUwQT9mI1F54.woff2
- https://github.com/google/fonts/tree/main/ofl/inter

Playpen Sans is requested at its production weight of 400. Upgrade fixtures
deliberately with the font licenses and review new screenshot baselines.
