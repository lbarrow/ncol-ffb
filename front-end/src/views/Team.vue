<template lang="pug">
  .team-page
    .team-page__inner
      h2.page-title
        .page-title__sub Team
        .page-title__main {{ owner.displayName}}
    .team coming soon
      //- div {{ owner.wins }}-{{owner.losses}}
      //- div upcoming schedule
      //- div players
</template>

<script>
import axios from 'axios'

export default {
  name: 'Team',
  data() {
    return {
      owner: {},
      players: []
    }
  },
  async mounted() {
    const API_URL = `/api/team/${this.$route.params.id}`
    const response = await axios.get(API_URL)
    this.owner = response.data.owner
  }
}
</script>

<style lang="scss">
.team {
  background-color: rgba(black, 0.25);
  border-top: 1px solid rgba(white, 0.1);
  font-style: italic;
  font-weight: normal;
  padding: 4rem;
  text-align: center;
  /* display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0 -4rem;
  @media (min-width: 42em) {
    grid-gap: 6rem;
    margin: 0;
  } */
}
.team-team {
  border-top: 1px solid rgba(white, 0.1);
  @media (min-width: 48em) {
    border: 1px solid rgba(white, 0.1);
    border-radius: 0.5rem;
  }
}
.team-team__header {
}
.team-positions {
  background-color: rgba(black, 0.35);
  padding: 2rem 0.8rem;
  @media (min-width: 42em) {
    padding: 0 2rem;
  }
  .team-team:first-child & {
    padding-left: 1.2rem;
    @media (min-width: 42em) {
      padding-left: 2rem;
    }
  }
  .team-team:last-child & {
    padding-right: 1.2rem;
    @media (min-width: 42em) {
      padding-right: 2rem;
    }
  }
}
.team-position {
  padding: 4rem 0 2rem;
  position: relative;

  @media (min-width: 42em) {
    padding: 3rem 0;
  }
}
.team-position__title {
  font-family: $font_ideal;
  font-size: 1rem;
  letter-spacing: 0.3rem;
  position: absolute;
  left: calc(100% - 1rem);
  top: -1.6rem;
  padding-top: 2.8rem;
  opacity: 0.75;
  text-align: center;
  width: 4.2rem;
  @media (min-width: 42em) {
    font-size: 1.2rem;
    border-top: 0.2rem solid rgba($blue, 0.6);
    border-bottom: 0.2rem solid rgba($blue, 0.6);
    left: calc(100% + 3rem);
    top: 1.6rem;
    padding-top: 2.8rem;
    opacity: 0.75;
    text-align: center;
    width: 4.2rem;
    bottom: 1rem;
  }
  &::before,
  &::after {
    background: rgba($blue, 0.4);
    content: '';
    position: absolute;
    height: 0.2rem;
    left: calc(100% - 0.05rem);
    top: 3.2rem;
    width: 100%;
    @media (min-width: 42em) {
      height: 1.8rem;
      left: calc(50% - 0.05rem);
      top: 0;
      width: 0.1rem;
    }
  }
  &::after {
    left: calc(-100% - 0.3rem);
    @media (min-width: 42em) {
      top: 5.4rem;
      left: calc(50% - 0.05rem);
      height: auto;
      bottom: 0;
    }
  }
}
.team-team:last-child {
  .team-position__title {
    display: none;
  }
}
.team-players {
}
.team-players__item {
  margin-bottom: 0.8rem;
  @media (min-width: 48em) {
    margin-bottom: 0.8rem;
  }
  &:last-child {
    margin-bottom: 0;
  }
}
</style>
