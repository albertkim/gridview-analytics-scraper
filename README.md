# Gridview Analytics Scraper

### Environment variables

NODE_ENV
CHAT_GPT_API_KEY
GOOGLE_APPLICATION_CREDENTIALS

### AI tools

ChatGPT 3.5 Turbo

CHatGPT 4 Turbo

Google Cloud Vision

```
If your application made the following requests in a particular month:

700 images with label detection
5300 images with landmark detection
Your cost would be:

$0 for 700 label detection requests.
$0 for the first 1000 landmark detection requests.
$7.50 for the remaining 4300 landmark detection requests. Pricing is calculated in 1000-request blocks. For example, exactly 4000 requests is priced at 4 * $1.50. Any number of requests between 4001 and 5000 (including the 4300 requests in this example) moves the total into the next (5th) block of 1000 and is priced accordingly, adding another $1.50 to the existing cost and bringing the total cost to 5 * $1.50, or $7.50.
Total cost is $7.50.
```

### OS setup

If you are on a mac m1/similar chip, you can have issues installing node-canvas or pdf-img-convert. To fix, run:

`brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman`

Source: https://github.com/Automattic/node-canvas
