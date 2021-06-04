const fs = require('fs');
const path = './src/config.js'

console.log(process.env.DEPLOY_ACCOUNT)
if (!process.env.DEPLOY_ACCOUNT) {
    console.log('set DEPLOY_ACCOUNT')
    process.exit(1)
}
 
fs.readFile(path, 'utf-8', function(err, data) {
    if (err) throw err;
 
    data = data.replace(/.*const contractName.*/gim, `const contractName = '${process.env.DEPLOY_ACCOUNT}';`);
 
    fs.writeFile(path, data, 'utf-8', function(err) {
        if (err) throw err;
        console.log('Done!');
    })
})
