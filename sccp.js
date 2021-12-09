import {da_with,a_map,successors} from "./cfg.js"
import { map_inv } from "./dom.js";
function fresh(seed,blocks) {
    for (let i = 1;;i++) {
        let name = seed + i;
        if (!(name in blocks)) {
            return name;
        }
    }
}
function getUsesDefs(blocks) {
    let def = {}, out = {};
    for(let [block,insts] of Object.entries(blocks))
        for(let inst of insts)
            da_with(d=>{
                def[d] = [inst, block];
                if(!(d in out)) out[d] = [];
            },a=>{
                if(undefined!=a){
                    if(!(a in out))out[a] = [];
                    out[a].push([inst, block]);
                }
            },inst);
    return [out, def];
}
function removeVariables(blocks,uses,defs) {
    // remove variables that have no uses
    let toRemove = [];
    Object.entries(uses).forEach(([k,v]) => {
        if (v.length == 0) toRemove.push(k);
    });
    while (toRemove.length != 0) {
        let rem = toRemove.pop();
        let [i, b] = defs[rem];
        delete uses[rem];
        blocks[b].splice(blocks[b].indexOf(i), 1);
        da_with(d=>{},a=>{
            if (a != undefined) {
                uses[a].splice(uses[a].findIndex(u => u[0] == i), 1);
                if (uses[a].length == 0)
                    toRemove.push(a);
            }
        },i)
    }
}
// Performs the sparse conditional constant propagation analysis.
// Returns a mapping from variables to their lattice value.
// Does not modify the program.
function sccp_analisys(blocks,uses,succs,preds) {
    // greatest lower bound of x and y in the lattice
    function meet(x, y) {
        if (x == "top")
            return y;
        if (y == "top" || x == y)
            return x;
        return "bottom";
    }
    function toInt(x) {
        if (typeof x == 'number')
            return x;
        throw "expected int";
    }
    function toBool(x) {
        if (typeof x == 'boolean')
            return x;
        throw "expected boolean";
    }

    let out = {}, inEdgeExecutables = {};
    let start = fresh("enter",blocks);
    succs[start]=[];
    preds[start]=[];
    //blocks[start]=[];
    let worklist_bb = [[start, Object.keys(blocks)[0]]];
    let worklist = [];
    function roundTowardZero(x) {
        return x < 0 ? Math.ceil(x) : Math.floor(x);
    }
    function evalExpr(inst) {
        let argLatElems = a_map(v => out[v],inst);
        if (!["and", "or"].includes(inst[2]) && argLatElems.includes("bottom"))
            return "bottom";
        if (inst[0]=="id") return argLatElems[0];
        if (inst[0]=="bin" || inst[0]=="un")
        switch (inst[2]) {
            case "add": return toInt(argLatElems[0]) + toInt(argLatElems[1]);
            case "mul": return toInt(argLatElems[0]) * toInt(argLatElems[1]);
            case "sub": return toInt(argLatElems[0]) - toInt(argLatElems[1]);
            case "div":
                if (argLatElems[1] == 0)
                    return "bottom";
                else
                    return roundTowardZero(toInt(argLatElems[0]) / toInt(argLatElems[1]));
            case "eq": return argLatElems[0] == argLatElems[1];
            case "lt": return toInt(argLatElems[0]) < toInt(argLatElems[1]);
            case "gt": return toInt(argLatElems[0]) > toInt(argLatElems[1]);
            case "ge": return toInt(argLatElems[0]) >= toInt(argLatElems[1]);
            case "le": return toInt(argLatElems[0]) <= toInt(argLatElems[1]);
            case "not": return !toBool(argLatElems[0]);
            case "and": return !argLatElems.includes(false);
            case "or": return argLatElems.includes(true);
        }
        throw "constant propagation error";
    }
    function phi(inst, executable) {
        let executables = a_map(a=>a,inst).filter((a, i) => executable[i]);
        let elems = executables.map(v => out[v]);
        let glb = elems.reduce(meet, "top");
        if (glb != out[inst[1]]) {
            out[inst[1]] = glb;
            for (let use of uses[inst[1]])
                worklist.push(use);
        }
    }
    function expr(inst, block) {
        switch (inst[0]) {
            case "br": // add executable out flow edges to worklist
                let latElem = out[inst[1]];
                if (meet(latElem, false) == "bottom")
                    worklist_bb.push([block, succs[block][0]]);
                if (meet(latElem, true) == "bottom")
                    worklist_bb.push([block, succs[block][1]]);
                break;
            case "const": // set lattice element to const value
                if (out[inst[1]] != inst[2]) {
                    out[inst[1]] = inst[2];
                    for (let use of uses[inst[1]])
                        worklist.push(use);
                }
                break;
            case "print": // do nothing
            case "nop":
            case "jmp":
            case "ret":
                break;
            default: // value operation
                let valOp = inst;
                let updated = evalExpr(valOp);
                if (out[valOp[1]] != updated) {
                    out[valOp[1]] = updated;
                    for (let use of uses[valOp[1]])
                        worklist.push(use);
                }
        }
    }
    preds[Object.keys(blocks)[0]].push(start);
    for (let v in uses)
        out[v] = "top";
    for (let block in blocks)
        inEdgeExecutables[block] = new Array(preds[block].length).fill(false);
    while (true) {
        if (worklist_bb.length) {
            let [pred, block] = worklist_bb.pop();
            let predIdx = preds[block].indexOf(pred);
            if (inEdgeExecutables[block]==[predIdx])
                continue;
            inEdgeExecutables[block][predIdx] = true;
            let i = 0;
            while (i < blocks[block].length && blocks[block][i][0] == "phi")
                phi(blocks[block][i++], inEdgeExecutables[block]);
            if (inEdgeExecutables[block].every((b, i) => !b || i == predIdx))
                while (i < blocks[block].length)
                    expr(blocks[block][i++], block);
            if (succs[block].length == 1)
                worklist_bb.push([block, succs[block][0]]);
            continue;
        }
        if(worklist.length) {
            let [inst, block] = worklist.pop();
            if (inst[0] == "phi")
                phi(inst, inEdgeExecutables[block]);
            else if (inEdgeExecutables[block].includes(true))
                expr(inst, block);
            continue;
        }
        break;
    }
    return [out, inEdgeExecutables];
}
// Performs optimizations based on SCC analysis results: removes branches determined
// to have a constant condition, removes unreachable blocks, replaces operations with
// consts where possible, removes unused variables.
function replaceConstants(blocks,uses,defs,values,inEdgeExecutables,succs,preds) {
    for (let [block,insts] of Object.entries(blocks)) {
        if (inEdgeExecutables[block].includes(true)) {
            if (succs[block].length != 2)
                continue;
            let branch = insts.slice(-1)[0];
            let val = values[branch[1]];
            if (typeof val != "boolean")
                continue;
            insts.pop();
            let u = uses[branch[1]];
            u.splice(u.findIndex(([i, b]) => i == branch), 1);
            let removedSucc = succs[block][val ? 1 : 0];
            let remainingSucc = succs[block][val ? 0 : 1];
            succs[block] = [remainingSucc];
            preds[removedSucc].splice(preds[removedSucc].indexOf(block), 1);
        }
        else {
            for (let [v, u] of Object.entries(uses))
                uses[v] = u.filter(([i, b]) => b != block);
            for (let [v, [i, b]] of Object.entries(defs))
                if (b == block)
                    delete defs[v];
            for (let succ of succs[block])
                preds[succ].splice(preds[succ].indexOf(block), 1);
        }
    }
    for (let [v, val] of Object.entries(values)) {
        if (val == "bottom" || val == "top")
            continue;
        let [def, defBlock] = defs[v];
        if (def[0] == "const")
            continue;
        a_map(arg=>{
            if (arg == undefined)
                return;
            uses[arg].splice(uses[arg].findIndex(([i, b]) => i == def), 1);
        },def);
        let insts = blocks[defBlock];
        let newDef = ["const",v,val];
        insts[insts.indexOf(def)] = newDef;
        defs[v] = [newDef, defBlock];
    }
    let toRemove = [];
    for (let [v, u] of Object.entries(uses))
        if (u.length == 0)
            toRemove.push(v);
    while (toRemove.length != 0) {
        let arr = defs[toRemove.pop()];
        if (arr == undefined)
            continue;
        let [def, defBlock] = arr;
        blocks[defBlock].splice(blocks[defBlock].indexOf(def), 1);
        a_map(arg=>{
            let u = uses[arg];
            u.splice(u.findIndex(([i, b]) => i == def), 1);
            if (u.length == 0)
                toRemove.push(arg);
        },def);
    }
}
export function sccp([_func,_name,_args,blocks]) {
    let succs = successors(blocks);
    let preds = map_inv(succs);
    let [uses,defs] = getUsesDefs(blocks);
    removeVariables(blocks,uses,defs);
    let [values,inEdgeExecutables] = sccp_analisys(blocks,uses,succs,preds);
    replaceConstants(blocks,uses,defs,values,inEdgeExecutables,succs,preds);
}
