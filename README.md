# Warhammer Librarium

A bilingual browser-based PDF reader with clickable lore cards and locally bundled wiki artwork. Designed for GitHub Pages.

## Reading

Open the site and choose **Add PDFs**. Selected books are parsed by Mozilla PDF.js and stored in your own browser using IndexedDB. PDF files, extracted book text and personal notes are **not uploaded** and are **not included in this repository**. The five listed novels are library metadata only; choose your own local copies to read them.

Features: Turkish/English interface, 124 lore cards, 247 bundled wiki images, image galleries, text search, original PDF view, bookmarks, notes and JSON export/import. Browser storage can be cleared by the browser; retain your original PDFs and export notes regularly.

Wiki source links remain available. This static version uses prepared wiki excerpts; it does not run the local Python server or automatically crawl new wiki pages.

## Hosting

GitHub Pages is deployed by `.github/workflows/pages.yml` on each push to `main`. The workflow checks that no personal PDFs, extracted book caches or local configuration are present before publishing. `.nojekyll` keeps static files unchanged. Every asset path supports project sites under a subdirectory. No application backend or API keys are required.

## Sources and rights

Independent personal reader, not an official Games Workshop product. Warhammer names, artwork and book covers belong to their respective rights holders. Each cached artwork includes a link to its wiki file page in `media.json`. Short wiki excerpts are attributed to Warhammer 40,000 Wiki and its source licence. Editorial glossary definitions are provided in Turkish and English. PDF.js is distributed under the Apache License 2.0; see `vendor/pdfjs/LICENSE`.
