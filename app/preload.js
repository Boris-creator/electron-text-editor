// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const electron = require("electron"),
  path = require("path"),
  fs = require("fs").promises,
  fss = require("fs"),
  crypto = require("crypto");
const { title } = require("process");
const shell = electron.shell;
function file_open(src) {
  //shell.showItemInFolder(path.join(__dirname, src))
  shell.showItemInFolder(src);
}
async function file_read(src) {
  const extension = src.match(/.([^\.]+)$/i)[1];
  const params = {
    json: "utf8",
    txt: "utf8",
    jpg: "binary",
  };
  const content = await fs.readFile(src, params[extension]);
  //return Buffer.from(content)
  return content;
}
async function file_write(src, text) {
  try {
    const content = await fs.writeFile(src, text);
    console.log("success");
    return true;
  } catch (err) {
    console.log(err);
  }
}
async function dir_read(dirname, options = {}) {
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
}

//
function dir_read_sync(dirname) {
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
}
//dir_read('C:/').then(res=>{console.log(res)})
//
function get_parent(path_) {
  let upper = path_.split(path.sep);
  if (upper.length > 1) {
    upper.pop();
  }
  upper = upper.join(path.sep);
  return upper;
}
//
function hash_sum(file) {
  const hashSum = crypto.createHash("sha256");
  hashSum.update(file);
  const hex = hashSum.digest("hex");
  return hex;
}
//
window.addEventListener("DOMContentLoaded", () => {
  /*
  Vue.component('file', {
    props: ['file'],
    template: `<div @doubleclick="read">{{file.name}}</div>`,
    methods:{
      async read(){
        console.log(await file_read(this.file.path))
      }
    }
  });
  Vue.component('directory', {
    props: ['dir'],
    data:{
      files: []
    },
    template: `
    <div>
      <span @doubleclick="open">{{dir.name}}</span>
      <ul v-if="dir.files.length">
        <li v-for="item of dir.files">
          <directory v-if="item.files" :dir="item"></directory>
          <file v-else :file="item"></file>
        </li>
      </ul>
    </div>`,
    methods:{
      async open(){
        const contents = await dir_read(this.dir.path);
        this.files.splice(0, this.files.length, contents)
      }
    }
  })
  const vm = new Vue({
    el: '#root'
  })
  */
  class History {
    //draft
    constructor(comparer, clb = () => {}) {
      this.stack = [];
      this.current = 0;
      this.comparer = comparer;
      this.indicator = new Proxy(this, {
        set(target, prop, val) {
          if (prop == "current") {
            target[prop] = val;
            const state = {
              forth: target.current < target.stack.length - 1,
              back: target.current > 0,
            };
            clb(state);
            return true;
          }
        },
      });
    }
    push(state) {
      const latest = Math.max(0, this.stack.length - 1);
      if (
        this.stack.length &&
        this.current == latest &&
        this.comparer(this.stack[latest], state)
      ) {
        return;
      }
      this.stack.splice(this.current + 1, this.stack.length, state);
      this.indicator.current = this.stack.length - 1;
    }
    forth() {
      this.indicator.current = Math.min(
        this.current + 1,
        this.stack.length - 1
      );
    }
    back() {
      this.indicator.current = Math.max(this.current - 1, 0);
    }
  }
  class History_multiple {
    constructor(comparer = (a, b) => a == b, clb = () => {}) {
      this.branches = {};
      this.current_branch = null;
      this.comparer = comparer;
    }
    add_branch(title, state) {
      const branch = {
        stack: [state],
        current: 0,
        modified: false,
        last_saved: -1,
      };
      this.branches[title] = branch;
      branch.last_saved = state.hash;
      return branch;
    }
    del_branch(title) {
      delete this.branches[title];
      //this.current_branch =
    }
    push(state) {
      const branch = this.branches[this.current_branch];
      const latest = Math.max(0, branch.stack.length - 1);
      if (
        branch.stack.length &&
        branch.current == latest &&
        this.comparer(branch.stack[latest], state)
      ) {
        return;
      }
      branch.stack.splice(branch.current + 1, branch.stack.length, state);
      branch.modified = true;
      branch.current = branch.stack.length - 1;
      // branch.modified = hash_sum(branch.stack[branch.current]) == branch.hash; //Не затормозит ли?
    }
    forth() {
      const branch = this.branches[this.current_branch];
      branch.current = Math.min(branch.current + 1, branch.stack.length - 1);
      console.log(branch.stack[branch.current].hash == branch.last_saved);

      branch.modified = branch.stack[branch.current].hash != branch.last_saved;
    }
    back() {
      const branch = this.branches[this.current_branch];
      branch.current = Math.max(branch.current - 1, 0);
      console.log(branch.stack[branch.current].hash == branch.last_saved);
      branch.modified = branch.stack[branch.current].hash != branch.last_saved;
    }
  }
  class History_renderer extends History_multiple {
    constructor(render, comparer = (a, b) => a == b, clb = () => {}) {
      super(comparer, clb);
      this.render = render;
      this.current_branch_ = null;
      const h = this;
      Object.defineProperty(this, "current_branch", {
        set: function (val) {
          this.current_branch_ = val;
          h.render.render2(h.branches, val);
        },
        get: function () {
          return h.current_branch_;
        },
      });
    }
    add_branch(title, state) {
      const branch = super.add_branch(title, state);
      const h = this;
      branch.current__ = 0;
      //this.branches[title].current__ = 0;
      Object.defineProperty(this.branches[title], "current_", {
        set: function (val) {
          h.render.render2(h.branches, h.current_branch);
        },
        get: function () {
          return this.current__;
        },
      });
      Object.defineProperty(this.branches[title], "current", {
        set: function (val) {
          this.current__ = val;
          h.render.render1(h.branches, h.current_branch);
        },
        get: function () {
          return this.current__;
        },
      });
      return branch;
    }
    del_branch(title) {
      super.del_branch(title);
      this.render.render2(this.branches, this.current_branch);
    }
    forth() {
      super.forth();
      const branch = this.branches[this.current_branch];
      branch.current_ = branch.current;
    }
    back() {
      super.back();
      const branch = this.branches[this.current_branch];
      branch.current_ = branch.current;
    }
  }
  const path_history = new History(
    (s1, s2) => s1.path == s2.path,
    (state) => {
      document.getElementById("forth").disabled = !state.forth;
      document.getElementById("back").disabled = !state.back;
    }
  );
  function render_dir(dir, el, el2 = el) {
    el.innerHTML = "";
    if (!dir.files.length) {
      el.innerHTML = "Эта папка пуста";
      return;
    }
    const ul = document.createElement("ul");
    for (let item of dir.files) {
      const li = document.createElement("li");
      li.innerHTML = `
      <span 
        data-type="${item.files ? 1 : 0}" 
        data-path="${item.path}" 
        class="title">
        ${item.name}
        </span>`;
      li.ondblclick = async function (e) {
        path_history.push({
          path: item.path,
          type: item.files ? 1 : 0,
        });
        if (item.files) {
          const contents = {
            path: item.path,
            files: await  dir_read(item.path),
          };
          render_dir(contents, el2);
        } else {
          if (/^\.(js|json|css|txt|log)$/i.test(path.extname(item.path))) {
            editor.path = item.path;
            if (!(item.path in editor_history.branches)) {
              const data = await file_read(item.path);
              editor_history.add_branch(item.path, { value: data, hash: {} });
              //.hash = (hash_sum(data));
              //refs.history.querySelector('li:last-child')?.scrollIntoView()
              setTimeout(() => {
                refs.history.scrollTop = refs.history.scrollHeight;
              }, 0);
            }
            editor_history.current_branch = item.path;
          }
        }
        const active = el.querySelector(".active");
        if (active) {
          active.classList.remove("active");
        }
        li.classList.add("active");
      };
      ul.append(li);
    }
    el.append(ul);
    const path_line = dir.path
      .split(path.sep)
      .map((chunk) => `<span class="chunk">${chunk}</span>`)
      .join(`<span>${path.sep}</span>`);
    document.getElementById("path").innerHTML = path_line;
  }
  dir_read("").then((res) => {
    render_dir(
      {
        files: res,
        path: "",
      },
      document.getElementById("aside"),
      document.getElementById("main")
    );
  });
  document
    .getElementById("history")
    .addEventListener("click", async function (e) {
      const back = e.target.closest("#back"),
        forth = e.target.closest("#forth");
      if (back) {
        path_history.back();
      }
      if (forth) {
        path_history.forth();
      }
      const item = path_history.stack[path_history.current];
      let path_ = item.path;
      if (item.type == 0) {
        //path_ = path.basename(path_)
        path_ = get_parent(path_);
      }
      const content = await dir_read(path_);
      render_dir(
        {
          files: content,
          path: path_,
        },
        document.getElementById("main")
      );
    });
  document.getElementById("up").addEventListener("click", async function () {
    if (!path_history.stack.length) {
      return;
    }
    const path_ = path_history.stack[path_history.current].path,
      upper = get_parent(path_);
    const content = await dir_read(upper);
    render_dir(
      {
        files: content,
        path: upper,
      },
      document.getElementById("main")
    );
    path_history.push({
      path: upper,
      type: 1,
    });
  });
  document.getElementById("path").addEventListener("click", async function (e) {
    const chunk = e.target.closest(".chunk");
    if (!chunk) {
      return;
    }
    const chunks = [...document.querySelectorAll("#path .chunk")],
      i = chunks.indexOf(chunk),
      tail = chunks.slice(0, i + 1).map((ch) => ch.textContent);
    //, path_ = tail.join(path.sep);
    let path_ = path.join(...tail);
    const type = (await fs.lstat(path_)).isFile() ? 0 : 1;
    path_history.push({
      path: path_,
      type: type,
    });
    path_ = type == 1 ? path_ : path.basename(path_);
    const content = await dir_read(path_);
    render_dir(
      {
        files: content,
        path: path_,
      },
      document.getElementById("main")
    );
  });
  //
  const editor = {
    filepath: "",
    set path(val) {
      this.filepath = val;
      document.getElementById("file_title").value = val;
    },
  };
  const refs = {
    redactor: document.querySelector("#editor textarea"),
    saver: document.getElementById("file_save"),
    history: document.getElementById("editor_history"),
    forth: document.getElementById("editor_forth"),
    back: document.getElementById("editor_back"),
  };
  const editor_history = new History_renderer(
    {
      render1(branches, branch) {
        const b = branches[branch];
        if (b) {
          refs.forth.disabled = !(b.current < b.stack.length - 1);
          refs.back.disabled = !(b.current > 0);
          refs.history
            .querySelector(".active")
            ?.classList.toggle("modified", b.modified);
        }
      },
      render2(branches, branch) {
        const b = branches[branch];
        const bs = { ...branches };
        refs.redactor.value = b.stack[b.current].value;
        refs.history
          .querySelector(".active")
          ?.classList.toggle("modified", b.modified);
        for (let li of document.querySelectorAll("#editor_history li")) {
          if (!(li.dataset.title in bs)) {
            li.remove();
            continue;
          }
          delete bs[li.dataset.title];
        }
        for (let title in bs) {
          refs.history.insertAdjacentHTML(
            "beforeend",
            `
        <li data-title="${title}">${title}</li>
        `
          );
        }
        for (let li of refs.history.querySelectorAll("li")) {
          li.classList.toggle("active", li.dataset.title == branch);
          li.classList.toggle("modified", branches[li.dataset.title].modified);
        }
      },
    },
    (a, b) => a.value == b.value
  );
  async function save_file() {
    if (!editor.filepath) {
      return;
    }
    await file_write(editor.filepath, refs.redactor.value);
    const branch = editor_history.branches[editor_history.current_branch];
    branch.last_saved = branch.stack[branch.current].hash;
  }
  refs.history.addEventListener("click", function (e) {
    const li = e.target.closest("li");
    if (li) {
      editor_history.current_branch = li.dataset.title;
    }
  });
  refs.redactor.addEventListener("input", function (e) {
    editor_history.push({
      value: this.value,
      hash: {},
    });
  });
  refs.saver.addEventListener("click", async () => {
    await save_file();
    if (document.querySelector(".modified.active")) {
      document.querySelector(".modified.active").classList.remove("modified");
    }
  });
  refs.forth.onclick = () => {
    editor_history.forth();
  };
  refs.back.onclick = () => {
    editor_history.back();
  };
  document.addEventListener(
    "keydown",
    async function (e) {
      if (
        e.key == "s" &&
        (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)
      ) {
        e.preventDefault();
        await save_file();
        if (document.querySelector(".modified.active")) {
          document
            .querySelector(".modified.active")
            .classList.remove("modified");
        }
        console.log("saved");
      }
      if (
        e.key == "z" &&
        (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)
      ) {
        e.preventDefault();
        editor_history.back();
      }
      if (
        e.key == "y" &&
        (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)
      ) {
        e.preventDefault();
        editor_history.forth();
      }
    },
    false
  );
  //
  /*
  const refs = {
    filepath: document.getElementById('filepath'),
    redactor: document.getElementById('redactor')
  }
  document.getElementById('openfile').addEventListener('click', function(){
    const src = refs.filepath.value;
    file_open(src)
  });
  document.getElementById('readfile').addEventListener('click', async function(){
    const src = refs.filepath.value;
    const data = await file_read(src);
    refs.redactor.value = data
  });
  document.getElementById('save').addEventListener('click', function(){
    file_write(refs.filepath.value, refs.redactor.value)
  })
  */
});

/*
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})
*/
