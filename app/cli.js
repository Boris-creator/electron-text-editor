const exec = require("child_process").exec;
const Iconv = require("iconv").Iconv;
module.exports = {
    execute(command, shell, encoding){
        return new Promise((res, rej) => {
            const options = {};
            if(shell){
                options.shell = shell;
            }
            if(encoding){
                options.encoding = encoding;
            }
            const process = exec(command, 
            options, 
            function(err, stdout, stderr){
                //console.log(process.pid)
                let output;
                if(err){
                    output = stderr;
                    //rej(text)
                } else {
                    output = stdout;
                }
                if(encoding){
                    const conv = Iconv(encoding, 'utf8');
                    //output = conv.convert(Buffer.from(output, 'binary')).toString();
                    output = conv.convert(output).toString();
                }
                res(output)
            })
        })
    }
};
