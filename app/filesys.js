const path = require("path"),
  fs = require("fs").promises,
  fss = require("fs"),
  crypto = require("crypto");
module.exports = {
  async file_read(src) {
    const extension = src.match(/.([^\.]+)$/i)[1];
    const params = {
      json: "utf8",
      txt: "utf8",
      jpg: "binary",
    };
    const content = await fs.readFile(src, params[extension]);
    //return Buffer.from(content)
    return content;
  },
  async file_write(src, text) {
    try {
      const content = await fs.writeFile(src, text);
      console.log("success");
      return true;
    } catch (err) {
      console.log(err);
    }
  },
  async dir_read(dirname, options = {}) {
    dirname = path.resolve("/", dirname);
    const res = [];
    const contents = await fs.readdir(dirname, { withFileTypes: true });
    for (let file of contents) {
      const filepath = path.resolve(dirname, file.name);
      const item = {
        name: file.name,
        path: filepath,
        parent: dirname,
      };
      if (file.isFile()) {
        //
      }
      if (file.isDirectory()) {
        const files = options.deep ? await dir_read(filepath) : [];
        item.files = files;
      }
      res.push(item);
    }
    return res;
  },

  //
  dir_read_sync(dirname) {
    console.log(dirname);
    const res = [];
    if (dirname == "C://$RECYCLE.BIN") {
      //return res;
    }
    const list = fss.readdirSync(dirname, { withFileTypes: true });
    for (let file of list) {
      if (file.isSymbolicLink()) {
        continue;
      }
      const filepath = path.join(dirname, file.name);
      try {
        fss.statSync(filepath);
      } catch (err) {
        continue;
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
    }
    return res;
  },
  //dir_read('C:/').then(res=>{console.log(res)})
  //
  get_parent(path_) {
    let upper = path_.split(path.sep);
    if (upper.length > 1) {
      upper.pop();
    }
    upper = upper.join(path.sep);
    return upper;
  },
  //
  hash_sum(file) {
    const hashSum = crypto.createHash("sha256");
    hashSum.update(file);
    const hex = hashSum.digest("hex");
    return hex;
  },
};
