# The Serve Archive: dress reconstruction and interactive hero

This document explains how the archive’s garment images were created and how they become the interactive dress rail on the homepage. It describes the current implementation and the production records stored with the project, rather than the earlier experiments that were replaced.

## The idea

The Serve Archive brings tennis outfits from different eras into a consistent visual setting. Original photographs vary enormously: players are moving, garments are partly obscured, lighting differs, and the available images often show only one angle. The reconstruction process translates those references into a comparable garment-only catalogue.

The homepage then turns a selection of those garments into a virtual clothing rail. Visitors can move between looks, turn a selected garment around, and open its archive page.

These are two connected stages:

**Historical references → garment reconstructions → reviewed front/back images → interactive hanging garments.**

## 1. Researching and defining each look

Each reconstruction starts with identifying a particular outfit: the player, tournament, year, and brand or designer where documented. Match clothing and walk-on clothing are treated as separate looks when their designs differ.

Reference material includes match photographs and, where available, museum photographs of surviving garments. Museum object photographs can establish construction and decoration; match photographs help explain how a garment sits and moves when worn.

The research records preserve sources and garment-specific observations. Before generation, those observations become a visual brief covering the silhouette, neckline, straps or sleeves, waist, skirt shape, fabric, colour, seams, trim, and defining decoration.

A key distinction is between **details visible in a reference** and **details that must be inferred**. A front photograph does not establish the construction of the back. When rear evidence is missing, the production briefs call for a conservative, plausible interpretation rather than invented ornament.

## 2. Creating the garment-only reconstructions

The stored production records include AI image generation and image editing, including the built-in ImageGen tool. Different batches used slightly different workflows: some garments were generated or revised individually, while later batches included paired front/back compositions.

The intended result is an invisible-mannequin presentation: the garment retains volume and natural drape, but no person, visible mannequin, stand, or hanger appears in the catalogue image.

The recurring art-direction rules are:

- Straight-on, upright views with a level camera and a stable centreline.
- The complete garment visible, including shoulders, sleeves and hem.
- Consistent scale and comfortable margins.
- Soft, neutral lighting that reveals fabric texture.
- A flat warm-grey studio background, targeted at `#f7f6f2`.
- No captions, watermarks, invented branding, floor, horizon, or exterior cast shadows.
- Preservation of the reference garment’s defining proportions, construction and decoration.

Some remastering prompts used a second image as a presentation reference. Its role was to guide framing, background and lighting—not to supply the clothing design.

Generation was iterative. A first result could establish the garment, followed by focused corrections to framing, drape, background, or a specific detail. The prompts are instructions to the image model, not proof that every requested detail was reproduced exactly.

## 3. Reviewing front and back as a pair

The front and back must read as the same garment. Review therefore covers more than the neckline: silhouette, skirt length, colour, material, seams, decoration, and apparent volume all need to agree.

Rear-view guidelines specifically address a common generation problem: a back that retains front-facing chest anatomy. The desired rear has a broad upper-back plane, plausible shoulder-blade drape and a natural taper, without breast-shaped contours or underbust shadows. It should still have depth rather than becoming a flat cutout.

When correcting only rear anatomy, the existing rear image is the editing reference. This helps preserve the established rear construction instead of rebuilding it from the front.

Reference/reconstruction pairings and file hashes record which images were reviewed together. Revised assets can receive fresh filenames so the browser does not keep showing an older cached version. An inferred back remains an interpretation even after visual corrections.

## 4. Making the catalogue feel consistent

Matching image dimensions alone does not guarantee matching garment size. One image may contain more empty space, or an asymmetric sleeve may shift its apparent centre.

The project stores reviewed garment bounds and uses them to calculate uniform scaling and translation. For the recorded front/back pairs, the alignment script centres each silhouette and gives both views the same displayed height without stretching their proportions. It also checks that the garment remains inside its image box.

Both angle layers occupy the same container during transitions. This prevents the widget itself from changing size while the front and back crossfade.

