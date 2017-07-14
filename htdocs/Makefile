JPG = $(patsubst %.png, %.jpg, $(wildcard large/*.png thumb/*png))

%.jpg: %.png
	guetzli --quality 84 $< $@

all: $(JPG)

clean:
	rm -f $(JPG)

.PHONY: all clean
