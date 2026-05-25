
No cropping:
```
magick design/photos/20260511-A7408546.jpg -resize 25% -quality 90 public/londonmemory1.jpeg

magick design/photos/20260511-A7408612.jpg -resize 25% -quality 90 public/londonmemory2.jpeg
```

Cropping 5% on the left and 5% on the right:
```
magick design/photos/20260511-A7408546.jpg \
  -resize 25% \
  -gravity center \
  -crop 90%x100%+0+0 \
  -quality 90 \
  public/londonmemory1.jpeg

magick design/photos/20260511-A7408612.jpg \
  -resize 25% \
  -gravity center \
  -crop 90%x100%+0+0 \
  -quality 90 \
  public/londonmemory2.jpeg
```

```
magick /mnt/pepper/Pictures/20260511-londonmemory/20260511-A7408010.jpg  -resize 25% -crop 90%x100%+0+0 -gravity center -quality 90 public/londonmemory3.jpeg
``


```
magick design/photos/20260511-A7407434.jpg -resize 25% public/placeholder2.jpeg
magick design/photos/20260511-A7407680.jpg -resize 12.5% public/placeholder4.jpeg
magick design/photos/20260511-A7408313.jpg -resize 12.5% -quality 90 public/londonmemory4.jpeg
```
