<template lang="pug">
  .matchup-header
    .matchup-header__img(:class="'owner-photo--' + owner.ownerId")
    .matchup-header__title {{ owner.displayName }}
    .matchup-header__total-points(v-html="teamFantasyPoints")
    .matchup-header__status
      .matchup-header__status-in #[strong !!!] in play
      .matchup-header__status-to #[strong !!!] to play
</template>

<script>
import scoreFormatter from '@/utility/scoreFormatter'
export default {
  name: 'MatchupHeader',
  props: {
    owner: Object,
    total: Number
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
  background-color: rgba(black, 0.3);
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
}
.matchup-header__img {
  border-radius: 100%;
  height: 12rem;
  margin: -2.5rem auto 1rem;
  width: 12rem;
  background-size: contain;
}
.matchup-header__title {
  font-size: 1.8rem;
  margin-bottom: 1rem;
}
.matchup-header__total-points {
  color: $blue;
  font-size: 3.5rem;
  line-height: 1;
  margin-bottom: 0.5rem;
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
</style>
