import fs from "fs";
function main() {
    let prog = JSON.parse(fs.readFileSync(0));
    try {
        run(prog);
    } catch (e) {
        console.error(e)
    }
}
function searchFunction(prog,fname) {
    for(let i of prog) {
        if (i[1]==fname) return i;
    }
    throw ("not found "+fname);
}
function getFirstLabel(cfg,fname) {
    for(let i in cfg) {
        return i;
    }
    throw ("not found first label of "+fname);

}
function run(prog) {
    let fname = "main";
    let fun = searchFunction(prog,fname);
    let cfg = fun[3];
    let label = getFirstLabel(cfg,fname);
    let lastlabel = label;
    let basicblock = cfg[label];
    let env = {};
    for(let i = 0; i < basicblock.length;i++) {
        let c = basicblock[i];
        switch(c[0]){
            case "const":
                env[c[1]]=c[2];
                break;
            case "jmp":
                lastlabel=label;
                if (!(c[1] in cfg))
                    throw ("not found label "+c[1]);
                basicblock=cfg[label=c[1]];
                i=-1;
                break;
            case "br":
                lastlabel=label;
                if (!(c[2] in cfg))
                    throw ("not found label "+c[2]);
                if (!(c[3] in cfg))
                    throw ("not found label "+c[3]);
                if (env[c[1]])
                    basicblock = cfg[label=c[2]];
                else
                    basicblock = cfg[label=c[3]];
                i=-1;
                break;
            case "phi":
                env[c[1]]=env[c[2][lastlabel]];
                break;
            case "print":
                console.log(env[c[1]]);
                break;
            case "ret":
                return;
            case "bin":
                switch(c[2]) {
                    case "gt":
                        env[c[1]]= (env[c[3]]>env[c[4]]) ? 1 : 0;
                        break;
                    case "mul":
                        env[c[1]]= env[c[3]] * env[c[4]];
                        break;
                    case "sub":
                        env[c[1]]= env[c[3]] - env[c[4]];
                        break;
                    default:
                        throw ("unknown instruction "+JSON.stringify(c)); 
                }
                break;
            default:
                throw ("unknown instruction "+JSON.stringify(c));
        }
    }
}

main();
