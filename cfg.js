export function da_with(fd,fa,i) {
    switch(i[0]){
        case "id": fd(i[1],a=>i[1]=a); fa(i[2],a=>i[2]=a); break;
        case "const": fd(i[1],d=>i[1]=d); break;
        case "bin": fd(i[1],d=>i[1]=d); fa(i[3],a=>i[3]=a); fa(i[4],a=>i[4]=a); break;
        case "print": fa(i[1],a=>i[1]=a); break;
        case "phi": fd(i[1],d=>i[1]=d); for(let k in i[2])fa(i[2][k],a=>i[2][k]=a); break;
        case "br": fa(i[1],a=>i[1]=a); break;
        case "ret": if(i.length>1)fa(i[1],a=>i[1]=a); break;
        default: break;
    }
}
export function a_map(f,i) {
    let r = [];
    da_with(_=>{},a=>r.push(f(a)),i);
    return r;
}
export function d_with(f,i) {
    da_with(f,_=>{},i);
}
export function successors(blocks) {
    function f(is) {
        if(is.length==0)return [];    
        let i = is[is.length-1];
        switch (i[0]) {
            case "jmp": return [i[1]];
            case "br": return [i[2],i[3]];
            default: return [];
        }
    }
    let succs = {};
    for(let [i,is] of Object.entries(blocks)) succs[i] = f(is);
    return succs;
}
export function output_prog(prog) {
    console.log("[");
    for (let [func,name,args,blocks] of prog) {
        console.log("  ["+JSON.stringify(func)+","+JSON.stringify(name)+","+JSON.stringify(args)+",{");
        let bs = [];
        for (let [n,is] of Object.entries(blocks)) {
            let bstr = "";
            bstr+="    "+JSON.stringify(n)+":[\n";
            let r=[];
            for(let i of is) r.push("      "+JSON.stringify(i));
            bstr+=r.join(",\n")+"\n"
            bstr+="    ]";
            bs.push(bstr)
        }
        console.log(bs.join(",\n"));
        console.log("  }]");
    }
    console.log("]");
}
