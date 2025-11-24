const fs = require('fs');

const sqlFile = process.argv[2];
const content = fs.readFileSync(sqlFile, 'utf8');

const lines = content.split('\n');
const seenPatterns = new Set();
const outputLines = [];

for (const line of lines) {
  // Check if this is a pattern insert line
  const match = line.match(/^\('(informational|commercial|transactional|navigational)', '([^']+)'/);

  if (match) {
    const pattern = match[2];

    if (seenPatterns.has(pattern)) {
      // Skip duplicate
      console.error(`Skipping duplicate: ${pattern}`);
      continue;
    }

    seenPatterns.add(pattern);
  }

  outputLines.push(line);
}

fs.writeFileSync(sqlFile + '.dedup', outputLines.join('\n'), 'utf8');
console.error(`\nOriginal: ${lines.length} lines`);
console.error(`Deduplicated: ${outputLines.length} lines`);
console.error(`Removed: ${lines.length - outputLines.length} duplicate lines`);
