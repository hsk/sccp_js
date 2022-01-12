all:
	node main.js < test/loopfact.json | diff test/loopfact_.json -
1:
	node inter.js < test/loopfact.json
	node inter.js < test/loopfact_.json
2:
	node compll.js < test/loopfact_.json > test/loopfact_.ll
	llc test/loopfact_.ll; gcc test/loopfact_.s; ./a.out    
3:
	node compll.js < test/loopfact_3.json > test/loopfact_3.ll
	llc test/loopfact_3.ll; gcc test/loopfact_3.s; ./a.out    

vicis:
	git clone https://github.com/hsk/vicis
vparse: vicis 2
	cd vicis; cargo run --example parse ../test/loopfact_.ll
vrun: vicis 2
	cd vicis; cargo run --example interpreter -- --load=/usr/lib/libffi-trampolines.dylib ../test/loopfact_.ll

vparse3: vicis 3
	cd vicis; cargo run --example parse ../test/loopfact_3.ll
vrun3: vicis 3
	cd vicis; cargo run --example interpreter -- --load=/usr/lib/libffi-trampolines.dylib ../test/loopfact_3.ll

clean:
	rm -rf test/loopfact_.ll test/loopfact_.s test/loopfact_3.ll test/loopfact_3.s a.out vicis