Background consistency has also been reviewed and corrected over several iterations. Historical calibration files document earlier approaches, including some that were subsequently removed. The visual objective remains a continuous studio surface, without a differently coloured rectangle around the garment or loss of detail in white fabric.

## 5. Turning the images into the interactive rail

The current hero is built with vanilla JavaScript, Three.js and WebGL. It does not load a separately generated, fully modelled 3D garment for every dress. Instead, it creates procedural curved surfaces and maps the reconstructed front and back images onto them.

This hybrid approach preserves the rich detail of the images while giving the garments enough depth to rotate and respond to movement.

### Preparing the images

For each rail look, the browser loads its front and back images and processes them on a canvas. It samples the studio background near the corners and removes matching background pixels connected to the image edges. This is more selective than removing every light-coloured pixel, which would also erase white fabric.

Certain light or delicate garments have stricter handling. The resulting image is fitted into a common texture canvas, and its visible left and right edges are measured row by row.

This preparation is specific to the rail; it does not overwrite the catalogue’s source images.

### Building volume

The silhouette measurements guide a curved front surface and a curved back surface. Each surface carries its corresponding image as a texture. A depth profile gives the bodice thickness and allows the skirt to open outward.

Garment profiles control proportions, waist position, skirt depth, folds, sheen and movement. Some looks have individual settings; others use a shared default. The skirt construction avoids sealing the hem into a bag-like shape, while image transparency retains details such as scallops and irregular edges.

The side view is therefore a procedural interpretation derived from the images and these profiles. It is not a photographed or scanned record of the garment’s true side construction.

### Attaching the hanger

The rail and hangers are constructed separately in 3D. The current hangers use one consistent size and a transparent-plastic material with reflective edges. Their hooks remain positioned around the pale metal rail while the hanger shoulders and garment turn beneath them.

The attachment is based on the garment’s shoulder or strap peaks, not simply the top of its image rectangle. Those points are aligned with the hanger’s shoulder surface. Small textured folds help the fabric appear to wrap over the support, and specific fit adjustments accommodate some raised or closed necklines.

## 6. Making the rail respond naturally

On desktop, moving over a garment selects it. The selected look turns forward and its neighbours remain angled at approximately 56 degrees. Front and Back controls rotate the selected garment to the corresponding view.

Dragging moves the rail horizontally; releasing a drag selects the nearest garment. Previous/Next buttons and keyboard navigation provide alternative controls. Each dress also has an ordinary link to its detail page, with click suppression after a drag to avoid accidental navigation.

Movement is driven by damped springs. Position and rotation approach their targets gradually, with a small settling motion rather than an abrupt jump.

Fabric has an additional layer of movement. A custom vertex shader keeps the shoulders relatively fixed while allowing the lower garment to lag behind a turn, drift, twist and ripple. Fabric profiles vary the strength of these effects. This is a designed real-time deformation—not a physically exact cloth simulation with pattern pieces and collision solving.

Lighting, restrained material sheen, plastic reflections and soft shadow planes help the separate elements read as one scene.

## 7. Loading, performance and accessibility

The empty rail is rendered first. The initially selected garment receives priority, then nearby garments load outward with limited concurrency. As each finishes loading, it fades in with a subtle settling motion.

The renderer caps pixel density and pauses scene updates when the hero is off screen or the browser tab is hidden. Reduced-motion preferences remove the spring-driven movement and fabric deformation. Keyboard-operable links and controls sit alongside the visual canvas.

## What makes the result convincing

The effect comes from several layers working together: reference-led images, consistent framing, matched front/back pairs, silhouette-based volume, supported shoulders, restrained movement and coherent lighting. No single generation prompt or animation setting supplies the whole result.

The images remain interpretive reconstructions. They are useful for presenting and comparing tennis fashion, but should not be described as exact replicas, verified sewing patterns, photogrammetric scans, or conservation records.

---

The site's source code is kept private. This document describes it without the code.
