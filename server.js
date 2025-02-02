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
        const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(searchQuery)}`;
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);

        // Preserve the content structure
        const contentDiv = $('#content');
        
        // Remove unwanted elements
        $('.vector-search-box').remove();
        $('#p-search').remove();
        $('#searchform').remove();

        // Rewrite links to work with our proxy
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

        const disableScript = `
            <script>
                // Notify parent window to start timer if this isn't the main page
                if (window.location.pathname !== '/wiki/Main_Page') {
                    window.parent.postMessage('startTimer', '*');
                }

                // Function to disable all links
                function disableAllLinks() {
                    document.querySelectorAll('a').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            alert('Time is up! Links are disabled.');
                        });
                    });
                }

                // Listen for message from parent to disable links
                window.addEventListener('message', function(event) {
                    if (event.data === 'disableLinks') {
                        disableAllLinks();
                    }
                });

                // Enhanced keyboard shortcut prevention
                function preventShortcuts(event) {
                    // Create an object with all the shortcuts to prevent
                    const shortcuts = {
                        'f': { ctrl: true, message: "Search function is disabled on this page😒!" },
                        'r': { ctrl: true, message: "Page reload is disabled😒!" },
                        'g': { ctrl: true, message: "Find next is disabled😒!" },
                        'u': { ctrl: true, message: "View page source is disabled😒!" },
                        'e': { ctrl: true, message: "Search tool is disabled😒!" },
                        't': { ctrl: true, message: "Opening a new tab is not allowed😒!" },
                        'F12': { special: true, message: "Developer tools are disabled😒!" },
                        'F5': { special: true, message: "Page reload is disabled😒!" },
                        'i': { ctrlAlt: true, message: "Developer tools are disabled😒!" },
                        'j': { ctrlAlt: true, message: "Developer tools are disabled😒!" },
                        'c': { ctrlAlt: true, message: "Developer tools are disabled😒!" }
                    };

                    const key = event.key;
                    const ctrl = event.ctrlKey || event.metaKey;
                    const alt = event.altKey;

                    // Check if the key combination matches any of our shortcuts
                    const shortcut = shortcuts[key];
                    if (shortcut) {
                        if (
                            (shortcut.ctrl && ctrl && !alt) ||
                            (shortcut.special && !ctrl && !alt) ||
                            (shortcut.ctrlAlt && ctrl && alt)
                        ) {
                            event.preventDefault();
                            event.stopPropagation();
                            alert(shortcut.message);
                            return false;
                        }
                    }
                }

                // Add the event listener only once in the capture phase
                document.addEventListener('keydown', preventShortcuts, true);

                // Disable right-click
                document.addEventListener('contextmenu', function(event) {
                    event.preventDefault();
                    alert("Right-click is disabled😒!");
                });

                // Make sure the shortcuts are prevented even in iframes
                window.addEventListener('load', function() {
                    try {
                        Array.from(document.getElementsByTagName('iframe')).forEach(function(iframe) {
                            iframe.contentDocument.addEventListener('keydown', preventShortcuts, true);
                        });
                    } catch(e) {
                        console.log('Cannot access iframe content');
                    }
                });
            </script>
        `;

        $('body').append(disableScript);

        // Send the complete HTML
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

        const disableScript = `
            <script>
                // Notify parent window to start timer if this isn't the main page
                if (window.location.pathname !== '/wiki/Main_Page') {
                    window.parent.postMessage('startTimer', '*');
                }

                // Function to disable all links
                function disableAllLinks() {
                    document.querySelectorAll('a').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            alert('Time is up! Links are disabled.');
                        });
                    });
                }

                // Listen for message from parent to disable links
                window.addEventListener('message', function(event) {
                    if (event.data === 'disableLinks') {
                        disableAllLinks();
                    }
                });

                // Enhanced keyboard shortcut prevention
                document.addEventListener('keydown', function(event) {
                    // Prevent Ctrl+F (Find)
                    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                        event.preventDefault();
                        alert("Search function is disabled on this page😒!");
                    }
                    // Prevent F5 or Ctrl+R (Reload)
                    if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                        event.preventDefault();
                        alert("Page reload is disabled😒!");
                    }
                    // Prevent Ctrl+G (Find Next)
                    if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
                        event.preventDefault();
                        alert("Find next is disabled😒!");
                    }
                    if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
                        event.preventDefault();
                        alert("Developer tools are disabled😒!");
                    }
                    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                        event.preventDefault();
                        alert("Search tool is Disabled😒!");
                    }
                    if ((event.ctrlKey || event.metaKey) && event.key === 't') {
                        event.preventDefault();
                        alert("Opening a new tab is not allowed😒!");
                    }
                    // Prevent F12 (Developer Tools)
                    if (event.key === 'F12') {
                        event.preventDefault();
                        alert("Developer tools are disabled😒!");
                    }
                });

                // Disable right-click
                document.addEventListener('contextmenu', function(event) {
                    event.preventDefault();
                    alert("Right-click is disabled😒!");
                });

                // Additional protection against dev tools
                document.addEventListener('keydown', function(event) {
                    // For Mac: Command+Option+I or Command+Option+J or Command+Option+C
                    if(event.metaKey && event.altKey && (event.key === 'i' || event.key === 'j' || event.key === 'c')) {
                        event.preventDefault();
                        alert("Developer tools are disabled😒!");
                    }
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

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

// Remove this:
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

// Add this at the bottom:
module.exports = app;