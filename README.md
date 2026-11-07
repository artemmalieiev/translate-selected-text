# Translate Selected Text

Chrome extension: select text on a page, hover over the selection, and a tooltip shows its Russian translation.
Translation uses Chrome's built-in, on-device Translator API (Chrome 138+): free, no API key.

## Build

```sh
npm install
npm run build      # or: npm run watch
```

## Load in Chrome

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick the `dist/` folder.
3. After rebuilding, click the reload icon on the extension card and refresh the page.

The first translation for a language pair downloads a model; the tooltip shows progress.
