<template lang="pug">
  ul.matchup-previews
    li.matchup-preview(v-for="matchup in matchups")
      router-link.matchup-preview__link(:to="'/matchup/' + matchup._id")
        .matchup-preview__player.matchup-preview__player--first
          .matchup-preview__photo(:class="'owner-photo--' + matchup.home")
          .matchup-preview__name {{ matchup.homeOwner.displayName }}
            .matchup-preview__record {{ matchup.homeOwner.wins }}-{{ matchup.homeOwner.losses }}
          .matchup-preview__points(v-html="teamFantasyPoints(matchup.homeScore)")
        .matchup-preview__vs vs
        .matchup-preview__player.matchup-preview__player--second
          .matchup-preview__photo(:class="'owner-photo--' + matchup.away")
          .matchup-preview__name {{ matchup.awayOwner.displayName }}
            .matchup-preview__record {{ matchup.awayOwner.wins }}-{{ matchup.awayOwner.losses }}
          .matchup-preview__points(v-html="teamFantasyPoints(matchup.awayScore)")
</template>

<script>
import scoreFormatter from '@/utility/scoreFormatter'
export default {
  name: 'MatchupPreviews',
  props: {
    matchups: Array
  },
  methods: {
    teamFantasyPoints(points) {
      return scoreFormatter(points)
    }
  }
}
</script>

<style lang="scss">
.standings-mini {
  list-style: none;
  margin: 0;
  padding: 0;
}
.standings-mini__item {
  border: 1px solid rgba(white, 0.1);
  background-color: darken($blue_dark, 5);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  display: grid;
  grid-template-columns: 6rem 1fr auto auto;
  padding: 1rem;
  grid-gap: 2rem;
  align-items: center;
}
.standings-mini__photo {
  width: 6rem;
  height: 6rem;
  border-radius: 100%;
  background-size: contain;
}
.standings-mini__name {
  font-size: 1.8rem;
  font-weight: bold;
}
.standings-mini__record {
  color: $blue;
  font-size: 2rem;
}
.standings-mini__streak {
  opacity: 0.7;
  font-size: 1.5rem;
  padding-right: 1rem;
}
</style>
