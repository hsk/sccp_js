import fs from "fs";
import {sccp} from "./sccp.js";
import {ssa} from "./ssa.js";
import {cp} from "./cp.js";
import {output_prog} from "./cfg.js"
function main() {
    let prog = JSON.parse(fs.readFileSync(0));
    for (let f of prog) {
        ssa(f);
        sccp(f);
        cp(f);
    }
    output_prog(prog);
}
main();
