#!/bin/bash

echo 'implicits: ['
for line in $(grep -R '#include' $1 | awk 'BEGIN { FS="\"" }; { print $2 }' | sort | uniq) ; do
    echo "  'public/${line}',"
done
echo '],'
