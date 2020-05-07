import filesize from "rollup-plugin-filesize";
import { terser } from "rollup-plugin-terser";

export default {
  // A bundle just for testing compressed and minified file size. We don't
  // actually distribute this minified file.
  input: "interface.js",
  output: null,
  plugins: [
    terser({
      warnings: true,
    }),
    filesize({
      showBrotliSize: true,
    }),
  ],
};
