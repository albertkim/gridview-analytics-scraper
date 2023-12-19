# Gridview Analytics Scraper

This repository includes code to automatically scrape 2 types of info from the web:

1. City council news (see: `/news` directory)
2. City rezonings and development permits (see: `/rezonings`)

- `/news/documents` and `/news/rezonings` store a copy of all PDF documents that are scraped. PDFs are stored so that they are easily searchable, crawlable, uploadable, works offline, and eventually machine-learnable.
- Each `/documents` folder has an `index.json` file that indexes each file that has been added. The format for the index files look like:

```
  {
    directory: 'news',
    files: [
      {
        id: string            // auto-generated, probably a guid like 9c38d908-9ac3-4e08-8dc2-66e925d4fdf4
        city: string          // city name
        metro_city: string    // metro city name
        date: string          // date of the PDF (YYYY-MM-DD)
        create_date: string   // date of when the PDF was scraped (YYYY-MM-DD)
        page_url: string      // the page the file is found in
        file_url: string      // the url of the pdf file
        file_title: string    // the title of the PDF
        file_name: string     // /documents/vancouver-YYYYMMDD-title-9c38d908-9ac3-4e08-8dc2-66e925d4fdf4
        format: string        // expected to be PDF, but I guess other file formats can be stored
      }
    ]
  }
```

### City news



### City rezonings (includes development permits)

