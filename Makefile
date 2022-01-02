all:
	node main.js < test/loopfact.json | diff test/loopfact_.json -
1:
	node inter.js < test/loopfact.json
	node inter.js < test/loopfact_.json
2:
	node compll.js < test/loopfact_.json > test/loopfact_.ll
	llc test/loopfact_.ll; gcc test/loopfact_.s; ./a.out    
vicis:
	git clone https://github.com/maekawatoshiki/vicis
vparse: vicis
	cd vicis; cargo run --example parse ../test/loopfact_.ll
vrun: vicis
	cd vicis; cargo run --example interpreter ../test/loopfact_.ll
