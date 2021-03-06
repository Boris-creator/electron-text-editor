const fss = require('fs');
const path = require('path');
const os = require('os');
function dir_read_sync(dirname) {
    console.log(dirname)
  const res = [];
  if (dirname == "C://$RECYCLE.BIN") {
    //return res;
  }
  const list = fss.readdirSync(dirname, {withFileTypes: true});
  for(let file of list) {
      if(file.isSymbolicLink()){
        continue
      }
    const filepath = path.join(dirname, file.name);
    try{
        fss.statSync(filepath)
    } catch(err){
        continue
    }
    const stat = fss.statSync(filepath);
    if (stat && stat.isDirectory()) {
      let files;
      try {
        files = dir_read_sync(filepath);
      } catch (err) {
        console.log(filepath);
        console.log(err);
      }
      res.push({
        name: file.name,
        files: files,
      });
    } else {
      res.push(file.name);
    }
  };
  return res;
}
//console.log(dir_read_sync("C:/"));
//console.log(fss.statSync('C:\\swapfile.sys'))
const cli = require('./app/cli.js');
async function test_cli(shell){
  if(!shell && os.type() == 'Windows_NT'){
    await cli.execute('chcp 65001')
  }
  const out = await cli.execute('chcp'/*, 'C:\\Program Files\\Git\\bin\\bash.exe'*/);
  console.log(JSON.stringify(out))
}
test_cli()
