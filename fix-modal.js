const fs = require('fs');

let c = fs.readFileSync('index.html', 'utf8');

c = c.replace('function openModal(tab){', 'function openModal(tab){ window.scrollTo(0,0); document.body.style.overflow="hidden";');
c = c.replace('function closeModal(){', 'function closeModal(){ document.body.style.overflow="";');
c = c.replace('position:fixed;inset:0;z-index:500', 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999');

fs.writeFileSync('index.html', c);
fs.writeFileSync('frontend/index.html', c);
console.log('Done! Modal fixed.');
