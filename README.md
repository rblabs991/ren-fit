# Ren Fit

A small personal web app: a daily home routine guided by a 3D coach, a simple meal plan with prep recipes, and a habit checklist. English and Croatian.

**Open it:** https://rblabs991.github.io/ren-fit/

On a phone, open the link in Chrome and choose **Add to Home screen**. It then opens like an app and works offline.

## What's inside

- **Today** – the day's meals by time, and a button to start the routine.
- **Workout** – three levels that build on each other. Every move has an animated 3D figure, a spoken intro, a timer, rep counter and rest breaks. Turn the phone sideways (or mirror it to a TV) for the big layout.
- **Recipes** – low-effort meals to prep ahead, in metric units.
- **Checklist** – daily habits, streaks and a weight log.
- **Settings** – language, appearance, calendar reminders and backup.

Everything you tick or log is stored only in the browser on your own device. Nothing is sent anywhere.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `css/` | Styles and font faces |
| `js/data.js` | All text (English and Croatian), levels, meals, recipes |
| `js/figure.js` | The 3D figure and one pose function per move |
| `js/app.js` | Screens, workout player, storage, reminders |
| `sw.js`, `manifest.webmanifest`, `icons/` | Install and offline support |
| `vendor/three.min.js` | three.js r128 (MIT licence) |
| `fonts/` | Bricolage Grotesque, Inter, JetBrains Mono (SIL Open Font Licence) |
| `tools/` | Scripts that make the icons and a single-file preview build |

No build step: GitHub Pages serves the files as they are.

General fitness guidance only, not medical advice. Stop any move that causes sharp pain.
