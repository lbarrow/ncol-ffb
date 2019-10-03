<template lang="pug">
  .league
    .league__inner
      h2.page-title
        .page-title__sub League
        .page-title__main What Does NCOL Stand For?
      .league-page
        .league-matchups(v-if="week")
            h3.title Week {{ week }} Matchups
            matchup-previews(:matchups="matchups")
        .league-standings
          h3.title Current Standings
          standings-summary(:teams="teams")
</template>

<script>
import axios from 'axios'
import StandingsSummary from '@/components/StandingsSummary.vue'
import MatchupPreviews from '@/components/MatchupPreviews.vue'

export default {
  name: 'League',
  components: {
    StandingsSummary,
    MatchupPreviews
  },
  data() {
    return {
      teams: [],
      matchups: [],
      week: undefined
    }
  },
  async mounted() {
    const {
      data: { teams, week, matchups }
    } = await axios.get('http://localhost:4444/')
    this.teams = teams
    this.week = week
    this.matchups = matchups
  }
}
</script>

<style lang="scss">
.league-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 4rem;
}

.matchup-preview {
}
.matchup-preview__link {
  background-color: darken($blue_dark, 5);
  border: 1px solid rgba(white, 0.1);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  color: white;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  padding: 2rem 1rem;
  text-decoration: none;
  grid-gap: 2rem;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;
  &:hover {
    background-color: rgba($blue, 0.15);
    border-color: rgba($blue, 0.15);
    box-shadow: 0 8px 12px rgba(black, 0.8);
    transform: translateY(-0.4rem);
  }
}
.matchup-preview__player {
}
.matchup-preview__player--second {
}
.matchup-preview__photo {
  width: 6rem;
  height: 6rem;
  border-radius: 100%;
  margin: 0 auto 1rem;
  background-size: contain;
}
.matchup-preview__name {
}
.matchup-preview__record {
  font-size: 1.3rem;
  margin-left: 0.5rem;
  opacity: 0.7;
  font-family: $font_ideal;
  font-weight: normal;
}
.matchup-preview__points {
  font-size: 2.4rem;
  color: $blue;
}
.matchup-preview__vs {
  font-weight: bold;
  color: white;
  opacity: 0.8;
  align-self: stretch;
  padding: 1rem;
  font-size: 2rem;
  border-left: 1px solid rgba(white, 0.2);
  border-right: 1px solid rgba(white, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 300;
  text-transform: uppercase;
}
</style>
