# Dress rail

The interactive rail from the top of [servearchive.com](https://www.servearchive.com/), with the 18 dresses it shows.

## Run it

From the repository root:

```sh
python3 -m http.server 8880 --directory rail
```

Then open http://127.0.0.1:8880/. It needs a local server, because browsers block these files when they are opened directly.

## Files

- `dress-rail/rail.js`: the scene, rail, hangers, background cut-out, dragging, selection and spring motion.
- `dress-rail/fabric.js`: the curved garment surfaces and the shader that makes the hem lag and ripple.
- `dress-rail/reveal.js`: the fade-in as each dress finishes loading.
- `dress-rail/priority-loader.js`: loads the selected dress first, then its neighbours.
- `dress-rail/looks.json`: the 18 dresses and their front and back images.
- `index.html` and `demo.css`: a minimal page around the rail. The rail styles are copied from the site.

How it works is explained in [how-it-works.md](../process/how-it-works.md).

## Rights

This code is shared to read and run, not licensed for reuse. Three.js is included under its MIT licence (`dress-rail/vendor/LICENSE-three.txt`), and the Playfair Display font under the SIL Open Font License (`assets/fonts/`).
