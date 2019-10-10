<template lang="pug">
  .league
    .league__inner
      h2.page-title
        .page-title__sub Home
        .page-title__main League
      .league-page
        .league-matchups(v-if="week")
            h3.title Week {{ week }} Matchups
            matchup-previews(:matchups="matchups")
            .league-matchups__more
              router-link(to="/matchups") Previous Weeks
        .league-standings(v-if="teams")
          h3.title Current Standings
          standings-summary(:teams="teams")
          .league-standings__more
            router-link(to="/standings") Full Standings
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
  @media (min-width: 48em) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 4rem;
  }
}
.league-matchups {
  margin-bottom: 8rem;
  @media (min-width: 48em) {
    margin-bottom: 0;
  }
}
.league-matchups__more,
.league-standings__more {
  border-top: 1px solid rgba(white, 0.1);
  margin-top: 2rem;
  padding-top: 2.5rem;
  text-align: center;
  a {
    display: inline-block;
    border: 2px solid $green;
    font-size: 1.1rem;
    padding: 0.8rem 1.6rem;
    border-radius: 0.5rem;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
    transition: all 0.2s ease;
    &:hover {
      background-color: $green;
      color: $blue_dark;
    }
  }
}
</style>
