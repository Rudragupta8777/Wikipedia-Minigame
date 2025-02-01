const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// Proxy endpoint to fetch and modify Wikipedia pages
app.get('/wiki/*', async (req, res) => {
    const wikiUrl = `https://en.wikipedia.org${req.originalUrl.replace('/wiki/wiki/', '/wiki/')}`;

    try {
        // Fetch the Wikipedia page
        const response = await axios.get(wikiUrl);
        let html = response.data;

        // Load the HTML into cheerio
        const $ = cheerio.load(html);

        // Remove the search bar
        $('#searchInput').remove();
        $('#searchButton').remove();
        $('#searchform').remove();

        // Rewrite resource URLs to go through the proxy
        $('link[href], script[src], img[src]').each((index, element) => {
            const $element = $(element);
            const attr = $element.attr('href') ? 'href' : 'src';
            const url = $element.attr(attr);

            if (url && !url.startsWith('http') && !url.startsWith('data:')) {
                $element.attr(attr, `https://en.wikipedia.org${url}`);
            }
        });

        // Send the modified HTML to the client
        res.send($.html());
    } catch (error) {
        console.error('Error fetching Wikipedia page:', error);
        res.status(500).send('Error loading Wikipedia page');
    }
});

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});