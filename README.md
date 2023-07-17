# Autocruden
[[Bible Map Browser](http://www.autocruden.com)] [[Verse Explorer](http://www.autocruden.com/explorer.html)]

## Bible Map Browser
Zoom in and out with the scroll wheel or by pinching on mobile (note that Chrome mobile works much worse than Firefox mobile). Double click on a pixel to show which two verses are being compared, as well as their similarity on a scale from 1.0 (the same) to a possible -1.0 (completely different, though no verses are this dissimilar). The brighter the colour, the more similar the verses, and of course every verse has a similarity of 1.0 with itself (the diagonal).

See for example the bright off-diagonal streaks around the gospels where the parallel passages occur:


I have embedded every verse of the World English Bible (a recent public domain translation of the Bible) as a 768 dimensional vector. The Bible Map Browser then displays the cosine similarity between these vectors for every possible pair of verses, ranging from 1 (white, see the diagonal).
