const fs = require('fs');
const s = fs.readFileSync('App.tsx', 'utf8');
console.log('EN editLabel:', s.includes("editLabel: 'Edit'") ? 'YES' : 'MISSING');
console.log('BN editLabel:', s.includes("editLabel: 'সম্পাদনা'") ? 'YES' : 'MISSING');
console.log('Pencil icon (create-outline):', s.includes('create-outline') ? 'YES' : 'MISSING');
console.log('Label copy.editLabel:', s.includes('{copy.editLabel}') ? 'YES' : 'MISSING');
console.log('Old person-circle-outline:', s.includes('person-circle-outline') ? 'STILL PRESENT' : 'REMOVED');
