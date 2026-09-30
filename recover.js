const fs = require('fs');
const path = 'C:\\Users\\monir\\.gemini\\antigravity-ide\\brain\\595195c4-9242-430e-93bd-f99f22300ffe\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');

let targetContent = null;
for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i]) continue;
    try {
        const obj = JSON.parse(lines[i]);
        if (obj.tool_calls) {
            for (const call of obj.tool_calls) {
                if (call.name === 'write_to_file' && call.args.TargetFile === 'd:\\projects\\apps\\OOTD\\App.tsx') {
                    targetContent = call.args.CodeContent;
                    break;
                }
            }
        }
    } catch (e) {}
    if (targetContent) break;
}

if (targetContent) {
    fs.writeFileSync('App.tsx', targetContent, 'utf8');
    console.log('Successfully recovered App.tsx! Length:', targetContent.length);
} else {
    console.log('Could not find write_to_file for App.tsx');
}
