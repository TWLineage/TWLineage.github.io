const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, 'index.html');
const styleCssPath = path.join(__dirname, 'css', 'style.css');
const engineJsPath = path.join(__dirname, 'js', 'engine.js');
const playerJsPath = path.join(__dirname, 'js', 'player.js');
const enemyJsPath = path.join(__dirname, 'js', 'enemy.js');
const mainJsPath = path.join(__dirname, 'js', 'main.js');
const outputPath = path.join(__dirname, '天堂放置版v0.2.3.html');

try {
    let html = fs.readFileSync(indexHtmlPath, 'utf8');
    const css = fs.readFileSync(styleCssPath, 'utf8');
    const engine = fs.readFileSync(engineJsPath, 'utf8');
    const player = fs.readFileSync(playerJsPath, 'utf8');
    const enemy = fs.readFileSync(enemyJsPath, 'utf8');
    const main = fs.readFileSync(mainJsPath, 'utf8');

    // Replace CSS stylesheet link with inline style block
    html = html.replace('<link href="css/style.css" rel="stylesheet">', `<style>\n${css}\n</style>`);

    // Replace all split script tags with a single inline script tag containing all concatenated JS codes
    const scriptRegex = /<script src="js\/engine\.js"><\/script>\s*<script src="js\/player\.js"><\/script>\s*<script src="js\/enemy\.js"><\/script>\s*<script src="js\/main\.js"><\/script>/;
    const combinedScript = `<script>\n${engine}\n${player}\n${enemy}\n${main}\n</script>`;

    if (scriptRegex.test(html)) {
        html = html.replace(scriptRegex, combinedScript);
    } else {
        // Fallback replacement of separate script tags
        html = html.replace('<script src="js/engine.js"></script>', '');
        html = html.replace('<script src="js/player.js"></script>', '');
        html = html.replace('<script src="js/enemy.js"></script>', '');
        html = html.replace('<script src="js/main.js"></script>', combinedScript);
    }

    fs.writeFileSync(outputPath, html, 'utf8');
    console.log('Bundled successfully into 天堂放置版v0.2.3.html');
} catch (err) {
    console.error('Bundling failed:', err);
    process.exit(1);
}
