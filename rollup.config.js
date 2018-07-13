const config = {
  input: 'src/custom-elements.js',
  output: { exports: 'named', file: 'custom-elements.min.js', format: 'iife', name: 'CustomElements', sourcemap: true }
};

export default config;
