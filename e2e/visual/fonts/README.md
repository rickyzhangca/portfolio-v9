The visual-test font files are pinned Latin WOFF2 subsets from Google Fonts:

- Google Sans v70 normal and italic (`google-sans*-latin-variable.woff2`)
- Playpen Sans v22 (`playpen-sans-latin-variable.woff2`)

Their SIL Open Font License 1.1 notices are included alongside the files. The
visual fixture replaces the remote stylesheet with embedded font data under
the same production font-family names. It does not substitute Google Sans Flex
or override production font tokens.

Google Sans sources (normal and italic, weights 400-700, optical size 17-18):

- https://fonts.gstatic.com/s/googlesans/v70/4UaRrENHsxJlGDuGo1OIlJfC6l_24rlCK1Yo_Iq2vgCI.woff2
- https://fonts.gstatic.com/s/googlesans/v70/4UaXrENHsxJlGDuGo1OIlL3L2JB874GPhFI9_IqmuTCKjsg.woff2
- https://github.com/google/fonts/tree/main/ofl/googlesans

Playpen Sans is requested at its production weight of 400. Upgrade fixtures
deliberately with the font licenses and review new screenshot baselines.
