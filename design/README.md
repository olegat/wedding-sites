
No cropping:
```
magick design/photos/20260511-A7408546.jpg -resize 25% -quality 90 public/londonmemory1.jpeg

magick design/photos/20260511-A7408612.jpg -resize 25% -quality 90 public/londonmemory2.jpeg
```

Cropping 5% on the left and 5% on the right:
```
magick design/photos/20260511-A7408546.jpg \
  -resize 25% \
  -crop 90%x100%+0+0 \
  -gravity center \
  -quality 90 \
  public/londonmemory1.jpeg

magick design/photos/20260511-A7408612.jpg \
  -resize 25% \
  -crop 90%x100%+0+0 \
  -gravity center \
  -quality 90 \
  public/londonmemory2.jpeg
```