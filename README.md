# The Serve Archive: rebuilding tennis dresses from match photos

[![The Serve Archive dress rail](images/dress-rail.jpg)](https://www.servearchive.com/)

[The Serve Archive](https://www.servearchive.com/) is a museum-style catalogue of memorable tennis dresses, from the 1910s to the 2026 season. Every garment is shown the same way: empty, straight on, front and back, on the same warm-grey paper.

None of those garments were photographed like that. They exist in match photos, mid-swing, half hidden by an arm or a racket, often in black and white, and almost always owned by a photo agency. This is how I turned those photos into a consistent catalogue with AI image generation, and the rules that keep it honest.

**In numbers:** 175 looks, 173 back views (13 based on a photo of the back, 160 inferred and labelled as such), and one 3D pilot.

## From match photo to catalogue

Four examples. In each row: the photograph used as evidence, then the generated front and back.

<p>
  <img src="images/serena-rg-2018-photo.webp" height="260" alt="Serena Williams at Roland-Garros 2018 in a black catsuit with a red waistband">
  <img src="images/serena-rg-2018-front.webp" height="260" alt="Generated front of the black catsuit">
  <img src="images/serena-rg-2018-back.webp" height="260" alt="Generated back of the black catsuit">
</p>

**Serena Williams, Roland-Garros 2018.** The Nike catsuit from her first Grand Slam after giving birth. Photo: si.robi, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Williams_S._RG18_(17)_(41168711240).jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/), resized.

<p>
  <img src="images/rezai-rg-2010-photo.webp" height="260" alt="Aravane Rezaï at Roland-Garros 2010 in a black and gold dress">
  <img src="images/rezai-rg-2010-front.webp" height="260" alt="Generated front of the black and gold dress">
  <img src="images/rezai-rg-2010-back.webp" height="260" alt="Generated back of the black and gold dress">
</p>

**Aravane Rezaï, Roland-Garros 2010.** Black bodice, metallic gold skirt, lace hem. The designer is not documented, so the site says so. Photo: Yann Caradec, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Aravane_Rezai_Roland_Garros_2010_R1.jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/), resized. [See the prompts](process/prompts/rezai-rg-2010.md).

<p>
  <img src="images/sharapova-wimbledon-2008-photo.webp" height="260" alt="Maria Sharapova at Wimbledon 2008 in a white tuxedo-style top and shorts">
  <img src="images/sharapova-wimbledon-2008-front.webp" height="260" alt="Generated front of the tuxedo top and shorts">
  <img src="images/sharapova-wimbledon-2008-back.webp" height="260" alt="Generated back of the tuxedo top and shorts">
</p>

**Maria Sharapova, Wimbledon 2008.** A pleated tuxedo bib and tailored shorts instead of a dress. Photo: Barry Mangham, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3A252_-_Court_1_-_Maria_Sharapova.JPG), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), resized.

<p>
  <img src="images/alvarez-rg-1931-photo.webp" height="260" alt="Lilí Álvarez at the 1931 French Championships in a divided skirt, black and white photograph">
  <img src="images/alvarez-rg-1931-front.webp" height="260" alt="Generated front of the divided skirt ensemble">
  <img src="images/alvarez-rg-1931-back.webp" height="260" alt="Generated back of the divided skirt ensemble">
</p>

**Lilí Álvarez, Roland-Garros 1931.** Elsa Schiaparelli's divided skirt. The colour and fabric are interpreted from a black-and-white photo, and the site says that too. Photo: *Tennisz és Golf*, 24 June 1931, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lil%C3%AD_%C3%81lvarez.jpg), public domain.

## How a look gets made

**1. Choose it.** Only dresses with a real design story: an unusual silhouette or construction, heavy embellishment, or something made for one player. A title win in an ordinary kit does not qualify. The full criteria are in [selection-criteria.md](process/selection-criteria.md).

**2. Check the facts.** Player, tournament, date, designer, and the exact version in the photo. Similar outfits get mixed up online, so this step catches real errors. For Rezaï I used a Roland-Garros photo, not the similar Australian Open outfit. Bethanie Mattek-Sands's 2006 US Open look turned out to be a top and skirt, not the one-piece toga it is often described as.

**3. Generate the front.** Each prompt gets two kinds of image with strict roles. The match photo is the only source of the design: cut, colour, seams, trim, logos. A second image is used only for presentation: the empty-garment look, the light, the scale. The prompt then fixes everything else: an exact straight-on view, the garment between 15% and 85% of the canvas height, a flat warm-grey background (#f7f6f2), and no body, hanger, racket or jewellery. [Example prompts](process/prompts/rezai-rg-2010.md).

**4. Reconstruct the back.** Most match photos never show the back. When there is a photo of it, it is used. When there isn't, the back is rebuilt conservatively from the front and side and marked "inferred" on the site. Early backs kept coming out as fronts seen from behind, with chest shapes and front necklines, so [rules for rear views](process/rear-view-rules.md) were added after review.

**5. Make the set consistent.** A second, narrower pass fixes stance, camera angle and placement without touching the garment ([example](process/prompts/serena-rg-2018-remaster.md)). Then every front and back pair is measured and aligned to the same centre and height, and each image's display brightness is calibrated so all 175 sit on the same paper colour.

**6. Check before publishing.** Every image is reviewed by eye, and 14 automated checks cover the content, player pages, navigation and link previews. If a detail is uncertain, the site says so instead of guessing.

## What I decided

The AI generates and the scripts check, but the archive is edited.

- **What gets in.** Several looks were cut at my request after review because they did not meet the bar.
- **What is true.** Facts are checked against sources and the corrections are recorded: the Mattek-Sands outfit, a Wozniacki colourway that is easy to confuse with others, a press release that got Venus Williams's match day wrong.
- **How honest each image is.** Inferred backs, interpreted colours and undocumented designers are labelled on the site, not hidden.
- **How it looks.** The paper colour, the type and the dress rail on the home page.

## Tools

- **Images:** OpenAI's image generation, run through Codex, which also helped build the site.
- **3D:** Hunyuan 3D on fal, for a one-look [pilot](process/3d-pilot.md).
- **Site:** plain HTML, CSS and JavaScript, with Three.js for the dress rail.

## About the images

The generated garments are interpretive reconstructions, not photographs of the real clothes. The four match photos in this repository are all Creative Commons or public domain, with their credits above. The live site also shows press photos for comparison, and those stay with their owners, so they are not included here.

---

Made by [Annoushka](https://www.anshka.com).
