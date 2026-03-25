const fs = require('fs');
const pdfParse = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:/Users/luanx/Documents/flux-catalog-creator/catalogo modelo.pdf');

pdfParse(dataBuffer).then(function(data) {
    console.log(data.numpages + ' pages');
    console.log('Text preview:');
    console.log(data.text.substring(0, 1000));
}).catch(function(err) {
    console.error(err);
});
