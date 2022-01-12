import fs from "fs";
function compfun(fun) {
    
    console.log("@.str = private unnamed_addr constant [4 x i8] c\"%d\\0A\\00\", align 1");
    console.log("declare i32 @printf(i8*, ...)");




    let args = fun[2].map(a=>"i32 "+a).join(", ");
    console.log("define i32 @"+fun[1]+ "("+args+") {");
    let cfg = fun[3];
    let id=0;
    for (let label in cfg) {
        let block = cfg[label];
        console.log(label+":")
        for(let c of block) {
            switch(c[0]) {
            case "const": // ["const",x,i]            定数
                console.log("  %"+c[1]+" = add i32 0, "+c[2])
                break;
            case "id":    // ["id",x,x]               コピー
                console.log("  %"+c[1]+" = add i32 0, %"+c[2])
                break;
            case "bin":   // ["bin",x,op,x,x]         二項演算子
                const cmps = {"gt":"sgt"};
                if(c[2] in cmps) {
                    console.log("  %"+c[1]+" = icmp "+cmps[c[2]]+" i32 %"+c[3]+", %"+c[4])
                    break;
                }
                const i1cmps={"eq":"eq","ne":"ne"};
                if(c[2] in i1cmps) {
                    console.log("  %"+c[1]+" = icmp "+i1cmps[c[2]]+" i1 %"+c[3]+", %"+c[4])
                    break;
                }
                console.log("  %"+c[1]+" = "+c[2]+" i32 %"+c[3]+", %"+c[4])
                break;
            case "br":    // ["br",x,l,l]             分岐
                console.log("  %"+id+" = icmp ne i1 %"+c[1]+", 0");
                console.log("  br i1 %"+id+", label %"+c[2]+", label %"+c[3]);
                id++;
                break;
            case "jmp":   // ["jmp",l]                ジャンプ
                console.log("  br label %"+c[1]);
                break;
            case "print": // ["print",x]              プリント
                console.log("  call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* @.str, i64 0, i64 0), i32 %"+c[1]+")");
                break;
            case "ret":   // ["ret"]                  リターン
                console.log("  ret i32 0");
                break;
            case "phi":
                let keys = Object.keys(c[2]);
                if(keys.length==1) {
                    console.log("  %"+c[1]+" = add i32 0, %"+c[2][keys[0]])
                    break;
                }
                let args = keys.map(k=>"[%"+c[2][k]+", %"+k+"]").join(", ");
                console.log("  %"+c[1]+" = phi i32 "+args);
                break;
            case "alloca":
                console.log("  %"+c[1]+" = alloca i32");
                break;
            case "store":
                console.log("  store i32 %"+c[2]+", i32* %"+c[1]);
                break;
            case "load":
                console.log("  %"+c[1]+" = load i32, i32* %"+c[2]);
                break;
            default:
                throw ("unknown instruction "+JSON.stringify(c));
            }
        }
    }
    console.log("}");
}
function comp(prog) {
    for(let fun of prog) {
        compfun(fun)
    }
}

function main() {
    let prog = JSON.parse(fs.readFileSync(0));
    try {
        comp(prog);
    } catch (e) {
        console.error(e)
    }
}

main();

