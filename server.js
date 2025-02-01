const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static('public'));

// Add a new route to handle Wikipedia searches
app.get('/w/index.php', async (req, res) => {
    try {
        const searchQuery = req.query.search;
        const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(searchQuery)}&title=Special:Search`;
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);

        // Remove search elements since this is a search results page
        $('#searchInput').remove();
        $('#searchButton').remove();
        $('#searchform').remove();
        $('.vector-search-box').remove();

        // Rewrite links
        $('a[href^="/wiki/"]').each((index, element) => {
            const $element = $(element);
            const href = $element.attr('href');
            if (href && href.startsWith('/wiki/')) {
                $element.attr('href', href);
            }
        });

        // Rewrite resource URLs
        $('link[href], script[src], img[src]').each((index, element) => {
            const $element = $(element);
            const attr = $element.attr('href') ? 'href' : 'src';
            const url = $element.attr(attr);

            if (url && !url.startsWith('http') && !url.startsWith('data:')) {
                $element.attr(attr, `https://en.wikipedia.org${url}`);
            }
        });

        // Add the same disable scripts
        const disableScript = `
            <script>
                document.addEventListener('keydown', function(event) {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                        event.preventDefault();
                        alert("Search function is disabled on this page!");
                    }
                    if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                        event.preventDefault();
                        alert("Page reload is disabled!");
                    }
                });

                document.addEventListener('contextmenu', function(event) {
                    event.preventDefault();
                    alert("Right-click is disabled!");
                });
            </script>
        `;

        $('body').append(disableScript);

        res.send($.html());
    } catch (error) {
        console.error('Error handling search:', error);
        res.status(500).send('Error processing search');
    }
});

// Proxy endpoint to fetch and modify Wikipedia pages
app.get('/wiki/*', async (req, res) => {
    const wikiUrl = `https://en.wikipedia.org${req.originalUrl.replace('/wiki/wiki/', '/wiki/')}`;
    const isMainPage = req.originalUrl === '/wiki/Main_Page';

    try {
        const response = await axios.get(wikiUrl);
        let html = response.data;
        const $ = cheerio.load(html);

        if (isMainPage) {
            // Modify the search form on the main page to work with our proxy
            $('#searchform').attr('action', '/w/index.php');
            // Remove unnecessary hidden inputs that might interfere with the search
            $('#searchform input[type="hidden"]').remove();
            // Ensure the search input has the correct name
            $('#searchInput').attr('name', 'search');
        } else {
            // Remove search elements on non-main pages
            $('#searchInput').remove();
            $('#searchButton').remove();
            $('#searchform').remove();
            $('.vector-search-box').remove();
        }

        // Rewrite links
        $('a[href^="/wiki/"]').each((index, element) => {
            const $element = $(element);
            const href = $element.attr('href');
            if (href && href.startsWith('/wiki/')) {
                $element.attr('href', href);
            }
        });

        // Rewrite resource URLs
        $('link[href], script[src], img[src]').each((index, element) => {
            const $element = $(element);
            const attr = $element.attr('href') ? 'href' : 'src';
            const url = $element.attr(attr);

            if (url && !url.startsWith('http') && !url.startsWith('data:')) {
                $element.attr(attr, `https://en.wikipedia.org${url}`);
            }
        });

        // Add the disable scripts
        const disableScript = `
            <script>
                document.addEventListener('keydown', function(event) {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                        event.preventDefault();
                        alert("Search function is disabled on this page!");
                    }
                    if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                        event.preventDefault();
                        alert("Page reload is disabled!");
                    }
                });

                document.addEventListener('contextmenu', function(event) {
                    event.preventDefault();
                    alert("Right-click is disabled!");
                });
            </script>
        `;

        $('body').append(disableScript);

        res.send($.html());
    } catch (error) {
        console.error('Error fetching Wikipedia page:', error);
        res.status(500).send('Error loading Wikipedia page');
    }
});

// Route for serving the game to different teams
app.get('/team/:id', (req, res) => {
    const teamId = req.params.id;
    console.log(`Team ${teamId} is playing the game.`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});