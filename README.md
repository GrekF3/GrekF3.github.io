# Nikita Petrov · Portfolio

Lead Full-stack Developer focused on business automation and product development.

[Portfolio](https://grekf3.github.io/) · [English](https://grekf3.github.io/en/) · [Telegram](https://t.me/GrekF3)

## Selected products

- [Itemix](https://itemix.co/): digital goods marketplace. ITEMIX TECH LTD.
- [Luvio](https://luvio.club/): dating platform. LUVIO CLUB LIMITED.
- [Beatprod](https://beatprod.com/): music marketplace with automated file and license delivery.
- [Silent Wallet](https://swallet.site/): open-source self-custodial wallet. Beta.

## Run locally

Static HTML, CSS and JavaScript. No build dependencies.

```sh
python -m http.server 8765
```

Open `http://localhost:8765`. Russian is served at `/`, English at `/en/`.

## Activity

The contribution calendar uses [GitHub Chart](https://github.com/2016rshah/githubchart-api). `scripts/update-stats.py` reads the public GitHub calendar and caches its data and the ready-made chart. The daily workflow updates the monthly chart and counts and triggers a Pages deployment. No personal token is needed or sent to an external service.

## Interface

- Graphite and cobalt themes, with a dark default and a saved light/dark preference.
- Subtle entry and interaction animations respect `prefers-reduced-motion`.
- Onest is served locally. Its SIL Open Font License is included in `assets/fonts/OFL.txt`.
- The contact form prepares a Telegram draft on the client. Visitors review and send it in Telegram, or copy the text; the site does not submit the message itself.
- Responsive product screenshots keep their original 8:5 aspect ratio without stretching or cropping. Click a preview for a full-size viewer with 1:1 zoom.
