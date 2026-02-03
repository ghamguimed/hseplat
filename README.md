# Logistics & Customs Simulator (Gulf)

## Installation

```bash
npm install
npm run dev
```

## Data files

- Default Gulf data: `data/gulf_defaults.json`
- Seed dataset (nodes, edges, products, countries): `data/seed.json`
- UAE customs fees Excel file: place it at `public/data/Frais Douaniers.xlsx`
  - If the file is missing, the UI provides an upload button in **Import XLSX**.

## Features

- Map-based visualization of nodes and edges (OSM via Leaflet).
- Dijkstra routing by **cost**, **time**, or **weighted** criteria.
- Full customs calculation (insurance 1% default) with product-level breakdown.
- Country editor for customs, trade, and regulations.
- Routes editor and global params editor.
- UAE XLSX importer using `xlsx` with robust header detection.
- Full persistence in `localStorage` with JSON export/import and reset controls.

## Notes

- KSA defaults to Gulf baseline until specific data is provided.
- UAE product rates are auto-populated when the Excel file is present or uploaded.
