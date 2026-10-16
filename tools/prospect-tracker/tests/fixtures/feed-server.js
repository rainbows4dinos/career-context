import { startFixture } from './radar-server.js';
const fixture=await startFixture(8778);
await fetch(fixture.origin+'/__feed/control',{method:'POST',body:JSON.stringify({seedProfile:true})});
console.log(`Offline feed fixture: ${fixture.origin}/__feed`);
console.log('Synthetic login: radar@example.invalid / fixture-only-password');
process.on('SIGINT',async()=>{await fixture.close();process.exit(0);});
