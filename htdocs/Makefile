FILES=$(wildcard *.png *.gif *.html *.js *.css full/*.jpg json/*.json large/*.jpg thumb/*.jpg)

GZ_FILES=$(patsubst %,%.gz,$(FILES))

%.gz: %
	gzip -c --best $< >| $@

all: $(GZ_FILES)

clean:
	rm -f $(GZ_FILES)

.PHONY: all clean
