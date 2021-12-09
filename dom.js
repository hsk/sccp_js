export { map_inv, order, get_doms, get_dom, dom_tree, dom_fronts };

function union(setA, setB) {
    return setA.filter(a => !setB.includes(a)).concat(setB)
}

function intersection(setA, setB) {
    return setA.filter(a => setB.includes(a))
}

function map_inv(succ) {
    let out = {}; for (const k in succ) out[k] = []
    for (const p in succ)
        for (const s of succ[p]) out[s].push(p)
    return out
}

function order(succ, root) {
    let out = [], explored = {}
    function f(root) {
        if (root in explored) return
        explored[root] = 1
        succ[root].forEach(f)
        out.push(root)
    }
    f(root)
    return out.reverse()
}

function get_dom(succ, entry) {
    if (entry == null) entry = Object.keys(succ)[0]
    const pred = map_inv(succ)
    const nodes = order(succ, entry)
    let dom = {}; for (const v in succ) dom[v] = nodes.concat()
    while (true) {
        let changed = false
        for (const node of nodes) {
            let new_dom = []
            if (pred[node].length > 0) {
                new_dom = new_dom.concat(dom[pred[node][0]])
                for (let i = 1; i < pred[node].length; i++)
                    new_dom = intersection(new_dom, dom[pred[node][i]])
            }
            new_dom.push(node)
            if (dom[node].length != new_dom.length) {
                dom[node] = new_dom
                changed = true
            }
        }
        if (!changed) break
    }
    return dom
}

function dom_fronts(dom, succ) {
    const dom_inv = map_inv(dom)
    let frontiers = {}
    for (const block in dom) {
        let dom_succs = []
        for (const dominated of dom_inv[block])
            dom_succs = union(dom_succs, succ[dominated])
        frontiers[block] =
            dom_succs.filter(b => !dom_inv[block].includes(b) || b == block)
    }
    return frontiers
}

function dom_tree(dom) {
    const dom_inv = map_inv(dom)
    let st = {}
    Object.entries(dom_inv).forEach(([a, bs]) =>
        st[a] = bs.filter(b => b != a))
    let st_2x = {}
    Object.entries(st).forEach(([a, bs]) =>
        st_2x[a] = bs.reduce((set, b) => union(set, st[b]), []))
    let tree = {}
    Object.entries(st).forEach(([a, bs]) =>
        tree[a] = bs.filter(b => !st_2x[a].includes(b)))
    return tree
}

function get_doms(succs) {
    let domrel = get_dom(succs);
    let dom = dom_tree(domrel);
    let dom_front = dom_fronts(domrel, succs);
    return [dom,dom_front];    
}
