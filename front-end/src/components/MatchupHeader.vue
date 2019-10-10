<template lang="pug">
  .matchup-header
    .matchup-header__img(:class="'owner-photo--' + owner.ownerId")
    .matchup-header__title {{ owner.displayName }}
    .matchup-header__total-points(v-html="teamFantasyPoints")
    .matchup-header__status
      template(v-if="playersPlaying == 0 && playersLeft == 0")
        .matchup-header__status-done all players done
      template(v-else)
        .matchup-header__status-in #[strong {{ playersPlaying }}] playing
        .matchup-header__status-to #[strong {{ playersLeft }}] to play
</template>

<script>
import scoreFormatter from '@/utility/scoreFormatter'
export default {
  name: 'MatchupHeader',
  props: {
    owner: Object,
    total: Number,
    playersLeft: Number,
    playersPlaying: Number
  },
  computed: {
    teamFantasyPoints() {
      return scoreFormatter(this.total)
    }
  }
}
</script>

<style lang="scss">
.matchup-header {
  background-color: rgba(darken($blue_dark, 5), 0.8);
  border-bottom: 1px solid rgba(white, 0.15);
  /* background-color: darken($blue_dark, 5); */
  padding: 1rem;
  text-align: center;
  @media (min-width: 25.875em) {
    padding: 2rem;
  }
  @media (min-width: 48em) {
    border-radius: 0.5rem 0.5rem 0 0;
  }
}
.matchup-header__img {
  border-radius: 100%;
  height: 6rem;
  margin: -2.5rem auto 1rem;
  width: 6rem;
  background-size: contain;
  @media (min-width: 48em) {
    height: 12rem;
    width: 12rem;
  }
}
.matchup-header__title {
  font-size: 1.6rem;
  line-height: 1.1;
  margin-bottom: 1rem;
  @media (min-width: 48em) {
    font-size: 1.8rem;
  }
}
.matchup-header__total-points {
  color: $blue;
  font-size: 2.8rem;
  line-height: 1;
  margin-bottom: 0.5rem;
  @media (min-width: 48em) {
    font-size: 3.5rem;
  }
}
.matchup-header__status {
  display: flex;
  text-transform: uppercase;
  letter-spacing: 0.2rem;
  font-weight: 300;
  justify-content: center;
  font-size: 1.3rem;
  strong {
    font-weight: 800;
  }
}
.matchup-header__status-in {
  margin-right: 1rem;
}
.matchup-header__status-to {
}
.matchup-header__status-done {
  opacity: 0.5;
}
</style>
