# Chasry

Chasry helps freelancers and small businesses get paid on time. Log an invoice once — client, amount, due date — and Chasry automatically sends polite reminder emails to the client at set intervals until it's marked as paid.

**Live site:** [chasry.com](https://chasry.com)

## Tech Stack

- Static HTML5, CSS3, and vanilla JavaScript — no build step, no framework, no dependencies
- [Web3Forms](https://web3forms.com) for the signup form backend
- [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- Hosted on [Vercel](https://vercel.com)

## Project Structure

```
.
├── index.html              # English homepage (default locale)
├── el/index.html           # Greek homepage
├── 404.html                # Custom 404 page
├── assets/
│   ├── css/style.css       # Shared stylesheet
│   ├── js/main.js          # Signup form handling (fetch + validation)
│   ├── img/                # Optimized images (WebP with PNG fallback)
│   └── favicons/           # Favicons and app icons
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── vercel.json             # Redirects (legacy /en/ -> /)
```

## Running Locally

No build step or package installation required.

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Internationalization

The site is bilingual (English / Greek) by design. English is served at `/` (default), Greek at `/el/`. Each locale has its own HTML page; both share the same stylesheet and script.

## Deployment

Static deployment on Vercel, built from the `main` branch. No environment variables or server-side configuration required.

## License

© 2026 Chasry. All rights reserved.
