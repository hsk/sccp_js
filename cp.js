// copy propagation
import { da_with } from "./cfg.js";
export function cp([_func,_name,_args,cfg]) {
    let ids = {};
    for (let bb of Object.values(cfg)) {
        for (let i = 0; i < bb.length; i++) {
            let inst = bb[i];
            if (inst[0]=="id") {
                let [_id,d,s]=inst;
                ids[d]=s;
                bb.splice(i,1);
                i--;
            }
        }
    }
    function id(a) {
        while(a in ids) a=ids[a];
        return a;        
    }
    for (let bb of Object.values(cfg)) {
        for (let inst of bb) {
            da_with(_=>{},(a,f)=>{
                if (a in ids) f(id(a));
            },inst);
        }
    }
}
