// Test the regex patterns used in the analyzer against the demo files
const fs = require('fs');

function testFile(filePath, label) {
    const text = fs.readFileSync(filePath, 'utf-8');
    const classLocations = new Map();

    // Same regex as in the rewritten analyzer
    const attrRegex = /\b(?:class|className|:class|v-bind:class)\s*=\s*(?:"([^"]*)"|'([^']*)'|{['"`]([^'"`]*)['"`]})/g;
    let m;
    while ((m = attrRegex.exec(text)) !== null) {
        const value = m[1] ?? m[2] ?? m[3] ?? '';
        const classRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let cm;
        while ((cm = classRegex.exec(value)) !== null) {
            const name = cm[0];
            if (!classLocations.has(name)) classLocations.set(name, []);
            classLocations.get(name).push({ file: label });
        }
    }

    console.log(`\n=== ${label} ===`);
    for (const [name, locs] of classLocations) {
        console.log(`  .${name}: ${locs.length} reference(s)`);
    }
}

testFile('demo-project/index.html', 'index.html');
testFile('demo-project/src/components/Card.jsx', 'Card.jsx');

// Now test combined
console.log('\n=== COMBINED ===');
const combined = new Map();
['demo-project/index.html', 'demo-project/src/components/Card.jsx'].forEach(filePath => {
    const text = fs.readFileSync(filePath, 'utf-8');
    const attrRegex = /\b(?:class|className|:class|v-bind:class)\s*=\s*(?:"([^"]*)"|'([^']*)'|{['"`]([^'"`]*)['"`]})/g;
    let m;
    while ((m = attrRegex.exec(text)) !== null) {
        const value = m[1] ?? m[2] ?? m[3] ?? '';
        const classRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let cm;
        while ((cm = classRegex.exec(value)) !== null) {
            const name = cm[0];
            if (!combined.has(name)) combined.set(name, 0);
            combined.set(name, combined.get(name) + 1);
        }
    }
});
for (const [name, count] of combined) {
    console.log(`  .${name}: ${count} reference(s)`);
}
