<template lang="pug">
  #app.app
    .header
      h1
        router-link(to="/") #[strong NCOL] FFB 2019
      .nav
        router-link(to="/") League
        router-link(to="/standings") Standings
        router-link(to="/matchups") Matchups
    main.main
      router-view
</template>

<style lang="scss">
*,
*::before,
*::after {
  box-sizing: border-box;
}
body,
h1,
h2,
h3,
h4,
p,
ul,
ol,
li,
figure,
figcaption,
blockquote,
dl,
dd {
  margin: 0;
  padding: 0;
}
body {
  min-height: 100vh;
  scroll-behavior: smooth;
  text-rendering: optimizeSpeed;
  line-height: 1.5;
}
ul[class],
ol[class] {
  list-style: none;
}
a:not([class]) {
  text-decoration-skip-ink: auto;
}
img {
  max-width: 100%;
  display: block;
}
html {
  background: $blue_dark url(/graphics/bg.jpg);
  background-size: contain;
  background-repeat: no-repeat;
  background-position-y: 4rem;
  color: white;
  font: 62.5%/1.5 $font_ringside;
  font-weight: 400;
  font-variant-numeric: lining-nums;
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  -webkit-font-feature-settings: 'lnum';
  font-feature-settings: 'lnum';
}
img {
  max-width: 100%;
}
a {
  font-weight: bold;
  color: $green;
}
ul,
ol {
  list-style: none;
}

.header {
  background: $green;
  @media (min-width: 23.25em) {
    display: grid;
    align-items: center;
    grid-template-columns: 1fr 1fr;
  }
  h1 {
    font-size: 1.5rem;
    letter-spacing: 0.2rem;
    margin: 0;
    @media (min-width: 23.25em) {
      line-height: 1;
    }
    strong {
      @media (min-width: 23.25em) {
        display: block;
      }
      @media (min-width: 48em) {
        display: inline;
      }
    }
    a {
      color: #0f232a;
      display: block;
      font-weight: 400;
      padding: 2rem 2rem 1rem;
      text-decoration: none;
      text-align: center;
      @media (min-width: 23.25em) {
        padding: 1.5rem 2rem;
        text-align: left;
      }
      @media (min-width: 48em) {
        padding: 2rem;
      }
    }
  }
}
.nav {
  font-size: 1.5rem;
  display: flex;
  align-self: stretch;
  margin-left: auto;
  justify-content: center;
  padding-right: 1rem;
  @media (min-width: 25.875em) {
    font-size: 1.75rem;
    justify-content: flex-end;
  }
  a {
    color: #0f232a;
    font-weight: normal;
    display: flex;
    align-items: center;
    padding: 1rem 1rem 2rem;
    position: relative;
    text-decoration: none;
    @media (min-width: 23.25em) {
      padding: 1rem;
    }
    @media (min-width: 48em) {
      padding: 2rem 1.5rem;
    }
    &.router-link-exact-active {
      &::before {
        content: '';
        height: 1rem;
        position: absolute;
        background-color: rgba(#0f232a, 0.5);
        width: 100%;
        left: 0;
        bottom: 0;
      }
    }
  }
}

.main {
  font-size: 1.5rem;
  margin: 0 auto;
  max-width: 96rem;
  width: 100%;
  padding: 4rem;
  @media (min-width: 60em) {
    padding: 6rem;
  }
}

.page-title {
  font-size: 4.2rem;
  line-height: 1.25;
  margin: 0 0 2.5rem;
}
.page-title__main {
  color: $green;
  font-weight: normal;
}
.page-title__sub {
  font-size: 1.25rem;
  font-weight: 400;
  letter-spacing: 0.2rem;
  text-transform: uppercase;
}

.title {
  font-size: 2.1rem;
  font-weight: 300;
  letter-spacing: 0.2rem;
  margin: 2rem 0 1rem;
  text-transform: uppercase;
}

.owner-photo--justin_g {
  background-image: url('/graphics/avatar_justin_g.jpg');
}
.owner-photo--justin_m {
  background-image: url('/graphics/avatar_justin_m.jpg');
}
.owner-photo--bern_f {
  background-image: url('/graphics/avatar_bern_f.jpg');
}
.owner-photo--nathan_s {
  background-image: url('/graphics/avatar_nathan_s.jpg');
}
.owner-photo--luke_b {
  background-image: url('/graphics/avatar_luke_b.jpg');
}
.owner-photo--josh_b {
  background-image: url('/graphics/avatar_josh_b.jpg');
}

.score-num-fractional {
  font-size: 0.6em;
  font-weight: 300;
  position: relative;
  opacity: 0.35;
  margin-left: 0.05em;
  letter-spacing: 0.025em;
  top: -0.5em;
}
</style>
