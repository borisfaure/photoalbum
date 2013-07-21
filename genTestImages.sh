#!/bin/sh

if [ $# -ne 1 ]
then
    echo "Usage: `basename $0` {images_to_generate}"
    exit 1;
fi

for I in `seq 1 $1`
do
    convert -size 3072x2304 -gravity center label:$I in/IMG_`printf '%.06i' $I`.jpg
done
