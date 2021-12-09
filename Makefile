all:
	node main.js < test/loopfact.json | diff test/loopfact_.json -
	node main.js < test/id.json | diff test/id_.json -
1:
	node main.js < test/loopfact.json
	node main.js < test/id.json
