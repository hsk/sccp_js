import {get_doms} from "./dom.js"
import {d_with,da_with,successors} from "./cfg.js"
function v2bnames(cfg) {
    let v2bnames = {};
    for (const [name,block] of Object.entries(cfg))
        for (const instr of block)
            d_with(d=>{
                if (!(d in v2bnames))v2bnames[d]=[];
                v2bnames[d].push(name);
            },instr);
    return v2bnames;
}
export function get_phis(cfg, dom_fronts) {
    let phis = {};
    for (let i in cfg)phis[i]=[];
    for (let [v,bnames] of Object.entries(v2bnames(cfg)))
        for (let i = 0; i < bnames.length; i++) {
            const bname = bnames[i];
            for (let front of dom_fronts[bname])
                if (!phis[front].includes(v)) {
                    phis[front].push(v);
                    if (!bnames.includes(front)) bnames.push(front);
                }
        }
    return phis;
}
export function insert_phis(cfg, phi_args) {
    for (const [name,instrs] of Object.entries(cfg))
        for (const [dest,p] of Object.entries(phi_args[name])) // ファイ関数の挿入
            instrs.unshift(['phi',p['dest'],p['args']]);
}
function ssa_rename(args,cfg,succ,dom_tree,phis) {
    let phi_args = {}; for(let i in phis) phi_args[i]={};
    let stack = {}; for (let v of args) stack[v]=[v];
    let counters = [];
    function push_fresh(v) {
        if(!(v in counters)) counters[v] = 0;
        if(!(v in stack)) stack[v] = [];
        let n = v+"_"+counters[v]++;
        stack[v].push(n);
        return n;
    }
    function rename(block) {
        let old = {};
        for(let i in stack) old[i]=stack[i].length; // スタックを保存します。
        // phiノードのdestの名前を変更します。
        for (let p of phis[block]) {
            if (!(p in phi_args[block])) phi_args[block][p] = {};
            phi_args[block][p]['dest'] = push_fresh(p);
        }
        for (let i of cfg[block])
            da_with((d,f)=>f(push_fresh(d)),//dest名変更
                    (a,f)=>f(stack[a][stack[a].length-1]),i);// 引数名変更
        for (let s of succ[block]) // phi-node 引数の名前を（後続で）変更します。
            for (let p of phis[s]) {
                if (!(p in phi_args[s])) phi_args[s][p] = {};
                if (!('args' in phi_args[s][p])) phi_args[s][p]['args'] = {};
                phi_args[s][p]['args'][block] =
                    (p in stack && stack[p].length >0) ? stack[p][stack[p].length-1] : undefined;
            }
        for(let b of dom_tree[block]) rename(b); // 再帰呼び出し。
        for(let i in old) stack[i].length=old[i]; // スタックを復元
    }
    rename(Object.keys(cfg)[0]);
    return phi_args;
}
export function ssa([_func,_name,args,cfg]) {
    let succ = successors(cfg);
    let [dom_tree,dom_front] = get_doms(succ);
    let phis = get_phis(cfg, dom_front);
    let phi_args = ssa_rename(args,cfg,succ,dom_tree,phis);
    insert_phis(cfg,phi_args);
}
