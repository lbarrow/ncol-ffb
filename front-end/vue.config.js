module.exports = {
  css: {
    loaderOptions: {
      scss: {
        data: `@import "~@/scss/_variables.scss";`
      }
    }
  },
  devServer: {
    public: 'localhost',
    port: '8081',
    proxy: 'http://localhost:4445'
  },
  outputDir: '../public/'
}
